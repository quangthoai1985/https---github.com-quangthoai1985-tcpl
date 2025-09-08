
// File: functions/src/index.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

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
