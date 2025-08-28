import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

// This function automatically runs whenever a document in the 'users' collection
// is created or updated. Using the v2 SDK syntax.
export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  // If the document is deleted, do nothing.
  if (!event.data?.after.exists) {
    console.log(`User document ${event.params.userId} deleted. No action taken.`);
    return null;
  }

  // Lấy dữ liệu từ document sau khi có sự kiện write.
  const userData = event.data.after.data();
  const userId = event.params.userId; // This is the user's Auth UID

  // === THÊM BƯỚC KIỂM TRA QUAN TRỌNG Ở ĐÂY ===
  // Kiểm tra xem userData có thực sự tồn tại và không phải undefined không.
  if (!userData) {
    console.log(`User document ${userId} exists, but has no data. No action taken.`);
    return null;
  }

  // Từ dòng này trở đi, TypeScript hiểu rằng 'userData' chắc chắn có dữ liệu.
  // Lỗi "possibly 'undefined'" sẽ biến mất.
  const role = userData.role;
  const communeId = userData.communeId;

  // Check that the data exists before setting claims.
  if (role) {
    try {
      const claimsToSet: { [key: string]: any } = { role };
      if (communeId) {
        claimsToSet.communeId = communeId;
      }
      
      console.log(`Updating claims for user ${userId}:`, claimsToSet);
      // Attach the role and communeId to the user's token.
      await admin.auth().setCustomUserClaims(userId, claimsToSet);
      console.log(`Successfully updated claims for user ${userId}`);
      return null;
    } catch (error) {
      console.error("Error updating custom claims:", error);
      return null;
    }
  }

  console.log(`User ${userId} has no role to set.`);
  return null;
});