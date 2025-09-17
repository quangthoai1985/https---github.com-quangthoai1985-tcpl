
/* eslint-disable no-console */
import { adminDb as db, admin } from '@/lib/firebase-admin';

// ========================================================================================
// SCRIPT DỌN DẸP TRƯỜNG "CT1" THỪA TRONG ASSESSMENTDATA
// ========================================================================================
// MỤC ĐÍCH:
// - Script này quét qua tất cả các hồ sơ trong collection 'assessments'.
// - Nó tìm đến trường `assessmentData` và kiểm tra sự tồn tại của khóa `CT1`.
// - Nếu `CT1` tồn tại, nó sẽ xóa toàn bộ khóa này và dữ liệu bên trong.
// - Mục đích là để làm sạch cơ sở dữ liệu khỏi dữ liệu thừa của thiết kế cũ.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run cleanup:ct1`
// ========================================================================================

async function main() {
    try {
        console.log("Bắt đầu quá trình quét và dọn dẹp trường 'CT1'...");

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
            
            if (data.assessmentData && data.assessmentData.CT1) {
                console.log(`- Tìm thấy trường 'CT1' thừa trong hồ sơ ID: ${doc.id}. Chuẩn bị xóa...`);
                
                // Sử dụng FieldValue.delete() để xóa một trường cụ thể trong một tài liệu
                const updatePayload = {
                    'assessmentData.CT1': admin.firestore.FieldValue.delete()
                };

                batch.update(doc.ref, updatePayload);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện dọn dẹp cho ${updatedCount} hồ sơ...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có hồ sơ nào chứa trường 'CT1' thừa cần dọn dẹp.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} hồ sơ.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình dọn dẹp:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
