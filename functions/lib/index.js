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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssessmentFileDeleted = exports.processSignedPDF = exports.syncUserClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const forge = __importStar(require("node-forge"));
const date_fns_1 = require("date-fns");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
admin.initializeApp();
const db = admin.firestore();
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    // Trường hợp document bị xóa, không làm gì cả
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
const extractSignature = (pdfBuffer) => {
    const pdfString = pdfBuffer.toString('binary');
    const byteRangePos = pdfString.lastIndexOf('/ByteRange');
    if (byteRangePos === -1) {
        firebase_functions_1.logger.warn("Could not find /ByteRange in the PDF.");
        return null;
    }
    const byteRangeEnd = pdfString.indexOf(']', byteRangePos);
    if (byteRangeEnd === -1) {
        firebase_functions_1.logger.warn("Could not find the end of /ByteRange array.");
        return null;
    }
    const byteRangeValue = pdfString.substring(byteRangePos, byteRangeEnd);
    const match = byteRangeValue.match(/\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!match) {
        firebase_functions_1.logger.warn("Could not parse /ByteRange values.");
        return null;
    }
    const contentsPos = pdfString.lastIndexOf('/Contents');
    const contentsStart = pdfString.indexOf('<', contentsPos);
    const contentsEnd = pdfString.indexOf('>', contentsStart);
    if (contentsStart === -1 || contentsEnd === -1) {
        firebase_functions_1.logger.warn("Could not find signature /Contents block.");
        return null;
    }
    const signatureHex = pdfString.substring(contentsStart + 1, contentsEnd);
    return signatureHex.replace(/\r\n|\n|\r/g, '');
};
const checkDocumentFormatting = (textContent) => {
    const issues = [];
    const normalizedText = textContent.toUpperCase();
    // Rule 1: Check for national emblem and motto
    if (!normalizedText.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")) {
        issues.push("Không tìm thấy Quốc hiệu 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'.");
    }
    if (!normalizedText.includes("ĐỘC LẬP - TỰ DO - HẠNH PHÚC")) {
        issues.push("Không tìm thấy Tiêu ngữ 'Độc lập - Tự do - Hạnh phúc'.");
    }
    // Rule 2: Check for document number and symbol using regex
    const docNumberRegex = /SỐ\s*:\s*(\d+[A-Z]?)\/(\d{4})\/([A-ZĐ]+)-([A-ZĐ]+)/i;
    if (!docNumberRegex.test(textContent)) {
        issues.push("Không tìm thấy hoặc sai định dạng Số, ký hiệu văn bản (Ví dụ: Số: 01/2024/NQ-HĐND).");
    }
    // Rule 3: Check for document type
    const docTypes = ["NGHỊ QUYẾT", "QUYẾT ĐỊNH", "CHỈ THỊ", "KẾ HOẠCH"];
    if (!docTypes.some(type => normalizedText.includes(type))) {
        issues.push(`Không tìm thấy tên loại văn bản (ví dụ: ${docTypes.join(', ')}).`);
    }
    return {
        status: issues.length === 0 ? 'passed' : 'failed',
        issues: issues
    };
};
exports.processSignedPDF = (0, storage_1.onObjectFinalized)(async (event) => {
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
    if (!contentType || !contentType.startsWith('application/pdf')) {
        firebase_functions_1.logger.log(`File ${filePath} is not a PDF, skipping processing.`);
        return null;
    }
    const pathInfo = parseAssessmentPath(filePath);
    // Fetch TC01 criterion document to validate the path more reliably
    const criterionDocRef = db.collection('criteria').doc('TC01');
    const criterionDoc = await criterionDocRef.get();
    if (!criterionDoc.exists) {
        firebase_functions_1.logger.error("Criterion document TC01 not found. Cannot validate path.");
        return null;
    }
    const criterionData = criterionDoc.data();
    const criterion1IndicatorIds = ((criterionData === null || criterionData === void 0 ? void 0 : criterionData.indicators) || []).map((i) => i.id);
    if (!pathInfo || !criterion1IndicatorIds.includes(pathInfo.indicatorId)) {
        firebase_functions_1.logger.log(`File ${filePath} does not match any indicator in Criterion 1. Skipping.`);
        return null;
    }
    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    firebase_functions_1.logger.info(`Processing signature for PDF: ${filePath}`, { pathInfo });
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);
    const updateAssessmentFileStatus = async (fileStatus, reason, contentCheckStatus, contentCheckIssues) => {
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
            // Add content check results
            fileToUpdate.contentCheckStatus = contentCheckStatus || 'not_checked';
            if (contentCheckIssues && contentCheckIssues.length > 0) {
                fileToUpdate.contentCheckIssues = contentCheckIssues;
            }
            else {
                delete fileToUpdate.contentCheckIssues;
            }
            const assignedCount = (criterionData === null || criterionData === void 0 ? void 0 : criterionData.assignedDocumentsCount) || 0;
            const allFilesValid = Object.values(indicatorResult.filesPerDocument).flat().every((f) => f.signatureStatus === 'valid');
            const isAchieved = Number(indicatorResult.value) >= assignedCount && allFilesValid;
            indicatorResult.status = isAchieved ? 'achieved' : 'not-achieved';
            await assessmentRef.update({ [`assessmentData.${indicatorId}`]: indicatorResult });
        }
    };
    await updateAssessmentFileStatus('validating', undefined, 'not_checked');
    try {
        const documentConfig = (_a = criterionData === null || criterionData === void 0 ? void 0 : criterionData.documents) === null || _a === void 0 ? void 0 : _a[docIndex];
        if (!documentConfig)
            throw new Error(`Document configuration for index ${docIndex} not found in TC01.`);
        const issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex)
            throw new Error("Không tìm thấy chữ ký số trong tệp PDF.");
        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);
        const signedData = p7;
        if (signedData.type !== forge.pki.oids.signedData) {
            throw new Error(`Loại chữ ký không hợp lệ. Yêu cầu "SignedData", nhận được "${signedData.type}".`);
        }
        if (!signedData.signers || signedData.signers.length === 0) {
            throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");
        }
        if (!signedData.certificates || signedData.certificates.length === 0) {
            throw new Error("Không tìm thấy chứng thư số trong chữ ký.");
        }
        const signer = signedData.signers[0];
        const signerCertificate = signedData.certificates[0];
        const signingTime = signer.signingTime;
        if (!signingTime) {
            throw new Error("Không tìm thấy thuộc tính thời gian ký (signingTime) trong chữ ký.");
        }
        const signerName = ((_b = signerCertificate.subject.getField('CN')) === null || _b === void 0 ? void 0 : _b.value) || 'Unknown Signer';
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";
        await saveCheckResult(status, undefined, signingTime, deadline, signerName);
        // --- NEW: CONTENT CHECKING LOGIC ---
        let contentCheckStatus = 'not_checked';
        let contentCheckIssues = [];
        if (isValid) {
            firebase_functions_1.logger.info(`Signature is valid for ${fileName}. Proceeding to content check.`);
            const pdfData = await (0, pdf_parse_1.default)(fileBuffer);
            const { status: checkStatus, issues } = checkDocumentFormatting(pdfData.text);
            contentCheckStatus = checkStatus;
            contentCheckIssues = issues;
            if (checkStatus === 'failed') {
                firebase_functions_1.logger.warn(`Content formatting issues found for ${fileName}:`, issues);
            }
            else {
                firebase_functions_1.logger.info(`Content formatting check passed for ${fileName}.`);
            }
        }
        // --- END: CONTENT CHECKING LOGIC ---
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`, contentCheckStatus, contentCheckIssues);
        firebase_functions_1.logger.info(`Successfully processed signature for ${fileName}. Status: ${status}`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error processing ${filePath}:`, error);
        await saveCheckResult("error", error.message);
        await updateAssessmentFileStatus('error', error.message, 'not_checked');
        return null;
    }
    return null;
});
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
    if (!assessmentData || typeof assessmentData !== 'object') {
        return urls;
    }
    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if (indicator) {
            // Collect from the top-level 'files' array
            if (Array.isArray(indicator.files)) {
                indicator.files.forEach((file) => {
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
                        fileList.forEach((file) => {
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
                // Correctly parse the file path from the GCS URL
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
//# sourceMappingURL=index.js.map