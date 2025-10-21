
// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { addDays, parse, addBusinessDays } from "date-fns";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";


admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "chuan-tiep-can-pl",
  storageBucket: "chuan-tiep-can-pl.firebasestorage.app"
});
const db = admin.firestore();


// ===== HÀM 1: syncUserClaims =====
export const syncUserClaims = onDocumentWritten({ document: "users/{userId}", region: "asia-east1" }, async (event) => {
  if (!event.data?.after.exists) {
    logger.log(`User document ${event.params.userId} deleted. Removing claims.`);
    return null;
  }
  const userData = event.data.after.data();
  const userId = event.params.userId;
  if (!userData) {
    logger.log(`User document ${userId} has no data. No action taken.`);
    return null;
  }
  const claimsToSet: { [key: string]: string | boolean } = {};
  if (userData.role) {
    claimsToSet.role = userData.role;
  }
  if (userData.communeId) {
    claimsToSet.communeId = userData.communeId;
  }
  try {
    logger.log(`Updating claims for user ${userId}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userId, claimsToSet);
    logger.log(`Successfully updated claims for user ${userId}`);
  } catch (error: unknown) {
    logger.error(`Error updating custom claims for user ${userId}:`, error);
  }
  return null;
});

// ===== CÁC HÀM PHỤ TRỢ (GIỮ NGUYÊN) =====
function parseAssessmentPath(filePath: string):
    { communeId: string; periodId: string; indicatorId: string; subId: string, isContent: boolean } | null {
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
    } else if (parts.length === 6) {
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

interface FileWithUrl {
    url: string;
}

interface IndicatorData {
    files?: FileWithUrl[];
    filesPerDocument?: Record<string, FileWithUrl[]>;
    contentResults?: Record<string, { files?: FileWithUrl[] }>;
}

function collectAllFileUrls(assessmentData: unknown): Set<string> {
  const urls = new Set<string>();
  if (!assessmentData || typeof assessmentData !== 'object') return urls;

  const data = assessmentData as Record<string, unknown>;

  for (const indicatorId in data) {
    const indicator = data[indicatorId] as IndicatorData;
    if (!indicator) continue;

    if (Array.isArray(indicator.files)) {
      indicator.files.forEach((file) => {
        if (file && typeof file.url === "string" && file.url) urls.add(file.url);
      });
    }

    if (indicator.filesPerDocument && typeof indicator.filesPerDocument === "object") {
      for (const docIndex in indicator.filesPerDocument) {
        const fileList = indicator.filesPerDocument[docIndex];
        if (Array.isArray(fileList)) {
          fileList.forEach((file) => {
            if (file && typeof file.url === "string" && file.url) urls.add(file.url);
          });
        }
      }
    }

    if (indicator.contentResults && typeof indicator.contentResults === "object") {
      for (const contentId in indicator.contentResults) {
        const content = indicator.contentResults[contentId];
        if (content && Array.isArray(content.files)) {
          content.files.forEach((file) => {
            if (file && typeof file.url === "string" && file.url) urls.add(file.url);
          });
        }
      }
    }
  }
  return urls;
}

// ===== HÀM 2: onAssessmentFileDeleted =====
export const onAssessmentFileDeleted = onDocumentUpdated({
  document: "assessments/{assessmentId}", region: "asia-east1",
}, async (event) => {
  const dataBefore = event.data?.before.data();
  const dataAfter = event.data?.after.data();

  if (!dataBefore || !dataAfter) {
    logger.log("Document data is missing, cannot compare file lists.");
    return null;
  }

  const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
  const filesAfter = collectAllFileUrls(dataAfter.assessmentData);

  const deletionPromises: Promise<void>[] = [];
  const bucket = admin.storage().bucket();

  for (const fileUrl of filesBefore) {
    if (!filesAfter.has(fileUrl) && fileUrl.includes("firebasestorage.googleapis.com")) {
      logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
      try {
        const url = new URL(fileUrl);
        const filePath = decodeURIComponent(url.pathname).split("/o/")[1];

        if (!filePath) {
          throw new Error("Could not extract file path from URL.");
        }

        logger.log(`Attempting to delete file from path: ${filePath}`);
        const fileRef = bucket.file(filePath);

        deletionPromises.push(
          fileRef.delete()
            .then(() => {}) // Ensure the promise chain returns void on success
            .catch((err: {code: number}) => {
              if (err.code === 404) {
                logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
              } else {
                logger.error(`Failed to delete file ${filePath}:`, err);
              }
            })
        );

        const pathInfo = parseAssessmentPath(filePath);
        if (pathInfo) {
          const assessmentRef = db.collection("assessments").doc(event.params.assessmentId);
          const transactionPromise = db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const doc = await transaction.get(assessmentRef);
            if (!doc.exists) return;

            const assessmentData = doc.data()?.assessmentData || {};
            const indicatorResult = assessmentData[pathInfo.indicatorId];

            if (indicatorResult) {
              if (pathInfo.isContent && indicatorResult.contentResults?.[pathInfo.subId]) {
                const contentFiles = indicatorResult.contentResults[pathInfo.subId].files || [];
                if (contentFiles.length === 0) {
                  logger.info(`Content ${pathInfo.subId} has no files left, marking as not-achieved.`);
                  indicatorResult.contentResults[pathInfo.subId].status = "not-achieved";
                }
              } else if (!pathInfo.isContent && !pathInfo.subId && indicatorResult.files) {
                if (indicatorResult.files.length === 0) {
                  logger.info(`Indicator ${pathInfo.indicatorId} has no files left, marking as not-achieved.`);
                  indicatorResult.status = "not-achieved";
                }
              }
              transaction.set(assessmentRef, { assessmentData: { [pathInfo.indicatorId]: indicatorResult } }, { merge: true });
            }
          });
          deletionPromises.push(transactionPromise);
        }
      } catch (error: unknown) {
        logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
      }
    }
  }

  if (deletionPromises.length > 0) {
    await Promise.all(deletionPromises);
    logger.info(`Successfully processed ${deletionPromises.length} potential file operation(s).`);
  } else {
    logger.log("No files were removed in this update. No deletions necessary.");
  }

  return null;
});

// ===== CÁC HÀM XỬ LÝ CHỮ KÝ =====
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

    const dateInUTC = new Date(Date.UTC(year, month, day, hour, minute, second));
    dateInUTC.setHours(dateInUTC.getHours() - 7);
    return dateInUTC;
  } catch (e: unknown) {
    logger.error("Failed to parse PDF date string:", raw, e);
    return null;
  }
}

async function extractSignatureInfo(pdfBuffer: Buffer): Promise<{ name: string | null; signDate: Date | null }[]> {
  const signatures: { name: string | null; signDate: Date | null }[] = [];
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
    const acroForm = pdfDoc.getForm();
    const fields = acroForm.getFields();

    for (const field of fields) {
      const fieldType = field.acroField.FT()?.toString();
      if (fieldType === "/Sig") {
        const sigDict = field.acroField.V();

        if (sigDict instanceof PDFDict) {
          const nameRaw = sigDict.get(PDFName.of("Name"))?.toString();
          const signDateRaw = sigDict.get(PDFName.of("M"))?.toString();

          const name = nameRaw ? nameRaw.substring(1) : null;
          const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;

          if (signDate) {
            signatures.push({ name, signDate });
          }
        }
      }
    }
  } catch (error: unknown) {
    logger.error("Error extracting signature with pdf-lib:", error);
  }
  return signatures;
}

function translateErrorMessage(englishError: string): string {
  logger.info("Original error message:", englishError);
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
export const verifyPDFSignature = onObjectFinalized({
  bucket: "chuan-tiep-can-pl.firebasestorage.app", region: "asia-east1",
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const fileName = filePath.split("/").pop() || "unknownfile";

  const saveCheckResult = async (
      status: "valid" | "expired" | "error",
      reason?: string,
      signingTime?: Date | null,
      deadline?: Date,
      signerName?: string | null,
  ) => {
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

  if (!contentType || !contentType.startsWith("application/pdf")) return null;

  const pathInfo = parseAssessmentPath(filePath);
  if (!pathInfo || !pathInfo.indicatorId.startsWith("CT1")) {
    logger.log(`File ${filePath} is not a TC01 evidence file. Skipping signature check.`);
    return null;
  }
  
  if (pathInfo.isContent) {
      logger.log(`File ${filePath} is a content file, not a TC01 document. Skipping signature check.`);
      return null;
  }


  const { communeId, periodId, indicatorId } = pathInfo;
  const docIndex = parseInt(pathInfo.subId, 10);
  if (isNaN(docIndex)) {
    logger.log(`Invalid docIndex from path: ${pathInfo.subId}`);
    return null;
  }

  const assessmentId = `assess_${periodId}_${communeId}`;
  const assessmentRef = db.collection("assessments").doc(assessmentId);

  const updateAssessmentFileStatus = async (
      fileStatus: "validating" | "valid" | "invalid" | "error",
      reason?: string,
  ) => {
    try {
      await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const doc = await transaction.get(assessmentRef);
        if (!doc.exists) {
          logger.error(`Assessment document ${assessmentId} does not exist.`);
          return;
        }

        const data = doc.data();
        if (!data) return;

        const assessmentData = data.assessmentData || {};
        const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: "pending", value: 0 };
        const filesPerDocument = indicatorResult.filesPerDocument || {};
        const fileList: {
            name: string,
            url: string,
            signatureStatus?: string,
            signatureError?: string
        }[] = filesPerDocument[docIndex] || [];

        let fileToUpdate = fileList.find((f) => f.name === fileName);

        if (!fileToUpdate) {
          const newFileUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
          fileToUpdate = { name: fileName, url: newFileUrl };
          fileList.push(fileToUpdate);
          logger.info(`File entry for "${fileName}" not found in Firestore. Creating it.`);
        }

        fileToUpdate.signatureStatus = fileStatus;
        if (reason) {
          fileToUpdate.signatureError = reason;
        } else {
          delete fileToUpdate.signatureError;
        }

        filesPerDocument[docIndex] = fileList;
        indicatorResult.filesPerDocument = filesPerDocument;

        const criterionDocSnap = await transaction.get(db.collection("criteria").doc("TC01"));
        const criterionData = criterionDocSnap.data();
        const assignedCount = criterionData?.assignedDocumentsCount || 0;

        const allFiles = Object.values(indicatorResult.filesPerDocument).flat() as {signatureStatus?: string}[];
        const allRequiredFilesUploaded = allFiles.length >= assignedCount;
        const allSignaturesValid = allFiles.every((f) => f.signatureStatus === "valid");
        const quantityMet = Number(indicatorResult.value) >= assignedCount;

        if (quantityMet && allRequiredFilesUploaded && allSignaturesValid) {
          indicatorResult.status = "achieved";
        } else if (indicatorResult.value !== "" && indicatorResult.value !== undefined) {
          indicatorResult.status = "not-achieved";
        }

        transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
      });
      logger.info(`Successfully updated file status for "${fileName}" in transaction.`);
    } catch (error: unknown) {
      logger.error(`Transaction to update file status for "${fileName}" failed:`, error);
    }
  };

  await updateAssessmentFileStatus("validating");

  try {
    const criterionDoc = await db.collection("criteria").doc("TC01").get();
    const assessmentDoc = await assessmentRef.get();

    if (!criterionDoc.exists) throw new Error("Không tìm thấy cấu hình Tiêu chí 1.");
    if (!assessmentDoc.exists) throw new Error(`Không tìm thấy hồ sơ đánh giá: ${assessmentId}`);

    const criterionData = criterionDoc.data();
    const assessmentData = assessmentDoc.data()?.assessmentData;
    const assignmentType = criterionData?.assignmentType || "specific";

    let issueDate: Date;
    let deadline: Date;

    if (assignmentType === "specific") {
      const documentConfig = criterionData?.documents?.[docIndex];
      if (!documentConfig || !documentConfig.issueDate || !documentConfig.issuanceDeadlineDays) {
        throw new Error(`Không tìm thấy cấu hình văn bản cụ thể cho index ${docIndex}.`);
      }
      issueDate = parse(documentConfig.issueDate, "dd/MM/yyyy", new Date());
      deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);
    } else {
      const communeDocs = assessmentData?.[indicatorId]?.communeDefinedDocuments;
      const communeDocumentConfig = Array.isArray(communeDocs) ? communeDocs[docIndex] : undefined;
      if (
        !communeDocumentConfig ||
        !communeDocumentConfig.issueDate ||
        !communeDocumentConfig.issuanceDeadlineDays
      ) {
        throw new Error(`Không tìm thấy thông tin văn bản do xã kê khai cho index ${docIndex}.`);
      }
      issueDate = parse(communeDocumentConfig.issueDate, "dd/MM/yyyy", new Date());
      deadline = addDays(issueDate, communeDocumentConfig.issuanceDeadlineDays);
    }

    const bucket = admin.storage().bucket(fileBucket);
    const [fileBuffer] = await bucket.file(filePath).download();
    const signatures = await extractSignatureInfo(fileBuffer);
    if (signatures.length === 0) throw new Error("Không tìm thấy chữ ký nào trong tài liệu bằng pdf-lib.");
    const firstSignature = signatures[0];
    const signingTime = firstSignature.signDate;
    if (!signingTime) throw new Error("Chữ ký không chứa thông tin ngày ký (M).");

    const isValid = signingTime <= deadline;
    await saveCheckResult(
      isValid ? "valid" : "expired",
      isValid ? "Chữ ký hợp lệ" : "Ký sau thời hạn",
      signingTime, deadline, firstSignature.name);

    await updateAssessmentFileStatus(
      isValid ? "valid" : "invalid",
      isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString("vi-VN")})`);
  } catch (error: unknown) {
    logger.error(`[pdf-lib] Error processing ${filePath}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    const userFriendlyMessage = translateErrorMessage(message);

    await saveCheckResult("error", userFriendlyMessage);

    await updateAssessmentFileStatus("error", userFriendlyMessage);
    return null;
  }
  return null;
});

// ===== HÀM 4: getSignedUrlForFile =====
export const getSignedUrlForFile = onCall({ region: "asia-east1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Người dùng phải đăng nhập để thực hiện.");
  }

  const filePath = request.data.filePath as string;
  if (!filePath || typeof filePath !== "string") {
    throw new HttpsError("invalid-argument", "Phải cung cấp đường dẫn file (filePath).");
  }
  try {
    const options = {
      version: "v4" as const,
      action: "read" as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await admin.storage().bucket().file(filePath).getSignedUrl(options);

    return { signedUrl: url };
  } catch (error: unknown) {
    logger.error("Error generating signed URL for " + filePath, error);
    throw new HttpsError("internal", "Không thể tạo đường dẫn xem trước cho file.");
  }
});


// ===== HÀM 5: verifyCT4Signature =====
export const verifyCT4Signature = onObjectFinalized({
  bucket: "chuan-tiep-can-pl.firebasestorage.app", region: "asia-east1",
}, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;
  const fileName = filePath.split("/").pop() || "unknownfile";

  const saveCheckResult = async (
      status: "valid" | "expired" | "error",
      reason?: string,
      signingTime?: Date | null,
      deadline?: Date,
      signerName?: string | null,
  ) => {
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

  if (!contentType || !contentType.startsWith("application/pdf")) return null;

  const pathInfo = parseAssessmentPath(filePath);
  if (!pathInfo || pathInfo.indicatorId !== "CT033278") {
    logger.log(`File ${filePath} is not a CT4 evidence file. Skipping signature check.`);
    return null;
  }
  
  const { communeId, periodId, indicatorId } = pathInfo;
  // For CT4, docIndex is derived from subId which should be a contentId
  const contentId = pathInfo.subId;
  if (!contentId) {
    logger.log(`Invalid contentId from path for CT4: ${pathInfo.subId}`);
    return null;
  }
  
  const assessmentId = `assess_${periodId}_${communeId}`;
  const assessmentRef = db.collection("assessments").doc(assessmentId);

  const updateAssessmentFileStatus = async (
    contentId: string, // ID của Nội dung 1 (CNT033278)
    fileStatus: "validating" | "valid" | "invalid" | "error",
    reason?: string,
  ) => {
      try {
          await db.runTransaction(async (transaction) => {
              const doc = await transaction.get(assessmentRef);
              if (!doc.exists) throw new Error(`Assessment ${assessmentId} not found.`);

              const data = doc.data();
              if (!data) return;

              const assessmentData = data.assessmentData || {};
              const indicatorResult = assessmentData[indicatorId] || { contentResults: {} }; // indicatorId là CT033278
              const contentResults = indicatorResult.contentResults || {};
              const content1Data = contentResults[contentId] || { files: [], status: "pending", value: null }; // contentId là CNT033278
              const fileList: { name: string, url: string, signatureStatus?: string, signatureError?: string }[] = content1Data.files || [];

              // --- (Code cập nhật fileList và fileToUpdate giữ nguyên) ---
               let fileToUpdate = fileList.find((f) => f.name === fileName);

               if (!fileToUpdate) {
                   const newFileUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                   fileToUpdate = { name: fileName, url: newFileUrl };
                   fileList.push(fileToUpdate);
                   logger.info(`File entry for "${fileName}" not found in Firestore. Creating it.`);
               }

               fileToUpdate.signatureStatus = fileStatus;
               if (reason) fileToUpdate.signatureError = reason;
               else delete fileToUpdate.signatureError;

               content1Data.files = fileList;
              // --- (Kết thúc code cập nhật fileList) ---


              // --- BẮT ĐẦU LOGIC CẬP NHẬT TRẠNG THÁI MỚI ---
              let content1NewStatus = content1Data.status; // Giữ trạng thái cũ nếu đang validating
              if (fileStatus === 'valid') {
                  // Cần kiểm tra xem tất cả file của content1 có valid không
                   const allContent1FilesValid = fileList.every(f => f.signatureStatus === 'valid');
                   if (allContent1FilesValid) {
                       content1NewStatus = "achieved";
                   } else if (fileList.some(f => f.signatureStatus === 'invalid' || f.signatureStatus === 'error')) {
                       content1NewStatus = "not-achieved"; // Nếu có file lỗi/invalid -> not-achieved
                   } else {
                        content1NewStatus = "pending"; // Nếu còn file đang validating
                   }
              } else if (fileStatus === 'invalid' || fileStatus === 'error') {
                  content1NewStatus = "not-achieved"; // Chỉ cần 1 file lỗi/invalid là not-achieved
              }
              content1Data.status = content1NewStatus;

              // Lưu lại Nội dung 1
              contentResults[contentId] = content1Data;

              // Tìm ID và trạng thái của Nội dung 2 (Giả định ID là CNT066117)
              const content2Id = "CNT066117"; // **QUAN TRỌNG:** Xác nhận ID này!
              const content2Data = contentResults[content2Id];
              const content2Status = content2Data?.status || 'pending';

              // Lấy quy tắc đạt của chỉ tiêu cha (CT033278) từ criteria
              let parentIndicatorStatus: "achieved" | "not-achieved" | "pending" = 'pending';
              const criteriaDoc = await transaction.get(db.collection("criteria").doc("TC02"));
              const parentIndicatorConfig = criteriaDoc.data()?.indicators?.find((i: {id: string}) => i.id === indicatorId);
              const passRuleType = parentIndicatorConfig?.passRule?.type || 'all'; // Mặc định là 'all'

              if (passRuleType === 'all') {
                  if (content1NewStatus === 'achieved' && content2Status === 'achieved') {
                      parentIndicatorStatus = 'achieved';
                  } else if (content1NewStatus === 'not-achieved' || content2Status === 'not-achieved') {
                      parentIndicatorStatus = 'not-achieved';
                  } else {
                      parentIndicatorStatus = 'pending'; // Nếu có cái nào pending
                  }
              } else {
                  // TODO: Thêm logic cho các passRule khác nếu cần (atLeast, percentage)
                  parentIndicatorStatus = 'pending';
              }

              // Cập nhật trạng thái cho chỉ tiêu cha
              indicatorResult.status = parentIndicatorStatus;
              indicatorResult.contentResults = contentResults; // Đảm bảo lưu cả contentResults

              transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
              // --- KẾT THÚC LOGIC CẬP NHẬT TRẠNG THÁI MỚI ---
          });
          logger.info(`Successfully updated CT4 file & parent status for "${fileName}".`);
      } catch (error: unknown) {
          logger.error(`Transaction to update CT4 file status for "${fileName}" failed:`, error);
      }
  };


  try {
      const assessmentDoc = await assessmentRef.get();
      if (!assessmentDoc.exists) throw new Error(`Assessment document ${assessmentId} does not exist.`);
      const assessmentData = assessmentDoc.data()?.assessmentData;
      if (!assessmentData) throw new Error("Assessment data is missing.");
      
      const contentData = assessmentData[indicatorId]?.contentResults?.[contentId];
      if (!contentData) throw new Error(`Content data for ${contentId} not found in assessment.`);

      const provincialPlanDateStr = contentData.value?.provincialPlanDate;
      if (!provincialPlanDateStr) throw new Error("Provincial plan issue date is not defined by the commune.");
      
      await updateAssessmentFileStatus(contentId, "validating");
      
      const issueDate = parse(provincialPlanDateStr, "dd/MM/yyyy", new Date());
      if (isNaN(issueDate.getTime())) {
          throw new Error(`Invalid provincial plan date format: ${provincialPlanDateStr}. Use DD/MM/YYYY.`);
      }
      
      const deadline = addBusinessDays(issueDate, 7);

      const bucket = admin.storage().bucket(fileBucket);
      const [fileBuffer] = await bucket.file(filePath).download();
      const signatures = await extractSignatureInfo(fileBuffer);
      if (signatures.length === 0) throw new Error("Không tìm thấy chữ ký nào trong tài liệu bằng pdf-lib.");

      const firstSignature = signatures[0];
      const signingTime = firstSignature.signDate;
      if (!signingTime) throw new Error("Chữ ký không chứa thông tin ngày ký (M).");

      const isValid = signingTime <= deadline;
      await saveCheckResult(
          isValid ? "valid" : "expired",
          isValid ? "Chữ ký hợp lệ" : "Ký sau thời hạn",
          signingTime, deadline, firstSignature.name
      );

      await updateAssessmentFileStatus(
          contentId,
          isValid ? "valid" : "invalid",
          isValid ? undefined : `Ký sau thời hạn 7 ngày làm việc (Hạn chót: ${deadline.toLocaleDateString("vi-VN")})`
      );
  } catch (error: unknown) {
      logger.error(`[CT4 Signature] Error processing ${filePath}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      const userFriendlyMessage = translateErrorMessage(message);

      await saveCheckResult("error", userFriendlyMessage);
      if (contentId) {
        await updateAssessmentFileStatus(contentId, "error", userFriendlyMessage);
      }
      return null;
  }
  return null;
});
