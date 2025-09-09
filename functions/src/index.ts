// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  // Trường hợp document bị xóa, không làm gì cả
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

const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    const byteRangePos = pdfString.lastIndexOf('/ByteRange');
    if (byteRangePos === -1) {
        logger.warn("Could not find /ByteRange in the PDF.");
        return null;
    }
    const byteRangeEnd = pdfString.indexOf(']', byteRangePos);
    if (byteRangeEnd === -1) {
        logger.warn("Could not find the end of /ByteRange array.");
        return null;
    }
    const byteRangeValue = pdfString.substring(byteRangePos, byteRangeEnd);
    const match = byteRangeValue.match(/\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!match) {
        logger.warn("Could not parse /ByteRange values.");
        return null;
    }
    const contentsPos = pdfString.lastIndexOf('/Contents');
    const contentsStart = pdfString.indexOf('<', contentsPos);
    const contentsEnd = pdfString.indexOf('>', contentsStart);
    if (contentsStart === -1 || contentsEnd === -1) {
        logger.warn("Could not find signature /Contents block.");
        return null;
    }
    const signatureHex = pdfString.substring(contentsStart + 1, contentsEnd);
    return signatureHex.replace(/\r\n|\n|\r/g, '');
};

export const processSignedPDF = onObjectFinalized(async (event) => {
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
    if (!pathInfo || !pathInfo.indicatorId.startsWith('TC01')) {
        logger.log(`File ${filePath} does not match Criterion 1 evidence path structure. Skipping.`);
        return null;
    }
    
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    logger.info(`Processing signature for PDF: ${filePath}`, { pathInfo });
    
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    const updateAssessmentFileStatus = async (fileStatus: 'validating' | 'valid' | 'invalid' | 'error', reason?: string) => {
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
            const allFilesValid = Object.values(indicatorResult.filesPerDocument).flat().every((f: any) => f.signatureStatus === 'valid');
            const isAchieved = Number(indicatorResult.value) >= assignedCount && allFilesValid;
            
            indicatorResult.status = isAchieved ? 'achieved' : 'not-achieved';
            
            await assessmentRef.update({ [`assessmentData.${indicatorId}`]: indicatorResult });
        }
    };

    await updateAssessmentFileStatus('validating');
    
    // === BẮT ĐẦU KHỐI CODE CẦN THAY THẾ ===
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");

        const criterionData = criterionDoc.data();
        const documentConfig = criterionData?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Document configuration for index ${docIndex} not found in TC01.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) throw new Error("Không tìm thấy chữ ký số trong tệp PDF.");

        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);

        // --- PHẦN SỬA LỖI QUAN TRỌNG ---

        // BƯỚC 1: Kiểm tra để chắc chắn đây là dữ liệu có chữ ký (SignedData)
        if (p7.type !== forge.pki.oids.signedData) {
            throw new Error(`Loại chữ ký không hợp lệ. Yêu cầu "SignedData", nhận được "${p7.type}".`);
        }
        if (!p7.signers || p7.signers.length === 0) {
            throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");
        }
        if (!p7.certificates || p7.certificates.length === 0) {
            throw new Error("Không tìm thấy chứng thư số trong chữ ký.");
        }

        // BƯỚC 2: Lấy thông tin người ký và thời gian ký một cách an toàn và trực tiếp
        const signer = p7.signers[0];
        const signerCertificate = p7.certificates[0]; // Giờ đã an toàn để truy cập
        
        // Cách lấy thời gian ký đơn giản và chính xác hơn nhiều
        const signingTime = signer.signingTime; 
        
        if (!signingTime) {
            throw new Error("Không tìm thấy thuộc tính thời gian ký (signingTime) trong chữ ký.");
        }

        const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        
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
    // === KẾT THÚC KHỐI CODE CẦN THAY THẾ ===

    return null;
});

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

/**
 * Helper function to recursively collect all file URLs from an assessmentData object.
 * @param assessmentData - The assessmentData object from Firestore.
 * @returns A Set containing all unique file URLs.
 */
function collectAllFileUrls(assessmentData: any): Set<string> {
    const urls = new Set<string>();

    if (!assessmentData || typeof assessmentData !== 'object') {
        return urls;
    }

    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if (indicator) {
            // Collect from the top-level 'files' array
            if (Array.isArray(indicator.files)) {
                indicator.files.forEach((file: { url: string }) => {
                    if (file && typeof file.url === 'string' && file.url) {
                        urls.add(file.url);
                    }
                });
            }
            // Collect from the nested 'filesPerDocument' object
            if (indicator.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
                for (const docIndex in indicator.filesPerDocument) {
                    const fileList = indicator.filesPerDocument[docIndex];
                    if (Array.isArray(fileList)) {
                        fileList.forEach((file: { url: string }) => {
                           if (file && typeof file.url === 'string' && file.url) {
                                urls.add(file.url);
                            }
                        });
                    }
                }
            }
        }
    }
    return urls;
}


/**
 * Triggered when an assessment document is updated.
 * Compares file lists before and after the update to find deleted files
 * and removes them from Firebase Storage.
 */
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
    const storage = admin.storage();
    const bucket = storage.bucket();

    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                // Correctly parse the file path from the GCS URL
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
