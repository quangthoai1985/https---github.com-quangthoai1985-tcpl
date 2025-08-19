
/* eslint-disable no-console */
import * as admin from 'firebase-admin';

// ========================================================================================
// SCRIPT XÓA DỮ LIỆU CẤP XÃ
// ========================================================================================
// MỤC ĐÍCH:
// - Xóa tất cả người dùng có vai trò 'commune_staff' khỏi Firebase Authentication và Firestore.
// - Xóa tất cả các đơn vị có loại 'commune' khỏi Firestore.
// - Giữ lại người dùng 'admin' và các đơn vị cấp cao hơn (tỉnh, huyện).
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo file `service-account-credentials.json` tồn tại ở thư mục gốc.
// 2. Mở terminal và chạy lệnh: `npm run cleanup`
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
 * Xóa tất cả các document trong một collection con theo một query.
 * @param query - Query để lấy các document cần xóa.
 * @param batchSize - Số lượng document xóa trong một lần.
 */
async function deleteQueryBatch(query: admin.firestore.Query, batchSize: number) {
    const snapshot = await query.limit(batchSize).get();

    if (snapshot.size === 0) {
        return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
}

async function main() {
    try {
        console.log("Bắt đầu quá trình dọn dẹp dữ liệu cấp xã...");

        // --- BƯỚC 1: TÌM VÀ XÓA NGƯỜI DÙNG 'commune_staff' ---
        console.log("\n[1/3] Đang tìm người dùng cấp xã trong Firestore...");
        const usersRef = db.collection('users');
        const communeUsersQuery = usersRef.where('role', '==', 'commune_staff');
        const usersSnapshot = await communeUsersQuery.get();

        const communeUsers = usersSnapshot.docs.map(doc => doc.data());
        const uidsToDelete = communeUsers.map(user => user.id);

        if (uidsToDelete.length === 0) {
            console.log("Không tìm thấy người dùng cấp xã nào để xóa.");
        } else {
            console.log(`Tìm thấy ${uidsToDelete.length} người dùng cấp xã. Bắt đầu xóa...`);
            
            // Xóa người dùng khỏi Firebase Authentication
            try {
                const deleteResult = await auth.deleteUsers(uidsToDelete);
                console.log(`- Đã xóa thành công ${deleteResult.successCount} người dùng khỏi Authentication.`);
                if (deleteResult.failureCount > 0) {
                    console.warn(`- Xóa thất bại ${deleteResult.failureCount} người dùng khỏi Authentication.`);
                }
            } catch (error) {
                console.error("Lỗi khi xóa người dùng khỏi Authentication:", error);
            }

            // Xóa người dùng khỏi Firestore
            let deletedCount = 0;
            const query = usersRef.where('role', '==', 'commune_staff');
            while (true) {
                const numDeleted = await deleteQueryBatch(query, 100);
                deletedCount += numDeleted;
                if (numDeleted === 0) break;
            }
            console.log(`- Đã xóa ${deletedCount} người dùng khỏi collection 'users' trong Firestore.`);
        }

        // --- BƯỚC 2: XÓA CÁC ĐƠN VỊ CẤP XÃ ---
        console.log("\n[2/3] Đang tìm và xóa các đơn vị cấp xã (commune)...");
        const unitsRef = db.collection('units');
        const communeUnitsQuery = unitsRef.where('type', '==', 'commune');
        
        let deletedUnitsCount = 0;
        while (true) {
            const numDeleted = await deleteQueryBatch(communeUnitsQuery, 100);
            deletedUnitsCount += numDeleted;
            if (numDeleted === 0) break;
        }

        if (deletedUnitsCount > 0) {
            console.log(`- Đã xóa ${deletedUnitsCount} đơn vị cấp xã khỏi collection 'units'.`);
        } else {
            console.log("- Không tìm thấy đơn vị cấp xã nào để xóa.");
        }

        console.log("\n[3/3] Quá trình dọn dẹp hoàn tất.");
        console.log("\n=========================================");
        console.log("✅ Script đã chạy xong.");
        console.log("=========================================");

    } catch (error) {
        console.error("\n========================================");
        console.error("🔥 Đã xảy ra lỗi trong quá trình dọn dẹp:", error);
        console.error("========================================");
        process.exit(1);
    }
}

main();
