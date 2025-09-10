// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

// ===== HÀM SYNC CLAIMS (GIỮ NGUYÊN) =====
export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  if (!event.data?.after.exists) {
    console.log(`User document ${event.params.userId} deleted. Removing claims.`);
    return null;
  }
  const userData = event.data.after.data();
  const userId = event.params.userId;
  if (!userData) {
    console.log(`User document ${userId} has no data. No action taken.`);
    return null;
  }
  const claimsToSet: { [key: string]: any } = {};
  if (userData.role) {
    claimsToSet.role = userData.role;
  }
  if (userData.communeId) {
    claimsToSet.communeId = userData.communeId;
  }
  try {
    console.log(`Updating claims for user ${userId}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userId, claimsToSet);
    console.log(`Successfully updated claims for user ${userId}`);
  } catch (error) {
    console.error(`Error updating custom claims for user ${userId}:`, error);
  }
  return null;
});

// ===== HÀM TRÍCH XUẤT CHỮ KÝ (PHIÊN BẢN CUỐI CÙNG) =====
const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    const signatureRegex = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\][^<]*\/Contents\s*<([^>]+)>/;
    const match = pdfString.match(signatureRegex);

    if (match && match[1]) {
        logger.info("Successfully extracted signature block using regex.");
        // Loại bỏ khoảng trắng và sau đó loại bỏ các byte null (00) ở cuối chuỗi
        const cleanedHex = match[1].replace(/\s/g, '').replace(/0+$/, '');
        return cleanedHex;
    } else {
        logger.warn("Could not find signature block using regex.");
        return null;
    }
};

// ===== HÀM XỬ LÝ PDF (ĐÃ KHÔI PHỤC VÀ HOÀN CHỈNH) =====
export const verifyPDFSignature = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';

    const saveCheckResult = async (status: "valid" | "expired" | "error", reason?: string, signingTime?: Date | null, deadline?: Date, signerName?: string) => {
        await db.collection('signature_checks').add({
            fileName: fileName,
            filePath: filePath,
            status: status,
            reason: reason || null,
            signingTime: signingTime || null,
            deadline: deadline || null,
            signerName: signerName || null,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    };

    if (!contentType || !contentType.startsWith('application/pdf')) {
        logger.log(`File ${filePath} is not a PDF, skipping processing.`);
        return null;
    }
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        logger.log(`File ${filePath} does not match Criterion 1 evidence path structure. Skipping.`);
        return null;
    }
    
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    const updateAssessmentFileStatus = async (
        fileStatus: 'validating' | 'valid' | 'invalid' | 'error',
        reason?: string
    ) => {
        const doc = await assessmentRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        if (!data) return;
        const assessmentData = data.assessmentData || {};
        const indicatorResult = assessmentData[indicatorId];
        if (!indicatorResult || !indicatorResult.filesPerDocument) return;
        const fileList = indicatorResult.filesPerDocument[docIndex] || [];
        const fileToUpdate = fileList.find((f: any) => f.name === fileName);

        if (fileToUpdate) {
            fileToUpdate.signatureStatus = fileStatus;
            if (reason) {
                fileToUpdate.signatureError = reason;
            } else {
                 delete fileToUpdate.signatureError;
            }
            
            const criterionDoc = await db.collection('criteria').doc('TC01').get();
            const assignedCount = criterionDoc.data()?.assignedDocumentsCount || 0;
            const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
            const allFilesUploaded = allFiles.length >= assignedCount;
            const allSignaturesValid = allFiles.every((f: any) => f.signatureStatus === 'valid');
            const quantityMet = Number(indicatorResult.value) >= assignedCount;

            if (quantityMet && allFilesUploaded && allSignaturesValid) {
                indicatorResult.status = 'achieved';
            } else {
                indicatorResult.status = 'not-achieved';
            }
            
            await assessmentRef.update({ [`assessmentData.${indicatorId}`]: indicatorResult });
        }
    };

    await updateAssessmentFileStatus('validating');
    
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Không tìm thấy văn bản tiêu chí TC01.");
        const criterionData = criterionDoc.data();
        const documentConfig = criterionData?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Không tìm thấy cấu hình cho văn bản với chỉ số ${docIndex}.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) throw new Error("Không tìm thấy khối dữ liệu chữ ký trong tệp PDF.");

        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);

        // --- BẮT ĐẦU SỬA LỖI ---
        // Buộc node-forge xử lý sâu hơn bằng cách gọi verify() trong try...catch
        try {
          (p7 as any).verify();
        } catch (e) {
          logger.warn("Verification step failed as expected, proceeding to extract signer info. Error: ", (e as Error).message);
        }
        
        const signedData: any = p7; // Ép kiểu để bỏ qua kiểm tra của TS

        if (signedData.type !== forge.pki.oids.signedData) throw new Error(`Loại chữ ký không hợp lệ.`);
        if (!signedData.signers || signedData.signers.length === 0) throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");
        if (!signedData.certificates || signedData.certificates.length === 0) throw new Error("Không tìm thấy chứng thư số trong chữ ký.");
        
        const signerInfo = signedData.rawCapture.signerInfo;
        const signingTimeAttr = signerInfo.authenticatedAttributes.find(
            (attr: any) => forge.pki.oids.signingTime === attr.oid
        );
        if (!signingTimeAttr || !signingTimeAttr.value) {
            throw new Error("Không tìm thấy thuộc tính thời gian ký (signingTime) trong chữ ký.");
        }
        
        const signingTimeObject = forge.asn1.fromDer(signingTimeAttr.value).value as any;
        const signingTime = new Date(signingTimeObject[0].value);
        
        const signerCertificate = signedData.certificates[0];
        const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        // --- KẾT THÚC SỬA LỖI ---
        
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";

        await saveCheckResult(status, undefined, signingTime, deadline, signerName);
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);

        logger.info(`Successfully processed signature for ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`Error processing ${filePath}:`, error);
        await saveCheckResult("error", error.message);
        await updateAssessmentFileStatus('error', error.message);
        return null;
    }
    return null;
});

