
/* eslint-disable no-console */
import * as admin from 'firebase-admin';

// ========================================================================================
// SCRIPT DI CHUYỂN TRẠNG THÁI HỒ SƠ ĐÁNH GIÁ
// ========================================================================================
// MỤC ĐÍCH:
// - Script này quét qua tất cả các hồ sơ trong collection 'assessments'.
// - Nó tìm các hồ sơ vẫn còn sử dụng trường 'status' cũ.
// - Nó chuyển đổi giá trị từ 'status' cũ sang hai trường mới: 'registrationStatus' và
//   'assessmentStatus' để phù hợp với cấu trúc dữ liệu mới.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run migrate:status`
// ========================================================================================


// Khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../../service-account-credentials.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK được khởi tạo thành công.");
    } catch (error) {
        console.error("Lỗi: Không thể khởi tạo Firebase Admin SDK.");
        console.error("Hãy chắc chắn rằng file `service-account-credentials.json` nằm ở thư mục gốc của dự án.");
        process.exit(1);
    }
}

const db = admin.firestore();

type OldStatus = 'pending_registration' | 'registration_rejected' | 'registration_approved' | 'draft' | 'pending_review' | 'approved' | 'rejected';
type RegistrationStatus = 'pending' | 'approved' | 'rejected';
type AssessmentStatus = 'not_started' | 'draft' | 'pending_review' | 'returned_for_revision' | 'achieved_standard' | 'rejected';


const migrateStatus = (oldStatus: OldStatus): { registrationStatus: RegistrationStatus, assessmentStatus: AssessmentStatus } => {
    switch (oldStatus) {
        case 'pending_registration':
            return { registrationStatus: 'pending', assessmentStatus: 'not_started' };
        case 'registration_rejected':
            return { registrationStatus: 'rejected', assessmentStatus: 'not_started' };
        case 'registration_approved':
            return { registrationStatus: 'approved', assessmentStatus: 'not_started' };
        case 'draft':
            return { registrationStatus: 'approved', assessmentStatus: 'draft' };
        case 'pending_review':
            return { registrationStatus: 'approved', assessmentStatus: 'pending_review' };
        case 'approved': // This now means "achieved_standard"
            return { registrationStatus: 'approved', assessmentStatus: 'achieved_standard' };
        case 'rejected': // This now means "rejected" (final)
             // We assume old 'rejected' maps to the final 'rejected' status.
             // If it was meant as "return for revision", it needs manual correction.
            return { registrationStatus: 'approved', assessmentStatus: 'rejected' };
        default:
            // Fallback for any unknown status
            return { registrationStatus: 'pending', assessmentStatus: 'not_started' };
    }
}


async function main() {
    try {
        console.log("Bắt đầu quá trình quét và di chuyển dữ liệu trạng thái...");

        const assessmentsRef = db.collection('assessments');
        const snapshot = await assessmentsRef.get();

        if (snapshot.empty) {
            console.log("Không tìm thấy hồ sơ nào trong collection 'assessments'.");
            return;
        }
        
        let updatedCount = 0;
        const batch = db.batch();

        console.log(`Tìm thấy ${snapshot.docs.length} hồ sơ. Đang kiểm tra...`);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Chỉ xử lý các document có trường 'status' cũ
            if (data.status && (!data.registrationStatus || !data.assessmentStatus)) {
                const oldStatus = data.status as OldStatus;
                const { registrationStatus, assessmentStatus } = migrateStatus(oldStatus);
                
                console.log(`- Di chuyển trạng thái cho hồ sơ ID: ${doc.id}`);
                console.log(`  - Trạng thái cũ: '${oldStatus}'`);
                console.log(`  - Trạng thái mới: registrationStatus='${registrationStatus}', assessmentStatus='${assessmentStatus}'`);

                batch.update(doc.ref, {
                    registrationStatus: registrationStatus,
                    assessmentStatus: assessmentStatus,
                    status: admin.firestore.FieldValue.delete() // Xóa trường status cũ
                });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện cập nhật cho ${updatedCount} hồ sơ...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có hồ sơ nào cần di chuyển trạng thái.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} hồ sơ.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình di chuyển dữ liệu:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
