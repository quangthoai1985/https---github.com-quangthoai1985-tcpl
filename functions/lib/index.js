"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssessmentFileDeleted = exports.handleSignatureCheck = void 0;
// File: functions/src/index.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const pdf_lib_1 = require("pdf-lib");
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
// =================================================================================================
// HELPER FUNCTIONS
// =================================================================================================
function parseAssessmentPath(filePath) {
    const parts = filePath.split('/');
    if (parts.length === 7 && parts[0] === 'hoso' && parts[2] === 'evidence') {
        const docIndex = parseInt(parts[5], 10);
        if (!isNaN(docIndex)) {
            return { communeId: parts[1], periodId: parts[3], indicatorId: parts[4], docIndex };
        }
    }
    return null;
}
function parsePdfDate(raw) {
    if (!raw || !raw.startsWith('D:'))
        return null;
    try {
        const dateString = raw.substring(2, 16); // D:YYYYMMDDHHmmss
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1;
        const day = parseInt(dateString.substring(6, 8), 10);
        const hour = parseInt(dateString.substring(8, 10), 10);
        const minute = parseInt(dateString.substring(10, 12), 10);
        const second = parseInt(dateString.substring(12, 14), 10);
        return new Date(year, month, day, hour, minute, second);
    }
    catch (e) {
        firebase_functions_1.logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}
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
                    const name = nameRaw ? nameRaw.substring(1, nameRaw.length - 1) : null;
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
function collectAllFileUrls(assessmentData) {
    const urls = new Set();
    if (!assessmentData || typeof assessmentData !== 'object')
        return urls;
    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if ((indicator === null || indicator === void 0 ? void 0 : indicator.filesPerDocument) && typeof indicator.filesPerDocument === 'object') {
            for (const docIndex in indicator.filesPerDocument) {
                const fileList = indicator.filesPerDocument[docIndex];
                if (Array.isArray(fileList)) {
                    fileList.forEach((file) => {
                        if (file === null || file === void 0 ? void 0 : file.url)
                            urls.add(file.url);
                    });
                }
            }
        }
    }
    return urls;
}
// =================================================================================================
// CLOUD FUNCTIONS
// =================================================================================================
exports.handleSignatureCheck = (0, storage_1.onObjectFinalized)(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';
    if (!contentType || !contentType.startsWith('application/pdf'))
        return null;
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.'))
        return null;
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const updateStatus = async (status, reason) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    firebase_functions_1.logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data || !data.assessmentData)
                    return;
                const assessmentData = { ...data.assessmentData };
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: 'pending', value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                let fileList = filesPerDocument[docIndex] || [];
                let fileToUpdate = fileList.find((f) => f.name === fileName);
                if (!fileToUpdate) {
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                fileToUpdate.signatureStatus = status;
                if (reason)
                    fileToUpdate.signatureError = reason;
                else
                    delete fileToUpdate.signatureError;
                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                const criterionDocSnap = await transaction.get(db.collection('criteria').doc('TC01'));
                const assignedCount = criterionDocSnap.data()?.assignedDocumentsCount || 0;
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f) => f.signatureStatus === 'valid');
                const quantityMet = Number(indicatorResult.value) >= assignedCount;
                if (quantityMet && allFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = 'achieved';
                }
                else if (!quantityMet || !allFilesUploaded) {
                    indicatorResult.status = 'pending';
                }
                else {
                    indicatorResult.status = 'not-achieved';
                }
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
        }
        catch (error) {
            firebase_functions_1.logger.error(`Transaction to update file status for ${fileName} failed:`, error);
        }
    };
    await updateStatus('validating');
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists)
            throw new Error("Criterion document TC01 not found.");
        const documentConfig = criterionDoc.data()?.documents?.[docIndex];
        if (!documentConfig)
            throw new Error(`Document config for index ${docIndex} not found.`);
        const issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        const signatures = await extractSignatureInfo(fileBuffer);
        if (signatures.length === 0)
            throw new Error("Không tìm thấy thông tin chữ ký hợp lệ trong tài liệu.");
        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;
        if (!signingTime)
            throw new Error("Chữ ký không chứa thông tin ngày ký hợp lệ.");
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "invalid"; // Changed from 'expired' to 'invalid' for consistency
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;
        await updateStatus(status, reason);
        firebase_functions_1.logger.info(`[pdf-lib SUCCESS] Processed ${fileName}. Status: ${status}`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`[pdf-lib ERROR] Error processing ${filePath}:`, error);
        await updateStatus('error', error.message);
    }
    return null;
});
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
// Bạn có thể xóa hàm syncUserClaims nếu không cần nữa hoặc giữ lại nếu vẫn sử dụng
// export const syncUserClaims = ...
//# sourceMappingURL=index.js.map
