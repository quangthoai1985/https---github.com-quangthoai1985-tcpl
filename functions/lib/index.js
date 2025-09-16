"use strict";
// File: functions/src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignedUrlForFile = exports.verifyPDFSignature = exports.onAssessmentFileDeleted = exports.syncUserClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("firebase-functions/v2/storage");
const pdf_lib_1 = require("pdf-lib"); // <-- Thư viện mới
const date_fns_1 = require("date-fns");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
admin.initializeApp();
const db = admin.firestore();
// ===== HÀM SYNC CLAIMS (GIỮ NGUYÊN) =====
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        v2_1.logger.log(`User document ${event.params.userId} deleted. Removing claims.`);
        return null;
    }
    const userData = event.data.after.data();
    const userId = event.params.userId;
    if (!userData) {
        v2_1.logger.log(`User document ${userId} has no data. No action taken.`);
        return null;
    }
    const claimsToSet = {};
    if (userData.role) {
        claimsToSet.role = userData.role;
    }
    if (userData.communeId) {
        claimsToSet.communeId = userData.communeId;
    }
    try {
        v2_1.logger.log(`Updating claims for user ${userId}:`, claimsToSet);
        await admin.auth().setCustomUserClaims(userId, claimsToSet);
        v2_1.logger.log(`Successfully updated claims for user ${userId}`);
    }
    catch (error) {
        v2_1.logger.error(`Error updating custom claims for user ${userId}:`, error);
    }
    return null;
});
// ===== CÁC HÀM PHỤ TRỢ (GIỮ NGUYÊN) =====
function parseAssessmentPath(filePath) {
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
function collectAllFileUrls(assessmentData) {
    const urls = new Set();
    if (!assessmentData || typeof assessmentData !== 'object')
        return urls;
    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if (indicator) {
            if (Array.isArray(indicator.files)) {
                indicator.files.forEach((file) => {
                    if (file && typeof file.url === 'string' && file.url)
                        urls.add(file.url);
                });
            }
            if (indicator.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
                for (const docIndex in indicator.filesPerDocument) {
                    const fileList = indicator.filesPerDocument[docIndex];
                    if (Array.isArray(fileList)) {
                        fileList.forEach((file) => {
                            if (file && typeof file.url === 'string' && file.url)
                                urls.add(file.url);
                        });
                    }
                }
            }
        }
    }
    return urls;
}
exports.onAssessmentFileDeleted = (0, firestore_1.onDocumentUpdated)("assessments/{assessmentId}", async (event) => {
    var _a, _b;
    const dataBefore = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const dataAfter = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!dataBefore || !dataAfter) {
        v2_1.logger.log("Document data is missing, cannot compare file lists.");
        return null;
    }
    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);
    const deletionPromises = [];
    const storage = admin.storage();
    const bucket = storage.bucket();
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            v2_1.logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                const url = new URL(fileUrl);
                const filePath = decodeURIComponent(url.pathname).split('/o/')[1];
                if (!filePath) {
                    throw new Error("Could not extract file path from URL.");
                }
                v2_1.logger.log(`Attempting to delete file from path: ${filePath}`);
                const fileRef = bucket.file(filePath);
                deletionPromises.push(fileRef.delete().catch(err => {
                    if (err.code === 404) {
                        v2_1.logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
                    }
                    else {
                        v2_1.logger.error(`Failed to delete file ${filePath}:`, err);
                    }
                }));
            }
            catch (error) {
                v2_1.logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }
    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        v2_1.logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    }
    else {
        v2_1.logger.log("No files were removed in this update. No deletions necessary.");
    }
    return null;
});
// ===== HÀM MỚI ĐỂ XỬ LÝ CHỮ KÝ BẰNG PDF-LIB =====
/**
 * Phân tích chuỗi ngày tháng từ chữ ký PDF (định dạng D:YYYYMMDDHHmmssZ) thành đối tượng Date.
 */
function parsePdfDate(raw) {
    if (!raw)
        return null;
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
    }
    catch (e) {
        v2_1.logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}
/**
 * Trích xuất tên người ký và ngày ký từ file PDF sử dụng pdf-lib.
 */
