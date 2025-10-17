
/* eslint-disable no-console */
import { adminDb as db } from '@/lib/firebase-admin';

// ========================================================================================
// SCRIPT DỌN DẸP CÁC TRƯỜNG CŨ TRONG INDICATOR
// ========================================================================================
// MỤC ĐÍCH:
// - Quét tất cả các tài liệu trong collection 'criteria'.
// - Đối với mỗi chỉ tiêu, xóa các trường cũ: 'standardLevel', 'inputType',
//   'evidenceRequirement', và 'subIndicators'.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT để hoàn tất quá trình
//   chuyển đổi sang cấu trúc 'contents'.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run cleanup:indicator-fields`
// ========================================================================================

async function main() {
    try {
        console.log("Bắt đầu quá trình quét và dọn dẹp các trường indicator cũ...");

        const criteriaRef = db.collection('criteria');
        const snapshot = await criteriaRef.get();

        if (snapshot.empty) {
            console.log("Không tìm thấy tiêu chí nào trong collection 'criteria'.");
            return;
        }
        
        let updatedCount = 0;
        const batch = db.batch();
        const fieldsToDelete = ['standardLevel', 'inputType', 'evidenceRequirement', 'subIndicators'];

        console.log(`Tìm thấy ${snapshot.docs.length} tiêu chí. Đang kiểm tra...`);

        for (const doc of snapshot.docs) {
            const criterion = doc.data();
            let needsUpdate = false;

            if (criterion.indicators && Array.isArray(criterion.indicators)) {
                criterion.indicators.forEach((indicator: any) => {
                    fieldsToDelete.forEach(field => {
                        if (indicator.hasOwnProperty(field)) {
                            delete indicator[field];
                            needsUpdate = true;
                        }
                    });
                });
            }

            if (needsUpdate) {
                console.log(`- Chuẩn bị dọn dẹp các trường cũ trong tiêu chí ID: ${doc.id}`);
                batch.update(doc.ref, { indicators: criterion.indicators });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện dọn dẹp cho ${updatedCount} tài liệu tiêu chí...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có tiêu chí nào cần dọn dẹp trường cũ trong các chỉ tiêu.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} tài liệu tiêu chí.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình dọn dẹp:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
