// File: functions/src/index.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";

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
        logger.log("TODO: Add PDF signature verification logic here using the buffer.");

        // Example: You can now use a library to process the buffer
        // const pdfData = await somePdfParser(fileBuffer);
        // ... your logic here ...

    } catch (error) {
        logger.error("Error downloading or processing file:", error);
        return null;
    }

    return null;
});
