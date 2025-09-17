import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Chỉ khởi tạo nếu chưa có app nào được khởi tạo
if (!admin.apps.length) {
    const serviceAccountPath = path.join(process.cwd(), 'service-account-credentials.json');

    try {
        // Ưu tiên 1: Khởi tạo bằng file service account nếu tồn tại
        // Cách này hoạt động ổn định khi chạy script ở local.
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin SDK initialized using service-account-credentials.json.");
        } else {
            // Ưu tiên 2: Khởi tạo bằng Application Default Credentials
            // Cách này hoạt động khi deploy lên môi trường Google Cloud (Cloud Run, Cloud Functions).
            admin.initializeApp();
            console.log("Firebase Admin SDK initialized using Application Default Credentials.");
        }
    } catch (error: any) {
        console.error("FATAL: Could not initialize Firebase Admin SDK.", error.message);
        // Nếu cả hai cách đều thất bại, chúng ta không thể tiếp tục.
        // Có thể cân nhắc thêm các phương án khác nếu cần.
    }
}

// Xuất các đối tượng đã được khởi tạo để dùng chung
const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { admin, adminDb, adminAuth };
