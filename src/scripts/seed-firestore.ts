
/* eslint-disable no-console */
import * as admin from 'firebase-admin';
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

try {
    const serviceAccount = require('../../service-account-credentials.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
} catch (error) {
    if (admin.apps.length === 0) {
        console.error("Could not initialize Firebase Admin SDK. Make sure service-account-credentials.json is in the root directory.");
        process.exit(1);
    }
}


const db = admin.firestore();
const auth = admin.auth();

// ----------------------------------------------------------------------------------------
// --- MOCK DATA TO SEED ---
// ----------------------------------------------------------------------------------------

const units: Unit[] = [
    { id: 'TINH_HN', name: 'Thành phố Hà Nội', type: 'province', parentId: null, address: 'Hà Nội, Việt Nam', headquarters: 'Số 12 Lê Lai, Hoàn Kiếm, Hà Nội' },
    { id: 'QUAN_HBT', name: 'Quận Hai Bà Trưng', type: 'district', parentId: 'TINH_HN', address: 'Hai Bà Trưng, Hà Nội', headquarters: 'Số 3 Tạ Quang Bửu, Hai Bà Trưng' },
    { id: 'PHUONG_BK', name: 'Phường Bách Khoa', type: 'commune', parentId: 'QUAN_HBT', address: 'Phường Bách Khoa, Hai Bà Trưng, Hà Nội', headquarters: 'Số 1 Trần Đại Nghĩa, Bách Khoa' },
    { id: 'HUYEN_TT', name: 'Huyện Thanh Trì', type: 'district', parentId: 'TINH_HN', address: 'Thanh Trì, Hà Nội', headquarters: 'Số 1 Cầu Bươu, Thanh Trì' },
    { id: 'XA_TT', name: 'Xã Tân Triều', type: 'commune', parentId: 'HUYEN_TT', address: 'Xã Tân Triều, Thanh Trì, Hà Nội', headquarters: 'Ủy ban Nhân dân xã Tân Triều' },
    { id: 'QUAN_CG', name: 'Quận Cầu Giấy', type: 'district', parentId: 'TINH_HN', address: 'Cầu Giấy, Hà Nội', headquarters: 'Số 68 Cầu Giấy, Cầu Giấy' },
    { id: 'PHUONG_DVH', name: 'Phường Dịch Vọng Hậu', type: 'commune', parentId: 'QUAN_CG', address: 'Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội', headquarters: 'Số 2 Dịch Vọng Hậu' },
    { id: 'HUYEN_HD', name: 'Huyện Hoài Đức', type: 'district', parentId: 'TINH_HN', address: 'Hoài Đức, Hà Nội', headquarters: 'Thị trấn Trôi, Hoài Đức' },
    { id: 'XA_AK', name: 'Xã An Khánh', type: 'commune', parentId: 'HUYEN_HD', address: 'Xã An Khánh, Hoài Đức, Hà Nội', headquarters: 'Ủy ban Nhân dân xã An Khánh' },
];

const usersRaw = [
    { email: "admin@angiang.gov.vn", password: "password123", displayName: "Nguyễn Văn Admin", role: "admin", communeId: "" },
    { email: "chaudoc@angiang.gov.vn", password: "password123", displayName: "Trần Thị Cán bộ", role: "commune_staff", communeId: "PHUONG_BK" },
    { email: "user02@example.com", password: "password123", displayName: "Lê Văn Cán bộ", role: "commune_staff", communeId: "XA_TT" },
    { email: "user03@example.com", password: "password123", displayName: "Phạm Thị Cán bộ", role: "commune_staff", communeId: "PHUONG_DVH" },
    { email: "user04@example.com", password: "password123", displayName: "Hoàng Văn Cán bộ", role: "commune_staff", communeId: "XA_AK" },
];

const assessmentPeriods: AssessmentPeriod[] = [
    { id: 'DOT001', name: 'Đợt đánh giá 6 tháng đầu năm 2024', startDate: '01/01/2024', endDate: '30/07/2024', isActive: true },
    { id: 'DOT002', name: 'Đợt đánh giá 6 tháng cuối năm 2023', startDate: '01/07/2023', endDate: '31/12/2023', isActive: false },
];

// We will populate assessments after users are created to get their UIDs
let assessments: Omit<Assessment, 'submittedBy'>[] = [
    { id: 'ASMT001', communeId: "PHUONG_BK", assessmentPeriodId: 'DOT001', status: "pending_review", submissionDate: "20/07/2024" },
    { id: 'ASMT002', communeId: "XA_TT", assessmentPeriodId: 'DOT001', status: "approved", submissionDate: "19/07/2024", approvalDate: '21/07/2024' },
    { id: 'ASMT003', communeId: "PHUONG_DVH", assessmentPeriodId: 'DOT001', status: "rejected", submissionDate: "19/07/2024", rejectionReason: "Minh chứng cho Chỉ tiêu 2.2 không hợp lệ." },
    { id: 'ASMT004', communeId: "XA_AK", assessmentPeriodId: 'DOT001', status: 'draft' },
    // Data for previous assessment period
    { id: 'ASMT005', communeId: "PHUONG_BK", assessmentPeriodId: 'DOT002', status: "approved", submissionDate: "15/12/2023", approvalDate: '18/12/2023' },
    { id: 'ASMT006', communeId: "XA_TT", assessmentPeriodId: 'DOT002', status: "approved", submissionDate: "14/12/2023", approvalDate: '18/12/2023' },
];

const criteria: Omit<Criterion, 'indicators'> & { indicators: Indicator[] }[] = [
  {
    id: 'TC01',
    name: 'Tiêu chí 1: Công khai, minh bạch, dễ tiếp cận thông tin',
    description: 'Đánh giá việc công khai, minh bạch thông tin của chính quyền cơ sở.',
    indicators: [
      {
        id: 'CT1.1',
        name: 'Chỉ tiêu 1: Công khai thông tin theo quy định của Luật Tiếp cận thông tin',
        description: 'Đánh giá việc công khai các thông tin mà cơ quan nhà nước có trách nhiệm công khai theo quy định pháp luật.',
        standardLevel: 'Đạt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Danh mục các thông tin đã được công khai, hình ảnh chụp màn hình trang thông tin điện tử, hoặc các văn bản công khai khác.'
      },
      {
        id: 'CT1.2',
        name: 'Chỉ tiêu 2: Cung cấp thông tin theo yêu cầu',
        description: 'Đánh giá tỷ lệ yêu cầu cung cấp thông tin của công dân, tổ chức được giải quyết đúng hạn.',
        standardLevel: '>= 90%',
        inputType: 'number',
        calculationFormula: '(Số yêu cầu được giải quyết đúng hạn / Tổng số yêu cầu đã nhận) * 100',
        evidenceRequirement: 'Sổ theo dõi hoặc báo cáo tổng hợp về việc tiếp nhận và giải quyết yêu cầu cung cấp thông tin.'
      },
    ]
  },
  {
    id: 'TC02',
    name: 'Tiêu chí 2: Hạ tầng, thiết bị và ứng dụng công nghệ thông tin',
    description: 'Đánh giá về cơ sở vật chất, kỹ thuật cho việc tiếp cận pháp luật.',
    indicators: [
      {
        id: 'CT2.1',
        name: 'Chỉ tiêu 1: Trang thông tin điện tử của xã',
        description: 'Đảm bảo trang thông tin điện tử của xã có đầy đủ các chuyên mục, chức năng theo quy định và hoạt động ổn định.',
        standardLevel: 'Đạt',
        inputType: 'select',
        calculationFormula: null,
        evidenceRequirement: 'Địa chỉ URL của trang thông tin điện tử. Báo cáo tự đánh giá về các chuyên mục và chức năng.'
      },
      {
        id: 'CT2.2',
        name: 'Chỉ tiêu 2: Hệ thống loa truyền thanh',
        description: 'Kiểm tra tình trạng hoạt động và phạm vi phủ sóng của hệ thống loa truyền thanh cơ sở.',
        standardLevel: 'Hoạt động tốt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Biên bản kiểm tra tình trạng kỹ thuật, hình ảnh hệ thống loa.'
      },
    ]
  },
   {
    id: 'TC03',
    name: 'Tiêu chí 3: Dân chủ ở cơ sở và hòa giải ở cơ sở',
    description: 'Đánh giá việc thực thi dân chủ và hiệu quả hòa giải.',
    indicators: [
      {
        id: 'CT3.1',
        name: 'Chỉ tiêu 1: Thực hiện dân chủ ở cơ sở',
        description: 'Đánh giá việc tổ chức các cuộc họp, đối thoại định kỳ với nhân dân và công khai các nội dung theo quy chế dân chủ ở cơ sở.',
        standardLevel: 'Đạt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Biên bản các cuộc họp, hình ảnh, báo cáo thực hiện quy chế dân chủ.'
      },
      {
        id: 'CT3.2',
        name: 'Chỉ tiêu 2: Hoạt động hòa giải ở cơ sở',
        description: 'Tỷ lệ vụ việc hòa giải thành công trên tổng số vụ việc được đưa ra hòa giải tại cơ sở.',
        standardLevel: '>= 80%',
        inputType: 'number',
        calculationFormula: '(Số vụ hòa giải thành / Tổng số vụ hòa giải) * 100',
        evidenceRequirement: 'Sổ theo dõi, báo cáo thống kê của các tổ hòa giải.'
      },
    ]
  },
];

const guidanceDocuments: Document[] = [
  { id: 'VB001', name: 'Quyết định số 25/2021/QĐ-TTg về xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật', number: '25/2021/QĐ-TTg', issueDate: '22/07/2021', excerpt: 'Quy định về tiêu chí xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật và việc đánh giá, công nhận xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật.' },
  { id: 'VB002', name: 'Thông tư số 09/2021/TT-BTP hướng dẫn thi hành Quyết định số 25/2021/QĐ-TTg', number: '09/2021/TT-BTP', issueDate: '15/11/2021', excerpt: 'Hướng dẫn chi tiết về nội dung các tiêu chí tiếp cận pháp luật, quy trình đánh giá, và biểu mẫu sử dụng.' },
];

// ----------------------------------------------------------------------------------------
// --- SCRIPT LOGIC ---
// ----------------------------------------------------------------------------------------

async function seedUsers() {
    console.log("Starting to seed users in Auth and Firestore...");
    const userRecords: User[] = [];
    const adminUids: string[] = [];
    
    for (const user of usersRaw) {
        try {
            // Check if user already exists in Auth
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(user.email);
                console.log(`User ${user.email} already exists in Auth. UID: ${userRecord.uid}. Skipping Auth creation.`);
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    // User does not exist, create them
                    userRecord = await auth.createUser({
                        email: user.email,
                        emailVerified: true,
                        password: user.password,
                        displayName: user.displayName,
                        disabled: false,
                    });
                    console.log(`Successfully created new user in Auth: ${user.email} with UID: ${userRecord.uid}`);
                } else {
                    throw error; // Re-throw other errors
                }
            }
            
            // Set custom claims (role)
            await auth.setCustomUserClaims(userRecord.uid, { role: user.role });

            // Prepare Firestore user document. The username IS the email.
            const firestoreUser: User = {
                id: userRecord.uid,
                username: user.email, 
                displayName: user.displayName,
                role: user.role as User['role'],
                communeId: user.communeId,
            };
            
            // Add to Firestore user list for batch write
            userRecords.push(firestoreUser);

            if (firestoreUser.role === 'admin') {
                adminUids.push(firestoreUser.id);
            }

        } catch (error) {
            console.error(`Error processing user ${user.email}:`, error);
        }
    }
    
    // Batch write all user documents to Firestore
    if (userRecords.length > 0) {
        const batch = db.batch();
        const usersCollection = db.collection('users');
        userRecords.forEach(userDoc => {
            const docRef = usersCollection.doc(userDoc.id);
            batch.set(docRef, userDoc);
        });
        await batch.commit();
        console.log(`Successfully seeded ${userRecords.length} user documents in Firestore.`);
    }

    return { userRecords, adminUids };
}


