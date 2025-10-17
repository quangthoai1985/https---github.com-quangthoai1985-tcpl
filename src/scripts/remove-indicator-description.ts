
/* eslint-disable no-console */
import { adminDb as db } from '@/lib/firebase-admin';

// ========================================================================================
// SCRIPT XÓA TRƯỜNG "description" KHỎI CHỈ TIÊU (INDICATOR)
// ========================================================================================
// MỤC ĐÍCH:
// - Quét tất cả các tài liệu trong collection 'criteria'.
// - Đối với mỗi tiêu chí, duyệt qua mảng 'indicators'.
// - Xóa trường 'description' khỏi mỗi object 'indicator' nếu nó tồn tại.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT để dọn dẹp dữ liệu.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run cleanup:indicator-desc`
// ========================================================================================


async function main() {
    try {
        console.log("Bắt đầu quá trình quét và xóa trường 'description' khỏi các chỉ tiêu...");

        const criteriaRef = db.collection('criteria');
        const snapshot = await criteriaRef.get();

        if (snapshot.empty) {
            console.log("Không tìm thấy tiêu chí nào trong collection 'criteria'.");
            return;
        }
        
        let updatedCount = 0;
        const batch = db.batch();

        console.log(`Tìm thấy ${snapshot.docs.length} tiêu chí. Đang kiểm tra...`);

        for (const doc of snapshot.docs) {
            const criterion = doc.data();
            let needsUpdate = false;

            if (criterion.indicators && Array.isArray(criterion.indicators)) {
                criterion.indicators.forEach((indicator: any) => {
                    // Xóa trường 'description' ở cấp chỉ tiêu
                    if (indicator.description !== undefined) {
                        delete indicator.description;
                        needsUpdate = true;
                    }
                });
            }

            if (needsUpdate) {
                console.log(`- Chuẩn bị cập nhật cho tiêu chí ID: ${doc.id}`);
                batch.update(doc.ref, { indicators: criterion.indicators });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện cập nhật cho ${updatedCount} tiêu chí...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có tiêu chí nào cần xóa trường 'description' trong các chỉ tiêu.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} tiêu chí.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình dọn dẹp:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
