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
exports.verifyCT4Signature = exports.getSignedUrlForFile = exports.verifyPDFSignature = exports.onAssessmentFileDeleted = exports.syncUserClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const storage_1 = require("firebase-functions/v2/storage");
const pdf_lib_1 = require("pdf-lib");
const date_fns_1 = require("date-fns");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "chuan-tiep-can-pl",
    storageBucket: "chuan-tiep-can-pl.firebasestorage.app"
});
const db = admin.firestore();
// ===== HÀM 1: syncUserClaims =====
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)({ document: "users/{userId}", region: "asia-east1" }, async (event) => {
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
    const parts = filePath.split("/");
    if (parts.length >= 6 && parts[0] === "hoso" && parts[2] === "evidence") {
        // Path for Criterion 1: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{docIndex}/{fileName} (length 7)
        // Path for others: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{contentId}/{fileName} (length 7)
        // Path for simple indicators: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{fileName} (length 6)
        if (parts.length === 7) {
            const subId = parts[5];
            const isContent = subId.startsWith("CNT");
            return {
                communeId: parts[1],
                periodId: parts[3],
                indicatorId: parts[4],
                subId: subId,
                isContent: isContent,
            };
        }
        else if (parts.length === 6) {
            // Simple indicator with no content/docIndex
            return {
                communeId: parts[1],
                periodId: parts[3],
                indicatorId: parts[4],
                subId: '', // No subId
                isContent: false, // Not a content item
            };
        }
    }
    return null;
}
function collectAllFileUrls(assessmentData) {
    const urls = new Set();
    if (!assessmentData || typeof assessmentData !== 'object')
        return urls;
    const data = assessmentData;
    for (const indicatorId in data) {
        const indicator = data[indicatorId];
        if (!indicator)
            continue;
        if (Array.isArray(indicator.files)) {
            indicator.files.forEach((file) => {
                if (file && typeof file.url === "string" && file.url)
                    urls.add(file.url);
            });
        }
        if (indicator.filesPerDocument && typeof indicator.filesPerDocument === "object") {
            for (const docIndex in indicator.filesPerDocument) {
                const fileList = indicator.filesPerDocument[docIndex];
                if (Array.isArray(fileList)) {
                    fileList.forEach((file) => {
                        if (file && typeof file.url === "string" && file.url)
                            urls.add(file.url);
                    });
                }
            }
        }
        if (indicator.contentResults && typeof indicator.contentResults === "object") {
            for (const contentId in indicator.contentResults) {
                const content = indicator.contentResults[contentId];
                if (content && Array.isArray(content.files)) {
                    content.files.forEach((file) => {
                        if (file && typeof file.url === "string" && file.url)
                            urls.add(file.url);
                    });
                }
                // START: NEWLY ADDED IF BLOCK
                // Check filesPerDocument inside contentResults (For CT4 - Content 1)
                if (content && content.filesPerDocument && typeof content.filesPerDocument === 'object') {
                    for (const docIndex in content.filesPerDocument) {
                        const fileList = content.filesPerDocument[docIndex];
                        if (Array.isArray(fileList)) {
                            fileList.forEach((file) => {
                                if (file && typeof file.url === 'string' && file.url)
                                    urls.add(file.url);
                            });
                        }
                    }
                }
                // END: NEWLY ADDED IF BLOCK
            }
        }
    }
    return urls;
}
// ===== HÀM 2: onAssessmentFileDeleted =====
exports.onAssessmentFileDeleted = (0, firestore_1.onDocumentUpdated)({
    document: "assessments/{assessmentId}", region: "asia-east1",
}, async (event) => {
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
    const bucket = admin.storage().bucket();
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes("firebasestorage.googleapis.com")) {
            v2_1.logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                const url = new URL(fileUrl);
                const filePath = decodeURIComponent(url.pathname).split("/o/")[1];
                if (!filePath) {
                    throw new Error("Could not extract file path from URL.");
                }
                v2_1.logger.log(`Attempting to delete file from path: ${filePath}`);
                const fileRef = bucket.file(filePath);
                deletionPromises.push(fileRef.delete()
                    .then(() => { }) // Ensure the promise chain returns void on success
                    .catch((err) => {
                    if (err.code === 404) {
                        v2_1.logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
                    }
                    else {
                        v2_1.logger.error(`Failed to delete file ${filePath}:`, err);
                    }
                }));
                const pathInfo = parseAssessmentPath(filePath);
                if (pathInfo) {
                    const assessmentRef = db.collection("assessments").doc(event.params.assessmentId);
                    const transactionPromise = db.runTransaction(async (transaction) => {
                        var _a, _b;
                        const doc = await transaction.get(assessmentRef);
                        if (!doc.exists)
                            return;
                        const assessmentData = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.assessmentData) || {};
                        const indicatorResult = assessmentData[pathInfo.indicatorId];
                        if (indicatorResult) {
                            if (pathInfo.isContent && ((_b = indicatorResult.contentResults) === null || _b === void 0 ? void 0 : _b[pathInfo.subId])) {
                                const contentFiles = indicatorResult.contentResults[pathInfo.subId].files || [];
                                if (contentFiles.length === 0) {
                                    v2_1.logger.info(`Content ${pathInfo.subId} has no files left, marking as not-achieved.`);
                                    indicatorResult.contentResults[pathInfo.subId].status = "not-achieved";
                                }
                            }
                            else if (!pathInfo.isContent && !pathInfo.subId && indicatorResult.files) {
                                if (indicatorResult.files.length === 0) {
                                    v2_1.logger.info(`Indicator ${pathInfo.indicatorId} has no files left, marking as not-achieved.`);
                                    indicatorResult.status = "not-achieved";
                                }
                            }
                            transaction.set(assessmentRef, { assessmentData: { [pathInfo.indicatorId]: indicatorResult } }, { merge: true });
                        }
                    });
                    deletionPromises.push(transactionPromise);
                }
            }
            catch (error) {
                v2_1.logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }
    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        v2_1.logger.info(`Successfully processed ${deletionPromises.length} potential file operation(s).`);
    }
    else {
        v2_1.logger.log("No files were removed in this update. No deletions necessary.");
    }
    return null;
});
// ===== CÁC HÀM XỬ LÝ CHỮ KÝ =====
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
        const dateInUTC = new Date(Date.UTC(year, month, day, hour, minute, second));
        dateInUTC.setHours(dateInUTC.getHours() - 7);
        return dateInUTC;
    }
    catch (e) {
        v2_1.logger.error("Failed to parse PDF date string:", raw, e);
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
            if (fieldType === "/Sig") {
                const sigDict = field.acroField.V();
                if (sigDict instanceof pdf_lib_1.PDFDict) {
                    const nameRaw = (_b = sigDict.get(pdf_lib_1.PDFName.of("Name"))) === null || _b === void 0 ? void 0 : _b.toString();
                    const signDateRaw = (_c = sigDict.get(pdf_lib_1.PDFName.of("M"))) === null || _c === void 0 ? void 0 : _c.toString();
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
        v2_1.logger.error("Error extracting signature with pdf-lib:", error);
    }
    return signatures;
}
function translateErrorMessage(englishError) {
    v2_1.logger.info("Original error message:", englishError);
    if (englishError.includes("cannot be parsed") || englishError.includes("Invalid PDF")) {
        return "Lỗi: Không thể phân tích cấu trúc file PDF. File có thể bị hỏng hoặc không đúng định dạng.";
    }
    if (englishError.includes("Không tìm thấy chữ ký nào")) {
        return "Lỗi: Không tìm thấy chữ ký điện tử nào trong tài liệu.";
    }
    if (englishError.includes("Chữ ký không chứa thông tin ngày ký")) {
        return "Lỗi: Chữ ký hợp lệ nhưng không chứa thông tin ngày ký để đối chiếu.";
    }
    return "Lỗi không xác định đã xảy ra trong quá trình xử lý file.";
}
// ===== HÀM 3: verifyPDFSignature (For Criterion 1) =====
exports.verifyPDFSignature = (0, storage_1.onObjectFinalized)({
    bucket: "chuan-tiep-can-pl.firebasestorage.app", region: "asia-east1",
}, async (event) => {
    var _a, _b, _c;
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split("/").pop() || "unknownfile";
    const saveCheckResult = async (status, reason, signingTime, deadline, signerName) => {
        await db.collection("signature_checks").add({
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
    if (!contentType || !contentType.startsWith("application/pdf"))
        return null;
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith("CT1")) {
        v2_1.logger.log(`File ${filePath} is not a TC01 evidence file. Skipping signature check.`);
        return null;
    }
    if (pathInfo.isContent) {
        v2_1.logger.log(`File ${filePath} is a content file, not a TC01 document. Skipping signature check.`);
        return null;
    }
    const { communeId, periodId, indicatorId } = pathInfo;
    const docIndex = parseInt(pathInfo.subId, 10);
    if (isNaN(docIndex)) {
        v2_1.logger.log(`Invalid docIndex from path: ${pathInfo.subId}`);
        return null;
    }
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection("assessments").doc(assessmentId);
    const updateAssessmentFileStatus = async (fileStatus, reason) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    v2_1.logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data)
                    return;
                const assessmentData = data.assessmentData || {};
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: "pending", value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                const fileList = filesPerDocument[docIndex] || [];
                let fileToUpdate = fileList.find((f) => f.name === fileName);
                if (!fileToUpdate) {
                    const newFileUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: newFileUrl };
                    fileList.push(fileToUpdate);
                    v2_1.logger.info(`File entry for "${fileName}" not found in Firestore. Creating it.`);
                }
                fileToUpdate.signatureStatus = fileStatus;
                if (reason) {
                    fileToUpdate.signatureError = reason;
                }
                else {
                    delete fileToUpdate.signatureError;
                }
                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                const criterionDocSnap = await transaction.get(db.collection("criteria").doc("TC01"));
                const criterionData = criterionDocSnap.data();
                const assignedCount = (criterionData === null || criterionData === void 0 ? void 0 : criterionData.assignedDocumentsCount) || 0;
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allRequiredFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f) => f.signatureStatus === "valid");
                const quantityMet = Number(indicatorResult.value) >= assignedCount;
                if (quantityMet && allRequiredFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = "achieved";
                }
                else if (indicatorResult.value !== "" && indicatorResult.value !== undefined) {
                    indicatorResult.status = "not-achieved";
                }
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
            v2_1.logger.info(`Successfully updated file status for "${fileName}" in transaction.`);
        }
        catch (error) {
            v2_1.logger.error(`Transaction to update file status for "${fileName}" failed:`, error);
        }
    };
    await updateAssessmentFileStatus("validating");
    try {
        const criterionDoc = await db.collection("criteria").doc("TC01").get();
        const assessmentDoc = await assessmentRef.get();
        if (!criterionDoc.exists)
            throw new Error("Không tìm thấy cấu hình Tiêu chí 1.");
        if (!assessmentDoc.exists)
            throw new Error(`Không tìm thấy hồ sơ đánh giá: ${assessmentId}`);
        const criterionData = criterionDoc.data();
        const assessmentData = (_a = assessmentDoc.data()) === null || _a === void 0 ? void 0 : _a.assessmentData;
        const assignmentType = (criterionData === null || criterionData === void 0 ? void 0 : criterionData.assignmentType) || "specific";
        let issueDate;
        let deadline;
        if (assignmentType === "specific") {
            const documentConfig = (_b = criterionData === null || criterionData === void 0 ? void 0 : criterionData.documents) === null || _b === void 0 ? void 0 : _b[docIndex];
            if (!documentConfig || !documentConfig.issueDate || !documentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy cấu hình văn bản cụ thể cho index ${docIndex}.`);
            }
            issueDate = (0, date_fns_1.parse)(documentConfig.issueDate, "dd/MM/yyyy", new Date());
            deadline = (0, date_fns_1.addDays)(issueDate, documentConfig.issuanceDeadlineDays);
        }
        else {
            const communeDocs = (_c = assessmentData === null || assessmentData === void 0 ? void 0 : assessmentData[indicatorId]) === null || _c === void 0 ? void 0 : _c.communeDefinedDocuments;
            const communeDocumentConfig = Array.isArray(communeDocs) ? communeDocs[docIndex] : undefined;
            if (!communeDocumentConfig ||
                !communeDocumentConfig.issueDate ||
                !communeDocumentConfig.issuanceDeadlineDays) {
                throw new Error(`Không tìm thấy thông tin văn bản do xã kê khai cho index ${docIndex}.`);
            }
            issueDate = (0, date_fns_1.parse)(communeDocumentConfig.issueDate, "dd/MM/yyyy", new Date());
            deadline = (0, date_fns_1.addDays)(issueDate, communeDocumentConfig.issuanceDeadlineDays);
        }
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
        await saveCheckResult(isValid ? "valid" : "expired", isValid ? "Chữ ký hợp lệ" : "Ký sau thời hạn", signingTime, deadline, firstSignature.name);
        await updateAssessmentFileStatus(isValid ? "valid" : "invalid", isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString("vi-VN")})`);
    }
    catch (error) {
        v2_1.logger.error(`[pdf-lib] Error processing ${filePath}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        const userFriendlyMessage = translateErrorMessage(message);
        await saveCheckResult("error", userFriendlyMessage);
        await updateAssessmentFileStatus("error", userFriendlyMessage);
        return null;
    }
    return null;
});
// ===== HÀM 4: getSignedUrlForFile =====
exports.getSignedUrlForFile = (0, https_1.onCall)({ region: "asia-east1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Người dùng phải đăng nhập để thực hiện.");
    }
    const filePath = request.data.filePath;
    if (!filePath || typeof filePath !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Phải cung cấp đường dẫn file (filePath).");
    }
    try {
        const options = {
            version: "v4",
            action: "read",
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
        const [url] = await admin.storage().bucket().file(filePath).getSignedUrl(options);
        return { signedUrl: url };
    }
    catch (error) {
        v2_1.logger.error("Error generating signed URL for " + filePath, error);
        throw new https_1.HttpsError("internal", "Không thể tạo đường dẫn xem trước cho file.");
    }
});
// ===== HÀM 5: verifyCT4Signature =====
exports.verifyCT4Signature = (0, storage_1.onObjectFinalized)({
    bucket: "chuan-tiep-can-pl.firebasestorage.app", region: "asia-east1",
}, async (event) => {
    var _a;
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split("/").pop() || "unknownfile";
    // Định dạng: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{contentId}/{docIndex}/{fileName}
    // indicatorId phải là CT033278, contentId phải là CNT033278
    const ct4PathRegex = /^hoso\/([^\/]+)\/evidence\/([^\/]+)\/(CT033278)\/(CNT033278)\/(\d+)\//;
    const match = filePath.match(ct4PathRegex);
    if (!contentType || !contentType.startsWith("application/pdf") || !match) {
        // Không log ở đây để tránh spam, vì hàm này chạy cho mọi file upload
        return null;
    }
    const [, communeId, periodId, indicatorId, contentId, docIndexStr] = match;
    const docIndex = parseInt(docIndexStr, 10);
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection("assessments").doc(assessmentId);
    v2_1.logger.info(`[CT4] Processing file: ${fileName} for assessment ${assessmentId}`);
    const saveCheckResult = async (status, reason, signingTime, deadline, signerName) => {
        await db.collection("signature_checks").add({
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
    const updateAssessmentFileStatus = async (contentId, docIndex, // THÊM THAM SỐ NÀY
    fileStatus, reason) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists)
                    throw new Error(`Assessment ${assessmentId} not found.`);
                const data = doc.data();
                if (!data)
                    return;
                const assessmentData = data.assessmentData || {};
                // Lấy toàn bộ dữ liệu hiện có của indicator, bao gồm cả 'value'
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, contentResults: {}, status: 'pending', value: null };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                const fileList = filesPerDocument[docIndex] || [];
                let fileToUpdate = fileList.find((f) => f.name === fileName);
                if (!fileToUpdate) {
                    const newFileUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: newFileUrl };
                    fileList.push(fileToUpdate);
                    v2_1.logger.info(`[CT4] File entry for "${fileName}" not found in Firestore. Creating it.`);
                }
                fileToUpdate.signatureStatus = fileStatus;
                if (reason)
                    fileToUpdate.signatureError = reason;
                else
                    delete fileToUpdate.signatureError;
                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                // Tạm thời chỉ cập nhật file status, logic status cha sẽ phức tạp hơn
                // và có thể cần trigger riêng hoặc thực hiện ở client-side khi dữ liệu thay đổi.
                // Logic cập nhật status cha bị comment ra để đơn giản hóa
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
            v2_1.logger.info(`[CT4] Successfully updated file status for "${fileName}".`);
        }
        catch (error) {
            v2_1.logger.error(`[CT4] Transaction to update file status for "${fileName}" failed:`, error);
        }
    };
    try {
        await updateAssessmentFileStatus(contentId, docIndex, "validating");
        const assessmentDoc = await assessmentRef.get();
        if (!assessmentDoc.exists)
            throw new Error(`Assessment document ${assessmentId} does not exist.`);
        const assessmentData = (_a = assessmentDoc.data()) === null || _a === void 0 ? void 0 : _a.assessmentData;
        if (!assessmentData)
            throw new Error("Assessment data is missing.");
        const indicatorData = assessmentData[indicatorId];
        if (!indicatorData)
            throw new Error(`Indicator data for ${indicatorId} not found.`);
        // Lấy thông tin văn bản từ communeDefinedDocuments (do xã tự kê khai)
        const communeDocs = indicatorData.communeDefinedDocuments;
        const communeDocumentConfig = Array.isArray(communeDocs) ? communeDocs[docIndex] : undefined;
        if (!communeDocumentConfig || !communeDocumentConfig.issueDate || !communeDocumentConfig.issuanceDeadlineDays) {
            throw new Error(`Không tìm thấy thông tin Kế hoạch do xã kê khai cho index ${docIndex}.`);
        }
        const issueDate = (0, date_fns_1.parse)(communeDocumentConfig.issueDate, "dd/MM/yyyy", new Date());
        if (isNaN(issueDate.getTime())) {
            throw new Error(`Invalid provincial plan date format: ${communeDocumentConfig.issueDate}. Use DD/MM/YYYY.`);
        }
        const deadline = (0, date_fns_1.addBusinessDays)(issueDate, communeDocumentConfig.issuanceDeadlineDays);
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
        await saveCheckResult(isValid ? "valid" : "expired", isValid ? "Chữ ký hợp lệ" : "Ký sau thời hạn", signingTime, deadline, firstSignature.name);
        await updateAssessmentFileStatus(contentId, docIndex, isValid ? "valid" : "invalid", isValid ? undefined : `Ký sau thời hạn ${communeDocumentConfig.issuanceDeadlineDays} ngày làm việc (Hạn chót: ${deadline.toLocaleDateString("vi-VN")})`);
    }
    catch (error) {
        v2_1.logger.error(`[CT4 Signature] Error processing ${filePath}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        const userFriendlyMessage = translateErrorMessage(message);
        await saveCheckResult("error", userFriendlyMessage);
        if (contentId) {
            await updateAssessmentFileStatus(contentId, docIndex, "error", userFriendlyMessage);
        }
        return null;
    }
    return null;
});
//# sourceMappingURL=index.js.map