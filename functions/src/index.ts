// File: functions/src/index.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';

admin.initializeApp();

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
    const fileBucket = event.data.bucket; // The Storage bucket that contains the file.
    const filePath = event.data.name; // File path in the bucket.
    const contentType = event.data.contentType; // File content type.

    // Exit if the file is not a PDF.
    if (!contentType || !contentType.startsWith('application/pdf')) {
        logger.log(`File ${filePath} is not a PDF, skipping processing.`);
        return null;
    }

    logger.info(`Processing PDF file: ${filePath} from bucket: ${fileBucket}`);
    
    try {
        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);
        
        // Download the file content into a buffer.
        const [fileBuffer] = await file.download();
        logger.info(`File content downloaded into buffer. Size: ${fileBuffer.length} bytes.`);
        
        const signatureHex = extractSignature(fileBuffer);
        
        if (!signatureHex) {
            logger.error("No signature found in the PDF file.");
            return null;
        }

        logger.info(`Extracted signature hex data (length: ${signatureHex.length}).`);

        // Parse the signature using node-forge
        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex));
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);

        logger.info("Successfully parsed PKCS#7 signature from the PDF.");
        logger.log("TODO: Add signature verification logic here using the parsed p7 object.");

    } catch (error) {
        logger.error("Error downloading or processing file:", error);
        return null;
    }

    return null;
});