async function extractSignatureInfo(pdfBuffer) {
    var _a, _b, _c;
    const signatures = [];
    try {
        const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer, { updateMetadata: false });
        const acroForm = pdfDoc.getForm();
        const fields = acroForm.getFields();
        for (const field of fields) {
            const fieldType = (_a = field.acroField.FT()) === null || _a === void 0 ? void 0 : _a.toString();
            if (fieldType === '/Sig') {
                const sigDict = field.acroField.V();
                // === PHẦN SỬA LỖI QUAN TRỌNG ===
                // Chỉ xử lý nếu sigDict là một đối tượng Dictionary
                if (sigDict instanceof pdf_lib_1.PDFDict) {
                    const nameRaw = (_b = sigDict.get(pdf_lib_1.PDFName.of('Name'))) === null || _b === void 0 ? void 0 : _b.toString();
                    const signDateRaw = (_c = sigDict.get(pdf_lib_1.PDFName.of('M'))) === null || _c === void 0 ? void 0 : _c.toString();
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
    }
    catch (error) {
        v2_1.logger.error("Error extracting signature with pdf-lib:", error);
    }
    return signatures;
}
// HÀM MỚI: Dịch các thông báo lỗi phổ biến sang tiếng Việt
function translateErrorMessage(englishError) {
    v2_1.logger.info("Original error message:", englishError); // Giúp debug về sau
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
exports.verifyPDFSignature = (0, storage_1.onObjectFinalized)({ bucket: "chuan-tiep-can-pl.firebasestorage.app" }, async (event) => {
    var _a, _b, _c, _d;
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';
    const saveCheckResult = async (status, reason, signingTime, deadline, signerName) => {
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
    if (!contentType || !contentType.startsWith('application/pdf'))
        return null;
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        v2_1.logger.log(`File ${filePath} does not match Criterion 1 structure. Skipping.`);
        return null;
    }
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const updateAssessmentFileStatus = async (fileStatus, reason) => {
        var _a;
        const doc = await assessmentRef.get();
        if (!doc.exists)
            return;
        const data = doc.data();
        if (!data)
            return;
        const assessmentData = data.assessmentData || {};
        const indicatorResult = assessmentData[indicatorId];
        if (!indicatorResult || !indicatorResult.filesPerDocument)
            return;
        const fileList = indicatorResult.filesPerDocument[docIndex] || [];
        const fileToUpdate = fileList.find((f) => f.name === fileName);
        if (fileToUpdate) {
            fileToUpdate.signatureStatus = fileStatus;
            if (reason) {
                fileToUpdate.signatureError = reason;
            }
            else {
                delete fileToUpdate.signatureError;
            }
            const criterionDoc = await db.collection('criteria').doc('TC01').get();
            const assignedCount = ((_a = criterionDoc.data()) === null || _a === void 0 ? void 0 : _a.assignedDocumentsCount) || 0;
            const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
            const allFilesUploaded = allFiles.length >= assignedCount;
            const allSignaturesValid = allFiles.every((f) => f.signatureStatus === 'valid');
            const quantityMet = Number(indicatorResult.value) >= assignedCount;
            if (quantityMet && allFilesUploaded && allSignaturesValid) {
                indicatorResult.status = 'achieved';
            }
            else {
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
        if (!criterionDoc.exists)
            throw new Error("Không tìm thấy cấu hình Tiêu chí 1.");
        if (!assessmentDoc.exists)
            throw new Error(`Không tìm thấy hồ sơ đánh giá: ${assessmentId}`);
        const criterionData = criterionDoc.data();
        const assessmentData = (_a = assessmentDoc.data()) === null || _a === void 0 ? void 0 : _a.assessmentData;
        // 2. Xác định phương thức giao nhiệm vụ mà Admin đã chọn
        const assignmentType = (criterionData === null || criterionData === void 0 ? void 0 : criterionData.assignmentType) || 'specific';
        v2_1.logger.info(`Processing file for assignment type: ${assignmentType}`);
        let issueDate;
        let deadline;
        // 3. Phân luồng logic để lấy đúng thông tin thời hạn
        if (assignmentType === 'specific') {
            // -- TRƯỜNG HỢP 1: ADMIN GIAO CỤ THỂ --
            v2_1.logger.info("Handling 'specific' assignment.");
            const documentConfig = (_b = criterionData === null || criterionData === void 0 ? void 0 : criterionData.documents) === null || _b === void 0 ? void 0 : _b[docIndex];
            if (!documentConfig || !documentConfig.issueDate || !documentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy cấu hình văn bản cụ thể cho index ${docIndex}.`);
            }
            issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
            deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
        }
        else { // assignmentType === 'quantity'
            // -- TRƯỜNG HỢP 2: ADMIN GIAO THEO SỐ LƯỢNG --
            v2_1.logger.info("Handling 'quantity' assignment.");
            const communeDocumentConfig = (_d = (_c = assessmentData === null || assessmentData === void 0 ? void 0 : assessmentData[indicatorId]) === null || _c === void 0 ? void 0 : _c.communeDefinedDocuments) === null || _d === void 0 ? void 0 : _d[docIndex];
            if (!communeDocumentConfig || !communeDocumentConfig.issueDate || !communeDocumentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy thông tin văn bản do xã kê khai cho index ${docIndex}.`);
            }
            issueDate = (0, date_fns_1.parse)(communeDocumentConfig.issueDate, 'dd/MM/yyyy', new Date());
            deadline = (0, date_fns_1.addDays)(issueDate, communeDocumentConfig.issuanceDeadlineDays);
        }
        v2_1.logger.info(`Calculated deadline for ${fileName}: ${deadline.toISOString()}`);
        // 4. Các bước trích xuất và so sánh chữ ký giữ nguyên
        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        const signatures = await extractSignatureInfo(fileBuffer);
        if (signatures.length === 0)
            throw new Error("Không tìm thấy chữ ký nào trong tài liệu bằng pdf-lib.");
        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;
        if (!signingTime)
            throw new Error("Chữ ký không chứa thông tin ngày ký (M).");
        const isValid = signingTime <= deadline;
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);
        v2_1.logger.info(`[pdf-lib] Successfully processed signature for ${fileName}. Status: ${isValid ? 'valid' : 'invalid'}`);
    }
    catch (error) {
        v2_1.logger.error(`[pdf-lib] Error processing ${filePath}:`, error);
        const userFriendlyMessage = translateErrorMessage(error.message);
        await updateAssessmentFileStatus('error', userFriendlyMessage);
        return null;
    }
    return null;
});
// --- KẾT THÚC KHỐI MÃ THAY THẾ ---
// --- BẮT ĐẦU ĐOẠN CODE MỚI CẦN THÊM ---
exports.getSignedUrlForFile = (0, https_1.onCall)(async (request) => {
    // 1. Kiểm tra xem người dùng đã đăng nhập chưa
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Người dùng phải đăng nhập để thực hiện.");
    }
    // 2. Lấy đường dẫn file từ frontend
    const filePath = request.data.filePath;
    if (!filePath || typeof filePath !== 'string') {
        throw new https_1.HttpsError("invalid-argument", "Phải cung cấp đường dẫn file (filePath).");
    }
    // 3. (Tùy chọn) Thêm kiểm tra bảo mật ở đây nếu cần, ví dụ:
    // const communeId = request.auth.token.communeId;
    // if (!filePath.startsWith(`hoso/${communeId}/`)) {
    //     throw new HttpsError("permission-denied", "Bạn không có quyền xem file này.");
    // }
    try {
        // 4. Tạo URL có chữ ký, hết hạn sau 15 phút
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
        const [url] = await admin.storage().bucket().file(filePath).getSignedUrl(options);
        // 5. Trả URL về cho frontend
        return { signedUrl: url };
    }
    catch (error) {
        v2_1.logger.error("Error generating signed URL for " + filePath, error);
        throw new https_1.HttpsError("internal", "Không thể tạo đường dẫn xem trước cho file.");
    }
});
// --- KẾT THÚC ĐOẠN CODE MỚI ---
//# sourceMappingURL=index.js.map