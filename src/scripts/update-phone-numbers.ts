
/* eslint-disable no-console */
import * as admin from 'firebase-admin';
import type { User } from '../lib/data';

// ========================================================================================
// SCRIPT CẬP NHẬT SỐ ĐIỆN THOẠI
// ========================================================================================
// MỤC ĐÍCH:
// - Quét tất cả người dùng trong Firestore.
// - Nếu người dùng chưa có số điện thoại, tạo một số ngẫu nhiên.
// - Cập nhật số điện thoại đó vào cả Firestore và Firebase Authentication.
// - Không làm thay đổi bất kỳ dữ liệu nào khác của người dùng.
//
// HƯỚSNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run update:phones`
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
const auth = admin.auth();

/**
 * Tạo một số điện thoại ngẫu nhiên của Việt Nam.
 * @returns Một chuỗi string là số điện thoại ngẫu nhiên.
 */
const generateRandomPhoneNumber = (): string => {
    const prefixes = ['090', '091', '093', '094', '098', '086', '088', '032', '033', '034', '035', '036', '037', '038', '039', '070', '079', '077'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    return `${prefix}${suffix}`;
};

/**
 * Chuyển đổi số điện thoại sang định dạng E.164 (+84...).
 * @param phoneNumber - Số điện thoại đầu vào.
 * @returns Số điện thoại định dạng E.164.
 */
const convertToE164 = (phoneNumber: string): string => {
    if (phoneNumber.startsWith('+84')) {
        return phoneNumber;
    }
    if (phoneNumber.startsWith('0')) {
        return `+84${phoneNumber.substring(1)}`;
    }
    return `+84${phoneNumber}`;
};


async function main() {
    try {
        console.log("Bắt đầu quá trình quét và cập nhật số điện thoại...");

        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            console.log("Không tìm thấy người dùng nào trong Firestore.");
            return;
        }
        
        let updatedCount = 0;
        const updatePromises: Promise<any>[] = [];

        console.log(`Tìm thấy ${snapshot.docs.length} người dùng. Đang kiểm tra...`);

        for (const doc of snapshot.docs) {
            const user = doc.data() as User;

            // Bỏ qua nếu đã có số điện thoại
            if (user.phoneNumber && user.phoneNumber.trim() !== '') {
                continue;
            }
            
            // Tạo SĐT mới nếu chưa có
            const newPhoneNumber = generateRandomPhoneNumber();
            updatedCount++;
            console.log(`- Người dùng '${user.displayName}' (UID: ${user.id}) thiếu SĐT. Tạo số mới: ${newPhoneNumber}`);

            // Chuẩn bị cập nhật cho Firestore
            const firestoreUpdatePromise = usersRef.doc(user.id).update({
                phoneNumber: newPhoneNumber
            });
            updatePromises.push(firestoreUpdatePromise);

            // Chuẩn bị cập nhật cho Firebase Auth
            const authUpdatePromise = auth.updateUser(user.id, {
                phoneNumber: convertToE1ika4(newPhoneNumber) // Auth yêu cầu định dạng E.164
            }).catch(err => {
                // Ghi lại lỗi nhưng không dừng script nếu chỉ một user auth bị lỗi
                console.error(`  Lỗi khi cập nhật SĐT trong Auth cho user ${user.id}:`, err.message);
            });
            updatePromises.push(authUpdatePromise);
        }

        if (updatePromises.length > 0) {
            console.log(`\nĐang thực hiện cập nhật cho ${updatedCount} người dùng...`);
            await Promise.all(updatePromises);
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có người dùng nào cần cập nhật số điện thoại.");
        }

        console.log("\n=========================================");
        console.log(`✅ Script đã chạy xong. Đã cập nhật ${updatedCount} người dùng.`);
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình cập nhật:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
