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
exports.verifyPDFSignature = exports.onAssessmentFileDeleted = exports.syncUserClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const pdf_lib_1 = require("pdf-lib"); // Sử dụng thư viện pdf-lib
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
// ===== HÀM SYNC CLAIMS (GIỮ NGUYÊN) =====
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        console.log(`User document ${event.params.userId} deleted. Removing claims.`);
        return null;
    }
    const userData = event.data.after.data();
    const userId = event.params.userId;
    if (!userData) {
        console.log(`User document ${userId} has no data. No action taken.`);
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
        console.log(`Updating claims for user ${userId}:`, claimsToSet);
        await admin.auth().setCustomUserClaims(userId, claimsToSet);
        console.log(`Successfully updated claims for user ${userId}`);
    }
    catch (error) {
        console.error(`Error updating custom claims for user ${userId}:`, error);
    }
    return null;
});
// ===== CÁC HÀM PHỤ TRỢ CŨ VẪN GIỮ LẠI =====
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
    // ... Giữ nguyên logic xóa file cũ ...
    const dataBefore = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const dataAfter = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!dataBefore || !dataAfter)
        return null;
    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);
    const deletionPromises = [];
    const storage = admin.storage();
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const fileRef = storage.refFromURL(fileUrl);
                deletionPromises.push(fileRef.delete());
            }
            catch (error) {
                firebase_functions_1.logger.error(`Error creating ref for deletion: ${fileUrl}`, error);
            }
        }
    }
    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        firebase_functions_1.logger.info(`Successfully processed ${deletionPromises.length} file deletion(s).`);
    }
    return null;
});
// ===== CÁC HÀM MỚI SỬ DỤNG PDF-LIB =====
/**
 * Phân tích chuỗi ngày tháng từ chữ ký PDF (định dạng D:YYYYMMDDHHmmss...) thành đối tượng Date.
 */
function parsePdfDate(raw) {
    if (!raw || !raw.startsWith('D:'))
        return null;
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
        }
        else if (dateString.endsWith('Z')) {
            // Đã là giờ UTC
        }
        else {
            // Mặc định cho múi giờ Việt Nam nếu không có thông tin
            date = new Date(date.getTime() - 7 * 60 * 60 * 1000);
        }
        return date;
    }
    catch (e) {
        firebase_functions_1.logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}
/**
 * Trích xuất thông tin chữ ký từ file PDF sử dụng pdf-lib.
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
                if (sigDict) {
                    const nameRaw = (_b = sigDict.get(pdf_lib_1.PDFName.of('Name'))) === null || _b === void 0 ? void 0 : _b.toString();
                    const signDateRaw = (_c = sigDict.get(pdf_lib_1.PDFName.of('M'))) === null || _c === void 0 ? void 0 : _c.toString();
                    const name = nameRaw ? nameRaw.substring(1, nameRaw.length - 1) : null;
                    const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;
                    if (signDate) { // Chỉ thêm vào nếu có ngày ký
                        signatures.push({ name, signDate });
                    }
                }
            }
        }
    }
    catch (error) {
        firebase_functions_1.logger.error("Error extracting signature with pdf-lib:", error);
    }
    return signatures;
}
// ===== CLOUD FUNCTION CHÍNH ĐÃ ĐƯỢC NÂNG CẤP HOÀN TOÀN =====
exports.verifyPDFSignature = (0, storage_1.onObjectFinalized)(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';
    if (!contentType || !contentType.startsWith('application/pdf')) {
        return null;
    }
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        firebase_functions_1.logger.log(`File ${filePath} does not match Criterion 1 structure. Skipping.`);
        return null;
    }
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    // Helper to update the main assessment document
    const updateAssessmentFileStatus = async (fileStatus, reason) => {
        var _a;
        // ... (giữ nguyên logic hàm updateAssessmentFileStatus như cũ)
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
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists)
            throw new Error("Criterion document TC01 not found.");
        const documentConfig = (_a = criterionDoc.data()) === null || _a === void 0 ? void 0 : _a.documents?.[docIndex];
        if (!documentConfig)
            throw new Error(`Document config for index ${docIndex} not found.`);
        const issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
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
        firebase_functions_1.logger.info(`[pdf-lib SUCCESS] Processed ${fileName}. Status: ${status}`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`[pdf-lib ERROR] Error processing ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
        return null;
    }
    var _a;
    return null;
});
//# sourceMappingURL=index.js.map