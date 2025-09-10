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
const pdf_lib_1 = require("pdf-lib");
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
        firebase_functions_1.logger.log("Document data is missing, cannot compare file lists.");
        return null;
    }
    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);
    const deletionPromises = [];
    const storage = admin.storage();
    const bucket = storage.bucket();
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            firebase_functions_1.logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                const url = new URL(fileUrl);
                const filePath = decodeURIComponent(url.pathname).split('/o/')[1];
                if (!filePath) {
                    throw new Error("Could not extract file path from URL.");
                }
                firebase_functions_1.logger.log(`Attempting to delete file from path: ${filePath}`);
                const fileRef = bucket.file(filePath);
                deletionPromises.push(fileRef.delete().catch(err => {
                    if (err.code === 404) {
                        firebase_functions_1.logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
                    }
                    else {
                        firebase_functions_1.logger.error(`Failed to delete file ${filePath}:`, err);
                    }
                }));
            }
            catch (error) {
                firebase_functions_1.logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }
    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        firebase_functions_1.logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    }
    else {
        firebase_functions_1.logger.log("No files were removed in this update. No deletions necessary.");
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
        firebase_functions_1.logger.error("Failed to parse PDF date string:", raw, e);
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
                if (sigDict instanceof pdf_lib_1.PDFDict) {
                    const nameRaw = (_b = sigDict.get(pdf_lib_1.PDFName.of('Name'))) === null || _b === void 0 ? void 0 : _b.toString();
                    const signDateRaw = (_c = sigDict.get(pdf_lib_1.PDFName.of('M'))) === null || _c === void 0 ? void 0 : _c.toString();
                    const name = nameRaw ? nameRaw.substring(1) : null;
                    const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;
                    if (signDate) {
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
// ===== CLOUD FUNCTION CHÍNH ĐƯỢC NÂNG CẤP =====
exports.verifyPDFSignature = (0, storage_1.onObjectFinalized)(async (event) => {
    var _a, _b;
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
        firebase_functions_1.logger.log(`File ${filePath} does not match Criterion 1 structure. Skipping.`);
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
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists)
            throw new Error("Criterion document TC01 not found.");
        const documentConfig = (_b = (_a = criterionDoc.data()) === null || _a === void 0 ? void 0 : _a.documents) === null || _b === void 0 ? void 0 : _b[docIndex];
        if (!documentConfig)
            throw new Error(`Document config for index ${docIndex} not found.`);
        const issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        // --- BẮT ĐẦU LOGIC MỚI ---
        const signatures = await extractSignatureInfo(fileBuffer);
        if (signatures.length === 0) {
            throw new Error("Không tìm thấy chữ ký nào trong tài liệu bằng pdf-lib.");
        }
        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;
        const signerName = firstSignature.name;
        if (!signingTime) {
            throw new Error("Chữ ký không chứa thông tin ngày ký (M).");
        }
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";
        await saveCheckResult(status, undefined, signingTime, deadline, signerName || undefined);
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);
        firebase_functions_1.logger.info(`[pdf-lib] Successfully processed signature for ${fileName}. Status: ${status}`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`[pdf-lib] Error processing ${filePath}:`, error);
        await saveCheckResult("error", error.message);
        await updateAssessmentFileStatus('error', error.message);
        return null;
    }
    return null;
});
//# sourceMappingURL=index.js.map