async function seedCollection<T extends { id: string }>(collectionName: string, data: T[]) {
  const collectionRef = db.collection(collectionName);
  const batch = db.batch();

  console.log(`Seeding collection "${collectionName}"...`);
  
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
    
    // Seed users first to get their UIDs
    const { userRecords, adminUids } = await seedUsers();

    // Now seed other collections
    await seedCollection('units', units);
    await seedCollection('assessmentPeriods', assessmentPeriods);
    await seedCollection('criteria', criteria);
    await seedCollection('guidanceDocuments', guidanceDocuments);

    // Populate assessments with correct approver and submitter IDs
    const finalAssessments = assessments.map(a => {
        const assessmentData: Partial<Assessment> = { ...a };
        
        const userRecord = userRecords.find(u => u.communeId === a.communeId);
        if (userRecord) {
            assessmentData.submittedBy = userRecord.displayName;
        }
        
        if (a.status === 'approved' && adminUids.length > 0) {
            assessmentData.approverId = adminUids[0]; // Assign the first admin as approver
        }

        return assessmentData as Assessment;
    });

    await seedCollection('assessments', finalAssessments);

    console.log("\n=========================================");
    console.log("✅ Firestore seeding completed successfully!");
    console.log("=========================================");
  } catch (error) {
    console.error("\n========================================");
    console.error("🔥 Error seeding Firestore:", error);
    console.error("========================================");
    process.exit(1);
  }
}

main();

