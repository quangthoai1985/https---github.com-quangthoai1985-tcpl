
/* eslint-disable no-console */
import { adminDb as db, adminAuth as auth } from '@/lib/firebase-admin';
import type { User } from '../lib/data';

// ========================================================================================
// SCRIPT CẬP NHẬT HỌ VÀ TÊN
// ========================================================================================
// MỤC ĐÍCH:
// - Quét tất cả người dùng có vai trò 'commune_staff' trong Firestore.
// - Tạo một họ tên tiếng Việt ngẫu nhiên.
// - Cập nhật họ tên mới đó vào cả Firestore và Firebase Authentication.
// - Bỏ qua người dùng có vai trò 'admin'.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run update:names`
// ========================================================================================


/**
 * Tạo một họ tên tiếng Việt ngẫu nhiên.
 * @returns Một chuỗi string là họ tên đầy đủ.
 */
const generateRandomFullName = (): string => {
    const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Phan', 'Trương', 'Bùi', 'Đặng', 'Đỗ', 'Ngô', 'Hồ', 'Dương'];
    const middleNames = ['Văn', 'Thị', 'Hữu', 'Minh', 'Thanh', 'Ngọc', 'Đức', 'Xuân', 'Gia', 'Bảo', 'Quốc', 'Tuấn'];
    const firstNames = ['An', 'Bình', 'Anh', 'Châu', 'Dũng', 'Giang', 'Hải', 'Hòa', 'Hùng', 'Huy', 'Khánh', 'Linh', 'Long', 'Minh', 'Nam', 'Nga', 'Ngân', 'Phúc', 'Phương', 'Quân', 'Sơn', 'Tâm', 'Thắng', 'Trang', 'Tú', 'Việt'];

    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    
    return `${lastName} ${middleName} ${firstName}`;
};


async function main() {
    try {
        console.log("Bắt đầu quá trình quét và cập nhật họ tên người dùng...");

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
            
            // Bỏ qua admin
            if (user.role === 'admin') {
                console.log(`- Bỏ qua người dùng admin: '${user.displayName}'`);
                continue;
            }
            
            // Tạo tên mới
            const newDisplayName = generateRandomFullName();
            updatedCount++;
            console.log(`- Cập nhật tên cho '${user.displayName}' (UID: ${user.id}) thành '${newDisplayName}'`);

            // Chuẩn bị cập nhật cho Firestore
            const firestoreUpdatePromise = usersRef.doc(user.id).update({
                displayName: newDisplayName
            });
            updatePromises.push(firestoreUpdatePromise);

            // Chuẩn bị cập nhật cho Firebase Auth
            const authUpdatePromise = auth.updateUser(user.id, {
                displayName: newDisplayName
            }).catch(err => {
                // Ghi lại lỗi nhưng không dừng script nếu chỉ một user auth bị lỗi
                console.error(`  Lỗi khi cập nhật tên trong Auth cho user ${user.id}:`, err.message);
            });
            updatePromises.push(authUpdatePromise);
        }

        if (updatePromises.length > 0) {
            console.log(`\nĐang thực hiện cập nhật cho ${updatedCount} người dùng...`);
            await Promise.all(updatePromises);
            console.log("Tất cả các cập nhật đã hoàn tất.");
        } else {
            console.log("\nKhông có người dùng nào (ngoài admin) cần cập nhật tên.");
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
