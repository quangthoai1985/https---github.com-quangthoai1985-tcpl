// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse, addBusinessDays } from "date-fns";

admin.initializeApp();
const db = admin.firestore();

// =================================================================================================
// HELPER FUNCTIONS (HÀM PHỤ TRỢ)
// =================================================================================================

function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
    // Path structure: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{docIndex}/{fileName}
    const parts = filePath.split('/');
    if (parts.length === 7 && parts[0] === 'hoso' && parts[2] === 'evidence') {
         const docIndex = parseInt(parts[5], 10);
         if (!isNaN(docIndex)) {
            return {
                communeId: parts[1], 
                periodId: parts[3],
                indicatorId: parts[4],
                docIndex: docIndex
            };
        }
    }
    return null;
}

function collectAllFileUrls(assessmentData: any): Set<string> {
    const urls = new Set<string>();
    if (!assessmentData || typeof assessmentData !== 'object') return urls;
    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if (indicator?.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
            for (const docIndex in indicator.filesPerDocument) {
                const fileList = indicator.filesPerDocument[docIndex];
                if (Array.isArray(fileList)) {
                    fileList.forEach((file: { url: string }) => {
                        if (file?.url) urls.add(file.url);
                    });
                }
            }
        }
    }
    return urls;
}

const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    const signatureRegex = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\][^<]*\/Contents\s*<([^>]+)>/;
    const match = pdfString.match(signatureRegex);
    if (match && match[1]) {
        logger.info("Successfully extracted signature using regex.");
        return match[1].replace(/\s/g, '');
    }
    logger.warn("Could not find signature block using regex.");
    return null;
};


// =================================================================================================
// CLOUD FUNCTIONS
// =================================================================================================

