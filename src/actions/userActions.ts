// File: src/actions/userActions.ts

'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
import * as admin from 'firebase-admin';

// ======================= START OF FIXED CODE =======================

// A function to initialize Firebase Admin SDK idempotently and for different environments.
const initializeFirebaseAdmin = () => {
  // Check if the app is already initialized to avoid re-initialization
  if (admin.apps.length > 0) {
    return admin.app();
  }

  console.log("Attempting to initialize Firebase Admin SDK...");

  // Check if running in a Google Cloud environment (like Cloud Functions, Cloud Run)
  // VERCEL_ENV is a common variable on Vercel, adjust if using another platform
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    // In production, rely on Application Default Credentials
    console.log("Production environment detected. Initializing with default credentials.");
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully in production.");
    return admin.app();
  } else {
    // In local development, use the Base64 encoded service account
    console.log("Local environment detected. Initializing with Base64 credentials.");
    try {
      const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
      
      if (!serviceAccountBase64) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_BASE64 is not set in your .env.local file.');
      }

      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin SDK initialized successfully for local development.");
      return admin.app();
    } catch (error: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin SDK for local development.", error.message);
      throw new Error("Could not initialize Firebase Admin SDK. Check your .env.local and Base64 string.");
    }
  }
};

// ======================== END OF FIXED CODE ========================


// Get db and auth instances safely
const getDb = () => {
    initializeFirebaseAdmin();
    return admin.firestore();
};

const getAuth = () => {
    initializeFirebaseAdmin();
    return admin.auth();
};


type ServerActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
};

export async function createUser(userData: Omit<User, 'id'>, password: string): Promise<ServerActionResult> {
    try {
        const auth = getAuth();
        const db = getDb();
        
        console.log(`Creating user with email: ${userData.username}`);
        const userRecord = await auth.createUser({
            email: userData.username,
            emailVerified: true,
            password: password,
            displayName: userData.displayName,
            phoneNumber: userData.phoneNumber,
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
        return { success: false, error: error.message || "Không thể tạo người dùng." };
    }
}


export async function updateUser(userData: User): Promise<ServerActionResult> {
    try {
        const auth = getAuth();
        const db = getDb();
        const { id, ...dataToUpdate } = userData;
        if (!id) throw new Error("User ID is required for update.");

        console.log(`Updating user with UID: ${id}`);
        await auth.updateUser(id, {
            email: dataToUpdate.username,
            displayName: dataToUpdate.displayName,
            phoneNumber: dataToUpdate.phoneNumber,
        });
        
        await db.collection('users').doc(id).update(dataToUpdate);
        
        console.log(`Successfully updated user: ${id}`);
        return { success: true, message: "Thông tin người dùng đã được cập nhật." };
    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: error.message || "Không thể cập nhật người dùng." };
    }
}

export async function deleteUser(userId: string): Promise<ServerActionResult> {
    try {
        const auth = getAuth();
        const db = getDb();
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
        const auth = getAuth();
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

export async function importUnitsAndUsers(data: UnitAndUserImport[]): Promise<{successCount: number, errorCount: number, errors: string[]}> {
    const auth = getAuth();
    const db = getDb();
    const results = { successCount: 0, errorCount: 0, errors: [] as string[] };
    const unitsCollection = db.collection('units');
    const usersCollection = db.collection('users');

    for (const [index, row] of data.entries()) {
        const rowIndex = index + 2;
        try {
            // ... (Phần logic import giữ nguyên, không cần thay đổi)
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
            
            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                emailVerified: true,
                disabled: false,
            });
            
            const firestoreUser: User = {
                id: userRecord.uid,
                username: row.userEmail,
                displayName: row.userDisplayName,
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