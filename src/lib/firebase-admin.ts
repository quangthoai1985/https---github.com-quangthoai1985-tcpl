import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Cách này sẽ hoạt động khi deploy lên môi trường Google Cloud
    // hoặc khi bạn đã cấu hình Application Default Credentials ở local.
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error.message);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { admin, adminDb, adminAuth };
