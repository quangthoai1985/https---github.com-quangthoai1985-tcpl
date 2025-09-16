
/* eslint-disable no-console */
import { adminDb as db, adminAuth as auth } from '@/lib/firebase-admin';
import type { User, Unit, AssessmentPeriod, Assessment, Criterion, Document } from '../lib/data';

// ========================================================================================
// IMPORTANT: SETUP INSTRUCTIONS
// ========================================================================================
// 1.  DOWNLOAD SERVICE ACCOUNT KEY:
//     - Go to your Firebase Project Settings > Service accounts.
//     - Click "Generate new private key" and save the JSON file.
//     - RENAME the downloaded file to `service-account-credentials.json`.
//     - MOVE the file to the ROOT directory of this project (the same level as package.json).
//     - **VERY IMPORTANT**: This file gives full admin access to your project.
//       DO NOT commit it to a public repository. It is already listed in .gitignore.
//
// 2.  INITIALIZE FIREBASE ADMIN:
//     - The script will automatically use the `service-account-credentials.json` file.
//
// 3.  RUN THE SCRIPT:
//     - Open your terminal and run the command: `npm run seed:firestore`
// ========================================================================================

// ----------------------------------------------------------------------------------------
// --- MOCK DATA TO SEED ---
// ----------------------------------------------------------------------------------------

const units: Unit[] = [
    { id: 'TINH_AG', name: 'Tỉnh An Giang', type: 'province', parentId: null, address: 'Số 02 Nguyễn Công Trứ, phường Rạch Giá, tỉnh An Giang', headquarters: 'Sở Tư Pháp tỉnh An Giang' },
];

const usersRaw = [
    { email: "admin@angiang.gov.vn", password: "123456", displayName: "Nguyễn Văn Admin", role: "admin", communeId: "TINH_AG" },
];

const assessmentPeriods: AssessmentPeriod[] = [
    // Data has been uploaded by user, keep this empty
];

let assessments: Omit<Assessment, 'submittedBy' | 'approverId'>[] = [
    // Data has been uploaded by user, keep this empty
];

const criteria: Omit<Criterion, 'indicators'> & { indicators: any[] }[] = [
  // Data has been uploaded by user, keep this empty
];

const guidanceDocuments: Document[] = [
  // Data has been uploaded by user, keep this empty
];

// ----------------------------------------------------------------------------------------
// --- SCRIPT LOGIC ---
// ----------------------------------------------------------------------------------------

async function deleteAllUsers() {
    console.log("Step 1: Deleting all existing users from Firebase Auth...");
    try {
        const listUsersResult = await auth.listUsers(1000); // Max 1000 at a time
        const uidsToDelete = listUsersResult.users.map(u => u.uid);

        if (uidsToDelete.length > 0) {
            const result = await auth.deleteUsers(uidsToDelete);
            console.log(`Successfully deleted ${result.successCount} users from Auth.`);
            if (result.failureCount > 0) {
                 result.errors.forEach((err) => {
                    console.log('Failed to delete user:', err.error.toJSON());
                });
            }
        } else {
            console.log("No users found in Auth to delete.");
        }
    } catch (error) {
        console.error("Error listing/deleting users from Auth:", error);
    }
}

async function deleteCollection(collectionPath: string, batchSize: number = 50) {
    console.log(`Deleting all documents from collection '${collectionPath}'...`);
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });

    async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: () => void) {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            console.log(`No more documents found in '${collectionPath}'. Deletion complete.`);
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Deleted ${snapshot.size} documents from '${collectionPath}'.`);

        // Recurse on the next process tick, to avoid
        // exploding the stack.
        process.nextTick(() => {
            deleteQueryBatch(query, resolve);
        });
    }
}


async function seedUsers() {
    console.log("Starting to seed users in Auth and Firestore...");
    const userRecordsForAssessments: User[] = [];

    // Clean slate for users
    await deleteAllUsers();
    await deleteCollection('users');

    const usersCollection = db.collection('users');

    for (const user of usersRaw) {
        try {
            const authRecord = await auth.createUser({
                email: user.email,
                emailVerified: true,
                password: user.password,
                displayName: user.displayName,
                disabled: false,
            });
            console.log(`Successfully created new user in Auth: ${user.email} with UID: ${authRecord.uid}`);
            
            await auth.setCustomUserClaims(authRecord.uid, { role: user.role });

            const firestoreUser: User = {
                id: authRecord.uid,
                username: user.email,
                displayName: user.displayName,
                role: user.role as User['role'],
                communeId: user.communeId,
            };

            const userDocRef = usersCollection.doc(authRecord.uid);
            await userDocRef.set(firestoreUser);
            
            userRecordsForAssessments.push(firestoreUser);
        } catch (error) {
            console.error(`Error processing user ${user.email}:`, error);
        }
    }
    
    console.log(`Successfully seeded ${userRecordsForAssessments.length} users to Auth and Firestore.`);
    return userRecordsForAssessments;
}


async function seedCollection<T extends { id: string }>(collectionName: string, data: T[]) {
  if (data.length === 0) {
    console.log(`Skipping seeding for empty collection "${collectionName}".`);
    return;
  }
  const collectionRef = db.collection(collectionName);
  const batch = db.batch();

  console.log(`Seeding collection "${collectionName}"...`);
  
  // Clean slate for the collection before seeding
  await deleteCollection(collectionName);

  data.forEach(item => {
    const docRef = collectionRef.doc(item.id);
    batch.set(docRef, item);
  });

  await batch.commit();
  console.log(`Successfully seeded ${data.length} documents in "${collectionName}".`);
}

async function main() {
  try {
    console.log("Starting Firestore data seeding process...");
    
    // Step 1: Clean up and seed users and their associated unit atomically
    await seedUsers();
    await seedCollection('units', units);

    // The rest of the data is managed by the user, so we don't seed it.
    // await seedCollection('assessmentPeriods', assessmentPeriods);
    // await seedCollection('criteria', criteria);
    // await seedCollection('guidanceDocuments', guidanceDocuments);
    // await seedCollection('assessments', []);

    console.log("\n=========================================");
    console.log("✅ Firestore seeding script finished.");
    console.log("=========================================");
  } catch (error) {
    console.error("\n========================================");
    console.error("🔥 Error seeding Firestore:", error);
    console.error("========================================");
    process.exit(1);
  }
}

main();
