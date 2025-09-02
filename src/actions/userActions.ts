
'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
import * as admin from 'firebase-admin';

// ====================================================================
// KHỐI CODE KHỞI TẠO FIREBASE ADMIN SDK ĐÃ ĐƯỢC SỬA LỖI
// ====================================================================
const initializeFirebaseAdmin = () => {
  // Tránh khởi tạo lại nếu đã có instance
  if (admin.apps.length > 0) {
    return;
  }

  // Sử dụng biến môi trường được cung cấp bởi App Hosting
  const credsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

  if (!credsBase64) {
    console.error("CRITICAL: GOOGLE_APPLICATION_CREDENTIALS_BASE64 env var is not set.");
    throw new Error('Firebase credentials are not configured on the server.');
  }

  try {
    console.log("Decoding Firebase credentials from base64...");
    // Giải mã chuỗi base64 thành chuỗi JSON
    const decodedCreds = Buffer.from(credsBase64, 'base64').toString('utf-8');
    // Parse chuỗi JSON thành object
    const serviceAccount = JSON.parse(decodedCreds);

    console.log("Initializing Firebase Admin SDK for Server Actions...");
    // Khởi tạo Admin SDK với credentials đã được parse
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK for Server Actions initialized successfully.");

  } catch (error: any) {
    console.error("CRITICAL: Failed to initialize Firebase Admin SDK from environment variable. Error:", error.message);
    throw new Error(`Could not initialize Firebase Admin SDK. Error parsing credentials.`);
  }
};


// Gọi hàm khởi tạo một lần khi file này được load trên server.
initializeFirebaseAdmin();

// Lấy các instance của db và auth để sử dụng trong các hàm bên dưới.
const db = admin.firestore();
const auth = admin.auth();
// ====================================================================
// KẾT THÚC KHỐI CODE SỬA LỖI
// ====================================================================

// Hàm tiện ích chuyển đổi số điện thoại sang định dạng E.164
const convertToE164 = (phoneNumber?: string): string | undefined => {
    if (!phoneNumber) return undefined;
    
    // Loại bỏ khoảng trắng
    let cleanNumber = phoneNumber.replace(/\s+/g, '');

    // Nếu đã đúng định dạng E.164, trả về
    if (cleanNumber.startsWith('+')) {
        return cleanNumber;
    }
    
    // Nếu bắt đầu bằng số 0, thay thế bằng +84
    if (cleanNumber.startsWith('0')) {
        return `+84${cleanNumber.substring(1)}`;
    }

    // Nếu bắt đầu bằng 84, thêm dấu +
    if (cleanNumber.startsWith('84')) {
        return `+${cleanNumber}`;
    }

    // Mặc định trả về số đã làm sạch, trường hợp không xác định được
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
            phoneNumber: convertToE164(userData.phoneNumber), // Chuyển đổi SĐT
            disabled: false,
        });

        console.log(`User created in Auth with UID: ${userRecord.uid}. Now creating in Firestore.`);
        const newUser: User = {
            id: userRecord.uid, // Use the UID from Auth as the document ID
            ...userData,
        };

        await db.collection('users').doc(userRecord.uid).set(newUser);
        console.log(`User document created in Firestore with ID: ${userRecord.uid}`);
        
        // The Cloud Function will automatically sync claims from Firestore,
        // so we don't need to explicitly set them here.

        return { success: true, message: "Người dùng đã được tạo thành công.", userId: userRecord.uid };
    } catch (error: any) {
        console.error("Error creating user:", error);
        // Trả về thông báo lỗi thân thiện hơn
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
        // Update Firebase Auth
        await auth.updateUser(id, {
            email: dataToUpdate.username,
            displayName: dataToUpdate.displayName,
            phoneNumber: convertToE164(dataToUpdate.phoneNumber), // Chuyển đổi SĐT
        });
        
        // Update Firestore. The Cloud Function will handle syncing claims.
        await db.collection('users').doc(id).update(dataToUpdate);
        
        console.log(`Successfully updated user: ${id}`);
        return { success: true, message: "Thông tin người dùng đã được cập nhật." };
    } catch (error: any) {
        console.error("Error updating user:", error);
        // Trả về thông báo lỗi thân thiện hơn
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
        // Delete from Firebase Auth
        await auth.deleteUser(userId);

        // Delete from Firestore
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
        const rowIndex = index + 2; // Excel rows are 1-based, and we have a header
        try {
            // Step 1: Check for existing unit by ID
            let unitId = row.unitId;
            const unitDocRef = unitsCollection.doc(unitId);
            const unitDoc = await unitDocRef.get();
            if (unitDoc.exists) {
                // Unit already exists, skip creation
            } else {
                 // Create Unit in Firestore if it doesn't exist
                await unitDocRef.set({
                    id: unitId,
                    name: row.unitName,
                    type: 'commune', // All imports are communes
                    parentId: row.unitParentId || null,
                    address: row.unitAddress || '',
                    headquarters: row.unitHeadquarters || ''
                });
            }

            // Step 2: Check if user already exists in Auth
            try {
                await auth.getUserByEmail(row.userEmail);
                // If it doesn't throw, user exists.
                throw new Error(`Người dùng với email '${row.userEmail}' đã tồn tại trong Authentication.`);
            } catch (error: any) {
                 if (error.code !== 'auth/user-not-found') {
                    // This will catch our custom error from above and other potential issues
                    throw error;
                }
                // If code is 'auth/user-not-found', we can proceed.
            }
            
            // Generate a random phone number if it's missing from the import
            const userPhoneNumber = row.userPhoneNumber || generateRandomPhoneNumber();

            // Step 3: Create User in Authentication
            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                phoneNumber: convertToE164(userPhoneNumber),
                emailVerified: true,
                disabled: false,
            });
            // Let the cloud function handle claims
            
            // Step 4: Create User in Firestore, linking to the unit
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
                // Check for Firebase-specific error codes for more user-friendly messages
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

    