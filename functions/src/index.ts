
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

    const saveErrorResult = async (reason: string) => {
        await db.collection('signature_checks').add({
            fileName: fileName,
            filePath: filePath,
            status: "error",
            reason: reason,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    };

    if (!contentType || !contentType.startsWith('application/pdf')) {
        logger.log(`File ${filePath} is not a PDF, skipping processing.`);
        return null;
    }

    // Path structure: hoso/{communeId}/evidence/{periodId}/TC01_CT01/{docIndex}/{fileName}
    const pathParts = filePath.split('/');
    if (pathParts.length !== 6 || pathParts[0] !== 'hoso' || pathParts[2] !== 'evidence' || pathParts[4] !== 'TC01_CT01') {
        logger.log(`File ${filePath} is not a signature evidence file for Criterion 1.1, skipping.`);
        return null;
    }
    
    const communeId = pathParts[1];
    const assessmentPeriodId = pathParts[3];
    const docIndex = parseInt(pathParts[4], 10); // This is incorrect, let's fix path splitting
    const correctDocIndex = parseInt(pathParts[5], 10);
    // Correct path parsing:
    // pathParts[0] = hoso
    // pathParts[1] = communeId
    // pathParts[2] = evidence
    // pathParts[3] = periodId
    // pathParts[4] = indicatorId (e.g., 'TC01_CT01')
    // pathParts[5] = docIndex
    // pathParts[6] = fileName
    
    // Re-check path structure based on new understanding from assessment page
    if (pathParts.length !== 7) {
       logger.log(`File path ${filePath} does not match the expected structure for Criterion 1 evidence.`);
       return null;
    }
    const indicatorId = pathParts[4];
    const realDocIndex = parseInt(pathParts[5], 10);

    if (indicatorId !== 'TC01_CT01' || isNaN(realDocIndex)) {
        logger.log(`File is not for the correct indicator or has invalid document index. Skipping.`);
        return null;
    }

    logger.info(`Processing signature for PDF: ${filePath}`);

    try {
        // Step 1: Find the corresponding assessment to get the deadline
        const assessmentId = `assess_${assessmentPeriodId}_${communeId}`;
        const assessmentDoc = await db.collection('assessments').doc(assessmentId).get();
        if (!assessmentDoc.exists) {
            throw new Error(`Assessment document not found for ID: ${assessmentId}`);
        }
        
        // Step 2: Get the specific document deadline from Criterion data
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) {
            throw new Error("Criterion document TC01 not found.");
        }
        const criterionData = criterionDoc.data();
        const documentConfig = criterionData?.documents?.[realDocIndex];
        if (!documentConfig) {
            throw new Error(`Document configuration for index ${realDocIndex} not found in TC01.`);
        }
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        // Step 3: Download and process the PDF file
        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) {
            throw new Error("No digital signature found in the PDF file.");
        }

        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);

        const signerCertificate = p7.certificates[0];
        if (!signerCertificate) {
            throw new Error("Could not find certificate in the signature.");
        }

        const signingTimeAttr = p7.signers[0].authenticatedAttributes.find(
            (attr: any) => attr.type === forge.pki.oids.signingTime
        );
        const signingTime = signingTimeAttr ? new Date(forge.asn1.fromDer(signingTimeAttr.value).value) : null;
        if (!signingTime) {
            throw new Error("Signing time not found in the signature.");
        }

        const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        
        // Step 4: Compare and save result
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "expired";

        await db.collection('signature_checks').add({
            fileName: fileName,
            filePath: filePath,
            status: status,
            signingTime: signingTime,
            deadline: deadline,
            signerName: signerName,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Successfully processed signature for ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`Error processing ${filePath}:`, error);
        await saveErrorResult(error.message);
        return null;
    }

    return null;
});

// Helper for path parsing
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
