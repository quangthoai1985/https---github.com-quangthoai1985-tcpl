
/* eslint-disable no-console */
import * as admin from 'firebase-admin';
import type { Assessment } from '../lib/data';

// ========================================================================================
// SCRIPT DỌN DẸP CÁC TRƯỜNG CHỮ KÝ SỐ MỒ CÔI
// ========================================================================================
// MỤC ĐÍCH:
// - Script này quét qua tất cả các hồ sơ trong collection 'assessments'.
// - Nó tìm đến các tệp trong `assessmentData` (cả `files` và `filesPerDocument`).
// - Nó xóa các trường liên quan đến kiểm tra chữ ký cũ như `signatureStatus`, 
//   `signatureError`, `contentCheckStatus`, `contentCheckIssues` khỏi mỗi đối tượng tệp.
// - Mục đích là để làm sạch cơ sở dữ liệu, chỉ giữ lại `name` và `url` cho mỗi tệp,
//   chuẩn bị cho cơ chế kiểm tra mới hoặc đơn giản hóa cấu trúc.
// - Script này được thiết kế để chạy MỘT LẦN DUY NHẤT.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run cleanup:signatures`
// ========================================================================================


// Khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../../service-account-credentials.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK được khởi tạo thành công.");
    } catch (error: any) {
        console.error("Lỗi: Không thể khởi tạo Firebase Admin SDK.", error.message);
        process.exit(1);
    }
}

const db = admin.firestore();

async function main() {
    try {
        console.log("Bắt đầu quá trình quét và dọn dẹp trường chữ ký số...");

        const assessmentsRef = db.collection('assessments');
        const snapshot = await assessmentsRef.get();

        if (snapshot.empty) {
            console.log("Không tìm thấy hồ sơ nào trong collection 'assessments'.");
            return;
        }
        
        let updatedCount = 0;
        const batch = db.batch();
        const fieldsToDelete = ['signatureStatus', 'signatureError', 'contentCheckStatus', 'contentCheckIssues'];


        console.log(`Tìm thấy ${snapshot.docs.length} hồ sơ. Đang kiểm tra...`);

        for (const doc of snapshot.docs) {
            const assessment = doc.data() as Assessment;
            const assessmentData = assessment.assessmentData;
            let needsUpdate = false;

            if (!assessmentData) continue;

            for (const indicatorId in assessmentData) {
                const indicator = assessmentData[indicatorId];

                // Dọn dẹp trong trường 'files'
                if (indicator.files && Array.isArray(indicator.files)) {
                    indicator.files.forEach(file => {
                        fieldsToDelete.forEach(field => {
                            if (file.hasOwnProperty(field)) {
                                delete (file as any)[field];
                                needsUpdate = true;
                            }
                        });
                    });
                }
                
                // Dọn dẹp trong trường 'filesPerDocument'
                if (indicator.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
                    for (const docIndex in indicator.filesPerDocument) {
                        const fileList = indicator.filesPerDocument[docIndex];
                        if (fileList && Array.isArray(fileList)) {
                             fileList.forEach(file => {
                                fieldsToDelete.forEach(field => {
                                    if (file.hasOwnProperty(field)) {
                                        delete (file as any)[field];
                                        needsUpdate = true;
                                    }
                                });
                            });
                        }
                    }
                }
            }


            if (needsUpdate) {
                console.log(`- Chuẩn bị cập nhật cho hồ sơ ID: ${doc.id}`);
                batch.update(doc.ref, { assessmentData: assessmentData });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`\nĐang thực hiện dọn dẹp cho ${updatedCount} hồ sơ...`);
            await batch.commit();
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có hồ sơ nào cần dọn dẹp trường chữ ký số.");
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
