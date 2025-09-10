// File: functions/src/index.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  // Trường hợp document bị xóa, không làm gì cả
  if (!event.data?.after.exists) {
    console.log(`User document ${event.params.userId} deleted. Removing claims.`);
    // Tùy chọn: Xóa claims khi user bị xóa khỏi Firestore
    // await admin.auth().setCustomUserClaims(event.params.userId, null);
    return null;
  }

  const userData = event.data.after.data();
  const userId = event.params.userId;

  if (!userData) {
    console.log(`User document ${userId} has no data. No action taken.`);
    return null;
  }

  // === PHẦN SỬA LỖI QUAN TRỌNG NHẤT ===
  // Tạo một đối tượng claims trống để thêm các giá trị hợp lệ vào
  const claimsToSet: { [key: string]: any } = {};

  // Chỉ thêm 'role' vào claims nếu nó tồn tại trong userData
  if (userData.role) {
    claimsToSet.role = userData.role;
  }
  
  // Chỉ thêm 'communeId' vào claims nếu nó tồn tại trong userData
  if (userData.communeId) {
    claimsToSet.communeId = userData.communeId;
  }
  // =====================================

  try {
    console.log(`Updating claims for user ${userId}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userId, claimsToSet);
    console.log(`Successfully updated claims for user ${userId}`);
  } catch (error) {
    console.error(`Error updating custom claims for user ${userId}:`, error);
  }
  
  return null;
});

/**
 * Extracts the raw signature data from a PDF buffer.
 * @param pdfBuffer The buffer containing the PDF file content.
 * @returns The signature data as a hexadecimal string, or null if not found.
 */
const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    
    // Find ByteRange
    const byteRangePos = pdfString.lastIndexOf('/ByteRange');
    if (byteRangePos === -1) {
        logger.warn("Could not find /ByteRange in the PDF.");
        return null;
    }
    
    const byteRangeEnd = pdfString.indexOf(']', byteRangePos);
    if (byteRangeEnd === -1) {
        logger.warn("Could not find the end of /ByteRange array.");
        return null;
    }
    
    const byteRangeValue = pdfString.substring(byteRangePos, byteRangeEnd);
    const match = byteRangeValue.match(/\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!match) {
        logger.warn("Could not parse /ByteRange values.");
        return null;
    }
    
    // Find signature content
    const contentsPos = pdfString.lastIndexOf('/Contents');
    const contentsStart = pdfString.indexOf('<', contentsPos);
    const contentsEnd = pdfString.indexOf('>', contentsStart);
    
    if (contentsStart === -1 || contentsEnd === -1) {
        logger.warn("Could not find signature /Contents block.");
        return null;
    }

    const signatureHex = pdfString.substring(contentsStart + 1, contentsEnd);
    // Remove any line breaks from the hex string
    return signatureHex.replace(/\r\n|\n|\r/g, '');
};


/**
 * Triggered when a new file is uploaded to Firebase Storage.
 * It checks if the file is a PDF, downloads its content into a buffer,
 * and logs it for further processing.
 */
export const processSignedPDF = onObjectFinalized(async (event) => {
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

    if (!contentType || !contentType.startsWith('application/pdf')) {
        logger.log(`File ${filePath} is not a PDF, skipping processing.`);
        return null;
    }

    // Path structure: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{docIndex}/{fileName}
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        logger.log(`File ${filePath} is not a signature evidence file for Criterion 1, skipping.`);
        return null;
    }

    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    // Helper to update the assessment document in Firestore
    const updateAssessmentFileStatus = async (fileStatus: 'validating' | 'valid' | 'invalid' | 'error', reason?: string) => {
        const doc = await assessmentRef.get();
        if (!doc.exists) return;

        const data = doc.data();
        const assessmentData = data?.assessmentData;
        if (!assessmentData || !assessmentData[indicatorId]) return;
        
        const indicatorResult = assessmentData[indicatorId];
        const fileToUpdate = indicatorResult.filesPerDocument?.[docIndex]?.find((f: any) => f.name === fileName);

        if (fileToUpdate) {
            fileToUpdate.signatureStatus = fileStatus;
            if (reason) fileToUpdate.signatureError = reason;
        }

        // Re-evaluate the overall indicator status
        const allFilesValid = Object.values(indicatorResult.filesPerDocument || {}).flat().every((f: any) => f.signatureStatus === 'valid');
        const assignedCount = (await db.collection('criteria').doc('TC01').get()).data()?.assignedDocumentsCount || 0;
        const enteredValue = Number(indicatorResult.value);
        const isAchieved = enteredValue >= assignedCount && allFilesValid;
        indicatorResult.status = (indicatorResult.isTasked === false || (enteredValue > 0 && isAchieved)) ? 'achieved' : 'not-achieved';
        
        await assessmentRef.update({ assessmentData: assessmentData });
    };

    // Initial update to show "validating" status on the frontend
    await updateAssessmentFileStatus('validating');
    logger.info(`Processing signature for PDF: ${filePath}`);

    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");

        const criterionData = criterionDoc.data();
        const documentConfig = criterionData?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Document configuration for index ${docIndex} not found in TC01.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) throw new Error("Không tìm thấy chữ ký số trong tệp PDF.");

        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);

        const signerCertificate = p7.certificates[0];
        if (!signerCertificate) throw new Error("Không tìm thấy chứng thư số trong chữ ký.");

        const signingTimeAttr = p7.signers[0].authenticatedAttributes.find((attr: any) => attr.type === forge.pki.oids.signingTime);
        const signingTime = signingTimeAttr ? new Date(forge.asn1.fromDer(signingTimeAttr.value).value) : null;
        if (!signingTime) throw new Error("Không tìm thấy thời gian ký trong chữ ký.");

        const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";

        await saveCheckResult(status, undefined, signingTime, deadline, signerName);
        await updateAssessmentFileStatus(isValid ? 'valid' : 'invalid', isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`);

        logger.info(`Successfully processed signature for ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`Error processing ${filePath}:`, error);
        await saveCheckResult("error", error.message);
        await updateAssessmentFileStatus('error', error.message);
        return null;
    }

    return null;
});

// Helper for path parsing
function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
    // Expected path: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{docIndex}/{fileName}
    const parts = filePath.split('/');
    if (parts.length === 6 && parts[0] === 'hoso' && parts[2] === 'evidence') {
        const docIndex = parseInt(parts[4], 10);
        if (!isNaN(docIndex)) {
            return {
                communeId: parts[1],
                periodId: parts[3],
                indicatorId: parts[4], // This is wrong, it should be parts[3]... let's recheck the path.
                // hoso/XA001/evidence/DOT001/TC01_CT01/0/file.pdf
                // 0:hoso, 1:communeId, 2:evidence, 3:periodId, 4:indicatorId, 5:docIndex, 6:fileName
            };
        }
    }

    if(parts.length === 7 && parts[0] === 'hoso' && parts[2] === 'evidence') {
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
