
'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
import * as admin from 'firebase-admin';

// Directly use credentials to avoid file system issues in serverless environments.
const serviceAccount = {
  "type": "service_account",
  "project_id": "chuan-tiep-can-pl",
  "private_key_id": "8a9d778a616c5f5ff03bc2c309e238ffbbe8490e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCaZK4ywKWVJmFQ\niL2Fuv0JXWXzrW1KyQsTQHo0sA6qztFxFMEbnA//ltIUyTFrXbBDpOmyP8cOmCPl\nVfU97QRc4hM/Inu1Z+viIgWG2TDOrjOViCOLiJXs6pdsrLNJG9JV8oTHjuwOkq3z\n3B80rk/yf6854zH83/rjU2zKV+SS7bm0BcX3If2ALQ/2Z2UBrO+Cn5PCYbSOxYiS\nnHGwP7U9uiypB5PAan0MafHoGnrHrC3slAWblsrJ1kgyx83fKAwy0f/gL3h5CMge\ncYwDpyNFQNBUI7L9Rd1BHOz8ehtQqbeaC9YBuPA6cEA40jz3Cj4feJyzCHgnOhR2\n7M4wx9brAgMBAAECggEAGTlHqG0G4FYz4edlJzsEagpDRMtZprUvxQZssLzuuIMv\nfo0Ie41Eo9otGk5Ab60Pxg1kTMXUrJK4kpg3h9V4OACLam4kzd9bj0dFpeFH8wxM\nyypBvGMlM16kPJH+fHw6IeaMQNodwMe/+a5FvuKXlyO7KfbvTMP/BjKz/F7drg89\nkGt07jA+4WYpSl9SKa8y5X2oDWMiu36s64lE4WSeTgCAzJG3F5MQnsO3ByXXMnHW\nmc+7SvOjtkw+eQTaDOUjY55tJmfUspnwOmjDjfSVoHiDhME96UizeSra+cA8j/pB\n7/s35Hn18VFGA1RKztnJyc5KCicvsYBS3SpoUWBxOQKBgQDR1g3kt9Lsm7IZ+/CY\nP3O3sUh2QpWgjRhUWYdmcDA0eMeEZgcop8mOuV/gyP4yiNJ2FgqscqUIV+mM4IB+\n1VB/igVnEHC56D5+jEbaA3p1+SZH+sh22FpXaSv2OUnW0wxp/rW+JhMPwCYG/kB9\nxtQV5Z0NVvjNiw1Trio6teXxfQKBgQC8XBdDyYanda6pKwKDwzgUlRlLw2KWD0V5\naYrcRqXOUTTFpRcj+25nw+iTEszYpxJPn98Jqwm/uIfi9QwbYDkLxMEBnHu/S+Q1\nnz7aGpFALC5Ue5OlSTlatrkVcqftdGPBOlTUOZ280mRA0U/fZCEBem+EKMsrTIgU\nN4z1j/PWhwKBgEUZFNglRFrP5nUyBodMFcH+qhrvUDBfZgyYssKj3OvaffD2XBMi\nNXg/SPhPl41yisOB/J/O3NODh4/xeb7KZcip3Z+TxVsixDmN3eL61D+2/MklJxAj\nrJQuOODK+qq4MtVQn+5uwUYlgyA4Z2pDqCFRzEbRRfsBeDD/ID7XGVJNAoGBAIHh\nZlFhtq3l4cfYVmWQySy4Grc5RNOAOEGd2xhExrPbHu5iBfDTwK9gURCI2CNUILYy\n4NKD07cVgO2oVu7RjMRmqUd5JYMky3mGEwrFYv7C+Ddc9tP0B85bTIhThSOhK9/j\nXvbvu6ql0Gc5bT/2hSPFzvtsPZvfq711CIeS+WolAoGBAK4/BqdjufY8l93IzJqD\nzQ52jj0TlFY/7buPpfiQYrCb2PUEaHwOh/lWQf7TWLT7YIBnSWMEgVBbKtlQOy/P\nCoOB9IIQrGIrzz9QWNoRC9tCwISC/6H1zjk2woYp67eJT+3HPzdeY6QHAGhIER0v\nGa+rYS6aKDW2SpFG+qEvjufe\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  "client_email": "firebase-adminsdk-fbsvc@chuan-tiep-can-pl.iam.gserviceaccount.com",
  "client_id": "114893684062523637158",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40chuan-tiep-can-pl.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// A function to initialize Firebase Admin SDK idempotently.
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin SDK. Error: ", error.message);
      // Re-throw or handle as critical failure
      throw new Error("Could not initialize Firebase Admin SDK.");
    }
  }
}

// Ensure initialization before getting db and auth instances.
initializeFirebaseAdmin();
const db = admin.firestore();
const auth = admin.auth();

type ServerActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
};

export async function createUser(userData: Omit<User, 'id'>, password: string): Promise<ServerActionResult> {
    initializeFirebaseAdmin();
    try {
        console.log(`Creating user with email: ${userData.username}`);
        const userRecord = await auth.createUser({
            email: userData.username,
            emailVerified: true,
            password: password,
            displayName: userData.displayName,
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
        // await auth.setCustomUserClaims(userRecord.uid, { role: userData.role });

        return { success: true, message: "Người dùng đã được tạo thành công.", userId: userRecord.uid };
    } catch (error: any) {
        console.error("Error creating user:", error);
        return { success: false, error: error.message || "Không thể tạo người dùng." };
    }
}


export async function updateUser(userData: User): Promise<ServerActionResult> {
    initializeFirebaseAdmin();
    try {
        const { id, ...dataToUpdate } = userData;
        if (!id) throw new Error("User ID is required for update.");

        console.log(`Updating user with UID: ${id}`);
        // Update Firebase Auth
        await auth.updateUser(id, {
            email: dataToUpdate.username,
            displayName: dataToUpdate.displayName,
        });
        
        // Update Firestore. The Cloud Function will handle syncing claims.
        await db.collection('users').doc(id).update(dataToUpdate);
        
        console.log(`Successfully updated user: ${id}`);
        return { success: true, message: "Thông tin người dùng đã được cập nhật." };
    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: error.message || "Không thể cập nhật người dùng." };
    }
}

export async function deleteUser(userId: string): Promise<ServerActionResult> {
    initializeFirebaseAdmin();
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
    initializeFirebaseAdmin();
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

export async function importUnitsAndUsers(data: UnitAndUserImport[]): Promise<{successCount: number, errorCount: number, errors: string[]}> {
    initializeFirebaseAdmin();
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
            
            // Step 3: Create User in Authentication
            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                emailVerified: true,
                disabled: false,
            });
            // Let the cloud function handle claims
            
            // Step 4: Create User in Firestore, linking to the unit
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