export const syncUserClaims = onDocumentWritten({ document: "users/{userId}", region: "asia-east1" }, async (event) => {
  if (!event.data?.after.exists) {
    logger.log(`User document ${event.params.userId} deleted. Removing claims.`);
    return null;
  }
  const userData = event.data.after.data();
  const userId = event.params.userId;
  if (!userData) {
    logger.log(`User document ${userId} has no data. No action taken.`);
    return null;
  }
  const claimsToSet: { [key: string]: string | boolean } = {};
  if (userData.role) {
    claimsToSet.role = userData.role;
  }
  if (userData.communeId) {
    claimsToSet.communeId = userData.communeId;
  }
  try {
    logger.log(`Updating claims for user ${userId}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userId, claimsToSet);
    logger.log(`Successfully updated claims for user ${userId}`);
  } catch (error: unknown) {
    logger.error(`Error updating custom claims for user ${userId}:`, error);
  }
  return null;
});


export const onAssessmentFileDeleted = onDocumentUpdated("assessments/{assessmentId}", async (event) => {
    const dataBefore = event.data?.before.data();
    const dataAfter = event.data?.after.data();

    if (!dataBefore || !dataAfter) {
        logger.log("Document data is missing, cannot compare file lists.");
        return null;
    }

    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);

    const deletionPromises: Promise<any>[] = [];
    const bucket = admin.storage().bucket(); // Lấy bucket mặc định

    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            try {
                // **SỬA LỖI**: Phân tích URL để lấy đúng đường dẫn file trong Storage
                const url = new URL(fileUrl);
                const decodedPath = decodeURIComponent(url.pathname);
                const filePathInBucket = decodedPath.substring(decodedPath.indexOf('/o/') + 3);

                if (filePathInBucket) {
                    logger.log(`Attempting to delete file from path: ${filePathInBucket}`);
                    const fileRef = bucket.file(filePathInBucket);
                    deletionPromises.push(fileRef.delete().catch((err: any) => { // Thêm kiểu 'any' cho err
                        if (err.code === 404) {
                             logger.warn(`Attempted to delete ${filePathInBucket}, but it was not found.`);
                        } else {
                            logger.error(`Failed to delete file ${filePathInBucket}:`, err);
                        }
                    }));
                }
            } catch (error) {
                 logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }

    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    }

    return null;
});

export const verifyPDFSignature = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';

    if (!contentType || !contentType.startsWith('application/pdf')) {
        return null;
    }
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        return null;
    }

    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    const updateAssessmentFileStatus = async (
        fileStatus: 'validating' | 'valid' | 'invalid' | 'error',
        reason?: string
    ) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data) return;

                const assessmentData = data.assessmentData || {};
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: 'pending', value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                let fileList = filesPerDocument[docIndex] || [];
                
                let fileToUpdate = fileList.find((f: any) => f.name === fileName);

                if (!fileToUpdate) {
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                
                fileToUpdate.signatureStatus = fileStatus;
                if (reason) fileToUpdate.signatureError = reason; else delete fileToUpdate.signatureError;

                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                
                const criterionDocSnap = await transaction.get(db.collection('criteria').doc('TC01'));
                const criterionData = criterionDocSnap.data();
                const assignedCount = criterionData?.assignedDocumentsCount || 0;
                
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f: any) => f.signatureStatus === 'valid');
                const quantityMet = Number(indicatorResult.value) >= assignedCount;

                if (quantityMet && allFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = 'achieved';
                } else {
                    indicatorResult.status = 'not-achieved';
                }
                
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
        } catch (error) {
            logger.error(`Transaction to update file status for ${fileName} failed:`, error);
        }
    };
    
    await updateAssessmentFileStatus('validating');
    
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");
        const documentConfig = criterionDoc.data()?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Document config for index ${docIndex} not found.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) throw new Error("Không tìm thấy khối dữ liệu chữ ký trong tệp PDF.");
        
        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex), false);
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);
        
        const signerInfo = (p7 as any).rawCapture.signerInfo;
        if (!signerInfo) throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");

        const signingTimeAttr = signerInfo.authenticatedAttributes.find(
            (attr: any) => forge.pki.oids.signingTime === attr.oid
        );
        if (!signingTimeAttr || !signingTimeAttr.value) throw new Error("Không tìm thấy thuộc tính thời gian ký.");
        
        const signingTime = forge.asn1.fromDer(signingTimeAttr.value).value[0].value;
        
        if (!p7.certificates || p7.certificates.length === 0) throw new Error("Không tìm thấy chứng thư nào trong chữ ký.");
        // const signerCertificate = p7.certificates[0];
        // const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        
        const isValid = new Date(signingTime) <= deadline;
        const status = isValid ? "valid" : "invalid";
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;

        await updateAssessmentFileStatus(status, reason);
    } catch (error: any) {
        logger.error(`Error processing signature for ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
    }
    return null;
});

export const verifyCT4Signature = onObjectFinalized({
  bucket: "chuan-tiep-can-pl.firebasestorage.app", region: "asia-east1",
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const fileName = filePath.split("/").pop() || "unknownfile";

  // 1. Chỉ lắng nghe đúng đường dẫn của CT4
  // Định dạng: hoso/{communeId}/evidence/{periodId}/{indicatorId}/CT4_CONTENT_1/{fileName}
  const ct4PathRegex = /^hoso\/([^\/]+)\/evidence\/([^\/]+)\/([^\/]+)\/CT4_CONTENT_1\//;
  const match = filePath.match(ct4PathRegex);

  if (!contentType || !contentType.startsWith("application/pdf") || !match) {
    logger.log(`File ${filePath} is not a CT4 evidence file. Skipping.`);
    return null;
  }

  const [, communeId, periodId, indicatorId] = match;
  const assessmentId = `assess_${periodId}_${communeId}`;
  const assessmentRef = db.collection("assessments").doc(assessmentId);
  logger.info(`Processing CT4 file: ${fileName} for assessment ${assessmentId}`);

  // Hàm helper để cập nhật trạng thái file (Tương tự TC1)
  const updateAssessmentFileStatus = async (
      contentId: string,
      fileStatus: "validating" | "valid" | "invalid" | "error",
      reason?: string,
  ) => {
    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(assessmentRef);
        if (!doc.exists) throw new Error(`Assessment ${assessmentId} not found.`);

        const data = doc.data();
        if (!data) return;

        const assessmentData = data.assessmentData || {};
        const indicatorResult = assessmentData[indicatorId] || { contentResults: {} };
        const contentResults = indicatorResult.contentResults || {};
        const contentData = contentResults[contentId] || { files: [], status: "pending", value: null };
        const fileList: { name: string, url: string, signatureStatus?: string, signatureError?: string }[] = contentData.files || [];

        let fileToUpdate = fileList.find((f) => f.name === fileName);

        if (!fileToUpdate) {
          const newFileUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
          fileToUpdate = { name: fileName, url: newFileUrl };
          fileList.push(fileToUpdate);
          logger.info(`File entry for "${fileName}" not found in Firestore. Creating it.`);
        }

        fileToUpdate.signatureStatus = fileStatus;
        if (reason) fileToUpdate.signatureError = reason;
        else delete fileToUpdate.signatureError;

        contentData.files = fileList;
        // Tự động chấm điểm (logic cơ bản)
        if (fileStatus === 'valid') {
            contentData.status = "achieved";
        } else if (fileStatus === 'invalid' || fileStatus === 'error') {
            contentData.status = "not-achieved";
        }

        contentResults[contentId] = contentData;
        indicatorResult.contentResults = contentResults;

        transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
      });
      logger.info(`Successfully updated CT4 file status for "${fileName}".`);
    } catch (error: unknown) {
      logger.error(`Transaction to update CT4 file status for "${fileName}" failed:`, error);
    }
  };

  let contentId = ""; // Chúng ta cần tìm contentId

  try {
    // 2. Lấy dữ liệu từ Firestore
    const assessmentDoc = await assessmentRef.get();
    if (!assessmentDoc.exists) throw new Error(`Assessment document ${assessmentId} does not exist.`);
    
    const assessmentData = assessmentDoc.data()?.assessmentData || {};
    const indicatorData = assessmentData[indicatorId];
    if (!indicatorData || !indicatorData.contentResults) throw new Error(`Indicator data ${indicatorId} or contentResults not found.`);

    // 3. Tìm Content ID (ví dụ: "CNT033278") và ngày ban hành của tỉnh
    let provincialPlanDateStr: string | null = null;
    
    // Duyệt qua các content results của chỉ tiêu này
    for (const cId in indicatorData.contentResults) {
        const content = indicatorData.contentResults[cId];
        // Tìm content có lưu trữ 'provincialPlanDate'
        if (content.value && typeof content.value === 'object' && content.value.provincialPlanDate) {
            provincialPlanDateStr = content.value.provincialPlanDate;
            contentId = cId;
            break;
        }
    }

    if (!contentId || !provincialPlanDateStr) {
      throw new Error(`Could not find contentId or provincialPlanDate for indicator ${indicatorId}.`);
    }
    
    // Đánh dấu file là "đang kiểm tra"
    await updateAssessmentFileStatus(contentId, "validating");

    // 4. Phân tích ngày và tính hạn chót 7 ngày làm việc
    const issueDate = parse(provincialPlanDateStr, "dd/MM/yyyy", new Date());
    if (isNaN(issueDate.getTime())) {
        throw new Error(`Invalid provincial plan date format: ${provincialPlanDateStr}. Use DD/MM/YYYY.`);
    }
    
    // Tính hạn chót = Ngày ban hành + 7 NGÀY LÀM VIỆC
    // (addBusinessDays đã loại trừ T7, CN)
    const deadline = addBusinessDays(issueDate, 7);

    // 5. Kiểm tra chữ ký (Giống hệt TC1)
    const bucket = admin.storage().bucket(fileBucket);
    const [fileBuffer] = await bucket.file(filePath).download();
    const signatures = await extractSignatureInfo(fileBuffer);
    if (signatures.length === 0) throw new Error("Không tìm thấy chữ ký nào trong tài liệu.");

    const firstSignature = signatures[0];
    const signingTime = firstSignature.signDate;
    if (!signingTime) throw new Error("Chữ ký không chứa thông tin ngày ký (M).");

    // 6. So sánh
    const isValid = signingTime <= deadline;

    await updateAssessmentFileStatus(
      contentId,
      isValid ? "valid" : "invalid",
      isValid ? undefined : `Ký sau thời hạn 7 ngày làm việc (Hạn chót: ${deadline.toLocaleDateString("vi-VN")})`
    );

  } catch (error: unknown) {
    logger.error(`[CT4 Signature] Error processing ${filePath}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    const userFriendlyMessage = translateErrorMessage(message);
    
    if (contentId) {
        await updateAssessmentFileStatus(contentId, "error", userFriendlyMessage);
    }
    return null;
  }
  return null;
});

// Giả định hàm này đã tồn tại ở đâu đó trong file của bạn
// Nếu chưa, bạn cần thêm nó vào.
async function extractSignatureInfo(pdfBuffer: Buffer): Promise<{ name: string | null; signDate: Date | null }[]> {
  // ... logic của hàm extractSignatureInfo với pdf-lib
  return []; // Placeholder
}

function translateErrorMessage(englishError: string): string {
  // ... logic của hàm translateErrorMessage
  return englishError; // Placeholder
}
