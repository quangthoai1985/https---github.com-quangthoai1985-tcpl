// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib'; // <-- Thư viện mới
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

// ===== HÀM MỚI ĐỂ XỬ LÝ CHỮ KÝ BẰNG PDF-LIB =====

/**
 * Phân tích chuỗi ngày tháng từ chữ ký PDF (định dạng D:YYYYMMDDHHmmssZ) thành đối tượng Date.
 */
function parsePdfDate(raw: string): Date | null {
    if (!raw) return null;
    try {
        const clean = raw.replace("D:", "").slice(0, 14); // Lấy phần YYYYMMDDHHmmss
        const year = parseInt(clean.slice(0, 4), 10);
        const month = parseInt(clean.slice(4, 6), 10) - 1; // Tháng trong JS bắt đầu từ 0
        const day = parseInt(clean.slice(6, 8), 10);
        const hour = parseInt(clean.slice(8, 10), 10);
        const minute = parseInt(clean.slice(10, 12), 10);
        const second = parseInt(clean.slice(12, 14), 10);
        
        // Giả định múi giờ Việt Nam (+07:00)
        // Tạo một đối tượng Date ở múi giờ UTC, sau đó trừ đi 7 tiếng để có được thời gian đúng
        const dateInUTC = new Date(Date.UTC(year, month, day, hour, minute, second));
        dateInUTC.setHours(dateInUTC.getHours() - 7);
        return dateInUTC;

    } catch (e) {
        logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}

/**
 * Trích xuất tên người ký và ngày ký từ file PDF sử dụng pdf-lib.
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

                // === PHẦN SỬA LỖI QUAN TRỌNG ===
                // Chỉ xử lý nếu sigDict là một đối tượng Dictionary
                if (sigDict instanceof PDFDict) {
                    const nameRaw = sigDict.get(PDFName.of('Name'))?.toString();
                    const signDateRaw = sigDict.get(PDFName.of('M'))?.toString();
                    
                    // Bỏ ký tự '/' ở đầu đối với tên
                    const name = nameRaw ? nameRaw.substring(1) : null;
                    // Bỏ cặp dấu () ở đầu và cuối chuỗi ngày tháng
                    const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;

                    if (signDate) {
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

// HÀM MỚI: Dịch các thông báo lỗi phổ biến sang tiếng Việt
function translateErrorMessage(englishError: string): string {
    logger.info("Original error message:", englishError); // Giúp debug về sau

    if (englishError.includes("cannot be parsed") || englishError.includes("Invalid PDF")) {
        return "Lỗi: Không thể phân tích cấu trúc file PDF. File có thể bị hỏng hoặc không đúng định dạng.";
    }
    if (englishError.includes("Không tìm thấy chữ ký nào")) {
        return "Lỗi: Không tìm thấy chữ ký điện tử nào trong tài liệu.";
    }
    if (englishError.includes("Chữ ký không chứa thông tin ngày ký")) {
        return "Lỗi: Chữ ký hợp lệ nhưng không chứa thông tin ngày ký để đối chiếu.";
    }
    
    // Thông báo mặc định cho các lỗi không xác định
    return "Lỗi không xác định đã xảy ra trong quá trình xử lý file.";
}


// --- BẮT ĐẦU KHỐI MÃ THAY THẾ TOÀN BỘ HÀM VERIFYPDFSIGNATURE ---

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
    
    if (!contentType || !contentType.startsWith('application/pdf')) return null;
    
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        logger.log(`File ${filePath} does not match Criterion 1 structure. Skipping.`);
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
        // === LOGIC NÂNG CẤP BẮT ĐẦU TỪ ĐÂY ===

        // 1. Lấy dữ liệu của cả Tiêu chí (từ admin) và Hồ sơ đánh giá (từ xã)
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        const assessmentDoc = await assessmentRef.get();

        if (!criterionDoc.exists) throw new Error("Không tìm thấy cấu hình Tiêu chí 1.");
        if (!assessmentDoc.exists) throw new Error(`Không tìm thấy hồ sơ đánh giá: ${assessmentId}`);
        
        const criterionData = criterionDoc.data();
        const assessmentData = assessmentDoc.data()?.assessmentData;

        // 2. Xác định phương thức giao nhiệm vụ mà Admin đã chọn
        const assignmentType = criterionData?.assignmentType || 'specific';
        logger.info(`Processing file for assignment type: ${assignmentType}`);

        let issueDate: Date;
        let deadline: Date;

        // 3. Phân luồng logic để lấy đúng thông tin thời hạn
        if (assignmentType === 'specific') {
            // -- TRƯỜNG HỢP 1: ADMIN GIAO CỤ THỂ --
            logger.info("Handling 'specific' assignment.");
            const documentConfig = criterionData?.documents?.[docIndex];
            if (!documentConfig || !documentConfig.issueDate || !documentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy cấu hình văn bản cụ thể cho index ${docIndex}.`);
            }
            issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
            deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        } else { // assignmentType === 'quantity'
            // -- TRƯỜNG HỢP 2: ADMIN GIAO THEO SỐ LƯỢNG --
            logger.info("Handling 'quantity' assignment.");
            const communeDocumentConfig = assessmentData?.[indicatorId]?.communeDefinedDocuments?.[docIndex];
            if (!communeDocumentConfig || !communeDocumentConfig.issueDate || !communeDocumentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy thông tin văn bản do xã kê khai cho index ${docIndex}.`);
            }
            issueDate = parse(communeDocumentConfig.issueDate, 'dd/MM/yyyy', new Date());
            deadline = addDays(issueDate, communeDocumentConfig.issuanceDeadlineDays);
        }
        
        logger.info(`Calculated deadline for ${fileName}: ${deadline.toISOString()}`);

        // 4. Các bước trích xuất và so sánh chữ ký giữ nguyên
        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        const signatures = await extractSignatureInfo(fileBuffer);
        if (signatures.length === 0) throw new Error("Không tìm thấy chữ ký nào trong tài liệu bằng pdf-lib.");

        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;
        if (!signingTime) throw new Error("Chữ ký không chứa thông tin ngày ký (M).");
        
        const isValid = signingTime <= deadline;
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);
        
        logger.info(`[pdf-lib] Successfully processed signature for ${fileName}. Status: ${isValid ? 'valid' : 'invalid'}`);

    } catch (error: any) {
        logger.error(`[pdf-lib] Error processing ${filePath}:`, error);
        const userFriendlyMessage = translateErrorMessage(error.message);
        await updateAssessmentFileStatus('error', userFriendlyMessage);
        return null;
    }
    return null;
});

// --- KẾT THÚC KHỐI MÃ THAY THẾ ---
