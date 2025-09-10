// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import { PDFDocument, PDFName } from 'pdf-lib'; // Sử dụng thư viện pdf-lib
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


// ===== CÁC HÀM PHỤ TRỢ CŨ VẪN GIỮ LẠI =====

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


// ===== CÁC HÀM MỚI SỬ DỤNG PDF-LIB =====

/**
 * Phân tích chuỗi ngày tháng từ chữ ký PDF (định dạng D:YYYYMMDDHHmmss...) thành đối tượng Date.
 */
function parsePdfDate(raw: string): Date | null {
    if (!raw || !raw.startsWith('D:')) return null;
    try {
        const dateString = raw.substring(2);
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1; // Tháng trong JS bắt đầu từ 0
        const day = parseInt(dateString.substring(6, 8), 10);
        const hour = parseInt(dateString.substring(8, 10), 10);
        const minute = parseInt(dateString.substring(10, 12), 10);
        const second = parseInt(dateString.substring(12, 14), 10);
        
        // Tạo ngày UTC và giả định múi giờ Việt Nam (+07:00) nếu không có thông tin timezone
        let date = new Date(Date.UTC(year, month, day, hour, minute, second));
        
        // Xử lý Timezone offset (ví dụ Z, +07'00')
        const offsetMatch = dateString.substring(14).match(/([+-])(\d{2})'(\d{2})/);
        if (offsetMatch) {
            const sign = offsetMatch[1] === '-' ? -1 : 1;
            const hOffset = parseInt(offsetMatch[2], 10);
            const mOffset = parseInt(offsetMatch[3], 10);
            const totalOffsetMinutes = (hOffset * 60 + mOffset) * sign;
            date = new Date(date.getTime() - totalOffsetMinutes * 60000); // Điều chỉnh về UTC
        } else if (dateString.endsWith('Z')) {
            // Đã là giờ UTC
        } else {
             // Mặc định cho múi giờ Việt Nam nếu không có thông tin
             date = new Date(date.getTime() - 7 * 60 * 60 * 1000);
        }
        return date;
    } catch (e) {
        logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}

/**
 * Trích xuất thông tin chữ ký từ file PDF sử dụng pdf-lib.
 */
async function extractSignatureInfo(pdfBuffer: Buffer): Promise<{ name: string | null; signDate: Date | null }[]> {
    const signatures: { name: string | null; signDate: Date | null }[] = [];
    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
        const acroForm = pdfDoc.getForm();
        const fields = acroForm.getFields();

        for (const field of fields) {
            const fieldType = field.acroField.FT()?.toString();
            if (fieldType === '/Sig') {
                const sigDict = field.acroField.V();
                if (sigDict) {
                    const nameRaw = sigDict.get(PDFName.of('Name'))?.toString();
                    const signDateRaw = sigDict.get(PDFName.of('M'))?.toString();
                    
                    const name = nameRaw ? nameRaw.substring(1, nameRaw.length - 1) : null;
                    const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;

                    if (signDate) { // Chỉ thêm vào nếu có ngày ký
                         signatures.push({ name, signDate });
                    }
                }
            }
        }
    } catch (error) {
        logger.error("Error extracting signature with pdf-lib:", error);
    }
    return signatures;
}


// ===== CLOUD FUNCTION CHÍNH ĐÃ ĐƯỢC NÂNG CẤP HOÀN TOÀN =====

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
        logger.log(`File ${filePath} does not match Criterion 1 structure. Skipping.`);
        return null;
    }
    
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    // Helper to update the main assessment document
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
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");
        const documentConfig = criterionDoc.data()?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Document config for index ${docIndex} not found.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        // --- LOGIC MỚI SỬ DỤNG PDF-LIB ---
        const signatures = await extractSignatureInfo(fileBuffer);
        
        if (signatures.length === 0) {
            throw new Error("Không tìm thấy thông tin chữ ký hợp lệ trong tài liệu.");
        }

        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;

        if (!signingTime) {
            throw new Error("Chữ ký không chứa thông tin ngày ký hợp lệ.");
        }
        
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";
        
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);
        logger.info(`[pdf-lib SUCCESS] Processed ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`[pdf-lib ERROR] Error processing ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
        return null;
    }
    return null;
});