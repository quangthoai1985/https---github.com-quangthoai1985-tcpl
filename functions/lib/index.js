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
const forge = __importStar(require("node-forge"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
// =================================================================================================
// HELPER FUNCTIONS (HÀM PHỤ TRỢ)
// =================================================================================================
function parseAssessmentPath(filePath) {
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
const extractSignature = (pdfBuffer) => {
    const pdfString = pdfBuffer.toString('binary');
    const signatureRegex = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\][^<]*\/Contents\s*<([^>]+)>/;
    const match = pdfString.match(signatureRegex);
    if (match && match[1]) {
        firebase_functions_1.logger.info("Successfully extracted signature using regex.");
        return match[1].replace(/\s/g, '');
    }
    firebase_functions_1.logger.warn("Could not find signature block using regex.");
    return null;
};
// =================================================================================================
// CLOUD FUNCTIONS
// =================================================================================================
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        return;
    }
    const userData = event.data.after.data();
    const userId = event.params.userId;
    if (!userData) {
        return;
    }
    const claimsToSet = {};
    if (userData.role) {
        claimsToSet.role = userData.role;
    }
    if (userData.communeId) {
        claimsToSet.communeId = userData.communeId;
    }
    try {
        await admin.auth().setCustomUserClaims(userId, claimsToSet);
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error updating custom claims for user ${userId}:`, error);
    }
    return;
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
    const bucket = admin.storage().bucket(); // Lấy bucket mặc định
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            try {
                // **SỬA LỖI**: Phân tích URL để lấy đúng đường dẫn file trong Storage
                const url = new URL(fileUrl);
                const decodedPath = decodeURIComponent(url.pathname);
                const filePathInBucket = decodedPath.substring(decodedPath.indexOf('/o/') + 3);
                if (filePathInBucket) {
                    firebase_functions_1.logger.log(`Attempting to delete file from path: ${filePathInBucket}`);
                    const fileRef = bucket.file(filePathInBucket);
                    deletionPromises.push(fileRef.delete().catch((err) => {
                        if (err.code === 404) {
                            firebase_functions_1.logger.warn(`Attempted to delete ${filePathInBucket}, but it was not found.`);
                        }
                        else {
                            firebase_functions_1.logger.error(`Failed to delete file ${filePathInBucket}:`, err);
                        }
                    }));
                }
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
    return null;
});
exports.verifyPDFSignature = (0, storage_1.onObjectFinalized)(async (event) => {
    var _a, _b, _c;
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
    const updateAssessmentFileStatus = async (fileStatus, reason) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    firebase_functions_1.logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data)
                    return;
                const assessmentData = data.assessmentData || {};
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: 'pending', value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                let fileList = filesPerDocument[docIndex] || [];
                let fileToUpdate = fileList.find((f) => f.name === fileName);
                if (!fileToUpdate) {
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                fileToUpdate.signatureStatus = fileStatus;
                if (reason)
                    fileToUpdate.signatureError = reason;
                else
                    delete fileToUpdate.signatureError;
                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                const criterionDocSnap = await transaction.get(db.collection('criteria').doc('TC01'));
                const criterionData = criterionDocSnap.data();
                const assignedCount = (criterionData === null || criterionData === void 0 ? void 0 : criterionData.assignedDocumentsCount) || 0;
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
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
        }
        catch (error) {
            firebase_functions_1.logger.error(`Transaction to update file status for ${fileName} failed:`, error);
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
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex)
            throw new Error("Không tìm thấy khối dữ liệu chữ ký trong tệp PDF.");
        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex), false);
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);
        const signerInfo = p7.rawCapture.signerInfo;
        if (!signerInfo)
            throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");
        const signingTimeAttr = signerInfo.authenticatedAttributes.find((attr) => forge.pki.oids.signingTime === attr.oid);
        if (!signingTimeAttr || !signingTimeAttr.value)
            throw new Error("Không tìm thấy thuộc tính thời gian ký.");
        const signingTime = forge.asn1.fromDer(signingTimeAttr.value).value[0].value;
        if (!p7.certificates || p7.certificates.length === 0)
            throw new Error("Không tìm thấy chứng thư nào trong chữ ký.");
        const signerCertificate = p7.certificates[0];
        const signerName = ((_c = signerCertificate.subject.getField('CN')) === null || _c === void 0 ? void 0 : _c.value) || 'Unknown Signer';
        const isValid = new Date(signingTime) <= deadline;
        const status = isValid ? "valid" : "invalid";
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;
        await updateAssessmentFileStatus(status, reason);
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error processing signature for ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
    }
    return null;
});
//# sourceMappingURL=index.js.map