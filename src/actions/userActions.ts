
'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';


// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // This path is relative to the project root, where the server action runs.
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account-credentials.json');
    
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require('../../service-account-credentials.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized successfully for userActions.");
    } else {
        console.warn("service-account-credentials.json not found. Firebase Admin SDK not initialized for userActions. This is expected in production if using Application Default Credentials.");
        // In a real production environment on Google Cloud, you'd rely on Application Default Credentials.
        // For App Hosting, you might need to use environment variables.
        // For now, we just prevent it from crashing.
         admin.initializeApp();
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK in userActions:", error);
    // In a production environment, you should handle this more gracefully.
    if (admin.apps.length === 0) {
      admin.initializeApp(); // Initialize without credentials to avoid crashing other parts of the app if they depend on the SDK being initialized.
    }
  }
}

const db = admin.firestore();
const auth = admin.auth();

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
            disabled: false,
        });

        console.log(`User created in Auth with UID: ${userRecord.uid}. Now creating in Firestore.`);
        const newUser: User = {
            id: userRecord.uid, // Use the UID from Auth as the document ID
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
        const { id, ...dataToUpdate } = userData;
        if (!id) throw new Error("User ID is required for update.");

        console.log(`Updating user with UID: ${id}`);
        // Update Firebase Auth
        await auth.updateUser(id, {
            email: dataToUpdate.username,
            displayName: dataToUpdate.displayName,
        });
        
        // Update role claim if it has changed
        const currentUserClaims = (await auth.getUser(id)).customClaims;
        if(currentUserClaims?.role !== dataToUpdate.role) {
            await auth.setCustomUserClaims(id, { role: dataToUpdate.role });
        }
        

        // Update Firestore
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

export async function importUnitsAndUsers(data: UnitAndUserImport[]): Promise<{successCount: number, errorCount: number, errors: string[]}> {
    const results = { successCount: 0, errorCount: 0, errors: [] as string[] };
    const unitsCollection = db.collection('units');
    const usersCollection = db.collection('users');

    for (const row of data) {
        try {
            // Step 1: Check for existing unit
            const unitDoc = await unitsCollection.doc(row.unitId).get();
            if (unitDoc.exists) {
                throw new Error(`Đơn vị với ID '${row.unitId}' đã tồn tại.`);
            }

            // Step 2: Check for existing user
            try {
                await auth.getUserByEmail(row.userEmail);
                // If the above line doesn't throw, the user exists
                throw new Error(`Người dùng với email '${row.userEmail}' đã tồn tại trong Authentication.`);
            } catch (error: any) {
                 if (error.code !== 'auth/user-not-found') {
                    // Rethrow if it's not the "user-not-found" error we expect
                    throw error;
                }
                // If it is 'auth/user-not-found', we can proceed.
            }
            
            // Step 3: Create Unit in Firestore
            await unitsCollection.doc(row.unitId).set({
                id: row.unitId,
                name: row.unitName,
                type: 'commune', // Assuming all imports are communes for now
                parentId: row.unitParentId || null,
                address: row.unitAddress || '',
                headquarters: row.unitHeadquarters || ''
            });

            // Step 4: Create User in Authentication
            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                emailVerified: true,
                disabled: false,
            });
            await auth.setCustomUserClaims(userRecord.uid, { role: 'commune_staff' });
            
            // Step 5: Create User in Firestore
            const firestoreUser: User = {
                id: userRecord.uid,
                username: row.userEmail,
                displayName: row.userDisplayName,
                role: 'commune_staff',
                communeId: row.unitId,
            };
            await usersCollection.doc(userRecord.uid).set(firestoreUser);
            
            results.successCount++;
        } catch (error: any) {
            results.errorCount++;
            results.errors.push(`Dòng ${data.indexOf(row) + 2}: ${error.message}`);
        }
    }

    return results;
}
