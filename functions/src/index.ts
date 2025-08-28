
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// This function automatically runs whenever a document in the 'users' collection
// is created or updated.
export const syncUserClaims = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    // If the document is deleted, do nothing.
    if (!change.after.exists) {
      return null;
    }

    const userData = change.after.data();
    const userId = context.params.userId; // This is the user's Auth UID

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
