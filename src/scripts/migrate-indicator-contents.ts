
/* eslint-disable no-console */
import { adminDb as db } from '@/lib/firebase-admin';
import type { Criterion, Indicator, SubIndicator, Content } from '../lib/data';

// ========================================================================================
// SCRIPT DI CHUYỂN DỮ LIỆU TỪ subIndicators SANG contents
// ========================================================================================
// MỤC ĐÍCH:
// - Script này quét qua tất cả các tài liệu trong collection 'criteria'.
// - Đối với mỗi chỉ tiêu, nó kiểm tra xem có trường 'subIndicators' (cấu trúc cũ)
//   mà chưa có trường 'contents' (cấu trúc mới) hay không.
// - Nếu có, nó sẽ chuyển đổi mảng 'subIndicators' thành mảng 'contents' mới,
//   giữ nguyên các trường dữ liệu tương ứng.
// - Nó cũng sẽ tự động gán một 'passRule' mặc định là { type: 'all' },
//   phản ánh logic cũ là tất cả các mục con đều phải đạt.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT sau khi deploy code mới.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run migrate:contents`
// ========================================================================================


async function main() {
    try {
        console.log("Bắt đầu quá trình di chuyển dữ liệu từ 'subIndicators' sang 'contents'...");

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
            const criterion = doc.data() as Criterion;
            let needsUpdate = false;

            if (criterion.indicators && Array.isArray(criterion.indicators)) {
                criterion.indicators.forEach((indicator: Indicator) => {
                    // Điều kiện để di chuyển: có subIndicators và chưa có contents
                    if (indicator.subIndicators?.length > 0 && (!indicator.contents || indicator.contents.length === 0)) {
                        console.log(`- Tiêu chí ${criterion.id}, Chỉ tiêu ${indicator.id}: Phát hiện cấu trúc 'subIndicators' cũ. Chuẩn bị di chuyển...`);
                        
                        // Chuyển đổi subIndicators thành contents
                        indicator.contents = indicator.subIndicators.map((sub: SubIndicator): Content => ({
                            id: sub.id,
                            name: sub.name,
                            description: sub.description,
                            standardLevel: sub.standardLevel,
                            inputType: sub.inputType,
                            evidenceRequirement: sub.evidenceRequirement
                        }));

                        // Gán passRule mặc định
                        indicator.passRule = { type: 'all' };

                        // Xóa trường subIndicators cũ để dọn dẹp
                        delete (indicator as any).subIndicators;

                        needsUpdate = true;
                    }
                });
            }

            if (needsUpdate) {
                console.log(`  -> Chuẩn bị cập nhật cho tài liệu tiêu chí ID: ${doc.id}`);
                batch.update(doc.ref, { indicators: criterion.indicators });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện di chuyển dữ liệu cho ${updatedCount} tiêu chí...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có tiêu chí nào cần di chuyển dữ liệu.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} tài liệu tiêu chí.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình di chuyển dữ liệu:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
