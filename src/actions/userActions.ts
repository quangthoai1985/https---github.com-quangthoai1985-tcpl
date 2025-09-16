'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
// ✅ Bước 1: Import các đối tượng đã được khởi tạo an toàn từ file quản lý.
// Chúng ta đổi tên 'adminDb' thành 'db' và 'adminAuth' thành 'auth' ngay tại đây để sử dụng tiện lợi.
import { adminDb as db, adminAuth as auth } from '@/lib/firebase-admin';

// ✅ Bước 2: XÓA TOÀN BỘ khối code khởi tạo Firebase Admin.
// File này không còn trách nhiệm khởi tạo nữa.

// ====================================================================
// TOÀN BỘ CÁC HÀM LOGIC CỦA BẠN SẼ NẰM Ở ĐÂY VÀ KHÔNG CẦN THAY ĐỔI GÌ CẢ
// vì chúng vẫn sử dụng các biến 'db' và 'auth' như cũ.
// ====================================================================

// Hàm tiện ích chuyển đổi số điện thoại sang định dạng E.164
const convertToE164 = (phoneNumber?: string): string | undefined => {
    if (!phoneNumber) return undefined;
    let cleanNumber = phoneNumber.replace(/\s+/g, '');
    if (cleanNumber.startsWith('+')) return cleanNumber;
    if (cleanNumber.startsWith('0')) return `+84${cleanNumber.substring(1)}`;
    if (cleanNumber.startsWith('84')) return `+${cleanNumber}`;
    return cleanNumber;
};

type ServerActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
};

export async function createUser(userData: Omit<User, 'id'>, password: string): Promise<ServerActionResult> {
    try {
        console.log(`Creating user with email: ${userData.username}`);
        const userRecord = await auth.createUser({
            email: userData.username,
            emailVerified: true,
            password: password,
            displayName: userData.displayName,
            phoneNumber: convertToE164(userData.phoneNumber),
            disabled: false,
        });

        console.log(`User created in Auth with UID: ${userRecord.uid}. Now creating in Firestore.`);
        const newUser: User = {
            id: userRecord.uid,
            ...userData,
        };

        await db.collection('users').doc(userRecord.uid).set(newUser);
        console.log(`User document created in Firestore with ID: ${userRecord.uid}`);
        
        return { success: true, message: "Người dùng đã được tạo thành công.", userId: userRecord.uid };
    } catch (error: any) {
        console.error("Error creating user:", error);
        if (error.code === 'auth/invalid-phone-number') {
            return { success: false, error: 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.' };
        }
        return { success: false, error: error.message || "Không thể tạo người dùng." };
    }
}

export async function updateUser(userData: User): Promise<ServerActionResult> {
    try {
        const { id, ...dataToUpdate } = userData;
        if (!id) throw new Error("User ID is required for update.");

        console.log(`Updating user with UID: ${id}`);
        await auth.updateUser(id, {
            email: dataToUpdate.username,
            displayName: dataToUpdate.displayName,
            phoneNumber: convertToE164(dataToUpdate.phoneNumber),
        });
        
        await db.collection('users').doc(id).update(dataToUpdate);
        
        console.log(`Successfully updated user: ${id}`);
        return { success: true, message: "Thông tin người dùng đã được cập nhật." };
    } catch (error: any) {
        console.error("Error updating user:", error);
        if (error.code === 'auth/invalid-phone-number') {
            return { success: false, error: 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.' };
        }
        return { success: false, error: error.message || "Không thể cập nhật người dùng." };
    }
}

export async function deleteUser(userId: string): Promise<ServerActionResult> {
    try {
        if (!userId) throw new Error("User ID is required for deletion.");
        
        console.log(`Deleting user with UID: ${userId}`);
        await auth.deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        
        console.log(`Successfully deleted user: ${userId}`);
        return { success: true, message: "Người dùng đã được xóa." };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message || "Không thể xóa người dùng." };
    }
}

export async function resetUserPassword(userId: string, newPassword: string):Promise<ServerActionResult> {
    try {
        if (!userId || !newPassword) throw new Error("User ID and new password are required.");
        
        console.log(`Resetting password for user UID: ${userId}`);
        await auth.updateUser(userId, {
            password: newPassword,
        });

        console.log(`Successfully reset password for user: ${userId}`);
        return { success: true, message: "Mật khẩu đã được đặt lại thành công." };
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return { success: false, error: error.message || "Không thể đặt lại mật khẩu." };
    }
}

const generateRandomPhoneNumber = (): string => {
    const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099', '086', '088', '089', '032', '033', '034', '035', '036', '037', '038', '039', '070', '079', '077', '076', '078', '081', '082', '083', '084', '085', '056', '058', '059'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString().substring(1);
    return `${prefix}${suffix}`;
};

export async function importUnitsAndUsers(data: UnitAndUserImport[]): Promise<{successCount: number, errorCount: number, errors: string[]}> {
    const results = { successCount: 0, errorCount: 0, errors: [] as string[] };
    const unitsCollection = db.collection('units');
    const usersCollection = db.collection('users');

    for (const [index, row] of data.entries()) {
        const rowIndex = index + 2;
        try {
            let unitId = row.unitId;
            const unitDocRef = unitsCollection.doc(unitId);
            const unitDoc = await unitDocRef.get();
            if (!unitDoc.exists) {
                await unitDocRef.set({
                    id: unitId,
                    name: row.unitName,
                    type: 'commune',
                    parentId: row.unitParentId || null,
                    address: row.unitAddress || '',
                    headquarters: row.unitHeadquarters || ''
                });
            }

            try {
                await auth.getUserByEmail(row.userEmail);
                throw new Error(`Người dùng với email '${row.userEmail}' đã tồn tại trong Authentication.`);
            } catch (error: any) {
                 if (error.code !== 'auth/user-not-found') {
                    throw error;
                }
            }
            
            const userPhoneNumber = row.userPhoneNumber || generateRandomPhoneNumber();

            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                phoneNumber: convertToE164(userPhoneNumber),
                emailVerified: true,
                disabled: false,
            });
            
            const firestoreUser: User = {
                id: userRecord.uid,
                username: row.userEmail,
                displayName: row.userDisplayName,
                phoneNumber: userPhoneNumber,
                role: 'commune_staff',
                communeId: unitId,
            };
            await usersCollection.doc(userRecord.uid).set(firestoreUser);
            
            results.successCount++;
        } catch (error: any) {
            results.errorCount++;
            let errorMessage = "Lỗi không xác định.";
            if (error instanceof Error) {
                if ('code' in error && typeof error.code === 'string') {
                    switch (error.code) {
                        case 'auth/invalid-email':
                            errorMessage = `Email '${row.userEmail}' không hợp lệ.`;
                            break;
                        case 'auth/email-already-exists':
                             errorMessage = `Email '${row.userEmail}' đã được sử dụng.`;
                             break;
                        case 'auth/weak-password':
                             errorMessage = `Mật khẩu quá yếu. Phải có ít nhất 6 ký tự.`;
                             break;
                        case 'auth/invalid-phone-number':
                             errorMessage = `Số điện thoại '${row.userPhoneNumber}' không hợp lệ.`;
                             break;
                        default:
                             errorMessage = error.message;
                    }
                } else {
                     errorMessage = error.message;
                }
            }
            const finalError = `Dòng ${rowIndex}: ${errorMessage}`;
            console.error(finalError);
            results.errors.push(finalError);
        }
    }

    return results;
}
