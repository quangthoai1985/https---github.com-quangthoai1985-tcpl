
'use server';

import type { UnitAndUserImport, User } from '@/lib/data';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK only once.
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account-credentials.json');
    
    // In production on App Hosting, the file should exist.
    // Locally, we also use this file.
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require('../../service-account-credentials.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized using service account file.");
    } else {
        // Fallback for environments where ADC is expected and the file is not present.
        // This might be the case in some CI/CD or other cloud environments.
        console.warn("service-account-credentials.json not found. Attempting to initialize with default credentials.");
        admin.initializeApp();
    }
  } catch (error: any) {
    console.error("CRITICAL: Failed to initialize Firebase Admin SDK in userActions.ts. Error: ", error.message);
    // If initialization fails, subsequent Firestore/Auth calls will fail.
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
            // Step 1: Check for existing unit by ID
            let unitId = row.unitId;
            const unitDocRef = unitsCollection.doc(unitId);
            const unitDoc = await unitDocRef.get();
            if (unitDoc.exists) {
                console.log(`Unit with ID '${unitId}' already exists. Skipping unit creation.`);
            } else {
                 // Step 1.1: Create Unit in Firestore if it doesn't exist
                await unitDocRef.set({
                    id: unitId,
                    name: row.unitName,
                    type: 'commune', // All imports are communes
                    parentId: row.unitParentId || null,
                    address: row.unitAddress || '',
                    headquarters: row.unitHeadquarters || ''
                });
                 console.log(`Created new unit with ID: ${unitId}`);
            }


            // Step 2: Check for existing user by email
            try {
                await auth.getUserByEmail(row.userEmail);
                throw new Error(`Người dùng với email '${row.userEmail}' đã tồn tại trong Authentication.`);
            } catch (error: any) {
                 if (error.code !== 'auth/user-not-found') {
                    // If the error is anything other than 'user-not-found', it's a real problem.
                    throw error;
                }
                // If it is 'auth/user-not-found', we can safely proceed to create the user.
            }
            
            // Step 3: Create User in Authentication
            const userRecord = await auth.createUser({
                email: row.userEmail,
                password: row.userPassword,
                displayName: row.userDisplayName,
                emailVerified: true,
                disabled: false,
            });
            await auth.setCustomUserClaims(userRecord.uid, { role: 'commune_staff' });
            
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error on row ${data.indexOf(row) + 2}:`, errorMessage);

            // Extract the raw server response if it's a Firebase error
            let detailedError = errorMessage;
            if (error.errorInfo) {
                detailedError = JSON.stringify(error.errorInfo);
            } else if (error.cause) {
                detailedError = JSON.stringify(error.cause);
            }
            
            results.errors.push(`Dòng ${data.indexOf(row) + 2}: ${detailedError}`);
        }
    }

    return results;
}