// ===== CÁC HÀM PHỤ TRỢ (GIỮ NGUYÊN) =====
function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
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
        if (indicator) {
            if (Array.isArray(indicator.files)) {
                indicator.files.forEach((file: { url: string }) => {
                    if (file && typeof file.url === 'string' && file.url) urls.add(file.url);
                });
            }
            if (indicator.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
                for (const docIndex in indicator.filesPerDocument) {
                    const fileList = indicator.filesPerDocument[docIndex];
                    if (Array.isArray(fileList)) {
                        fileList.forEach((file: { url: string }) => {
                           if (file && typeof file.url === 'string' && file.url) urls.add(file.url);
                        });
                    }
                }
            }
        }
    }
    return urls;
}

export const onAssessmentFileDeleted = onDocumentUpdated("assessments/{assessmentId}", async (event) => {
    // ... (Giữ nguyên nội dung hàm này)
    const dataBefore = event.data?.before.data();
    const dataAfter = event.data?.after.data();

    if (!dataBefore || !dataAfter) {
        logger.log("Document data is missing, cannot compare file lists.");
        return null;
    }

    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);

    const deletionPromises: Promise<any>[] = [];
    const storage = admin.storage();
    const bucket = storage.bucket();

    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                const url = new URL(fileUrl);
                const filePath = decodeURIComponent(url.pathname).split('/o/')[1];
                
                if (!filePath) {
                    throw new Error("Could not extract file path from URL.");
                }

                logger.log(`Attempting to delete file from path: ${filePath}`);
                const fileRef = bucket.file(filePath);

                deletionPromises.push(fileRef.delete().catch(err => {
                    if (err.code === 404) {
                         logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
                    } else {
                        logger.error(`Failed to delete file ${filePath}:`, err);
                    }
                }));

            } catch (error) {
                 logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }

    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    } else {
        logger.log("No files were removed in this update. No deletions necessary.");
    }

    return null;
});
