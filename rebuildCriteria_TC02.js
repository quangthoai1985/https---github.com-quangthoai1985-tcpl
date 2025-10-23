// File: rebuildCriteria_TC02.js
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-credentials.json'); // Đảm bảo file key đúng tên

try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } else {
         console.log('Firebase Admin SDK already initialized.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
}

const db = admin.firestore();
const tc02DocRef = db.collection('criteria').doc('TC02');

// --- ĐỊNH NGHĨA DỮ LIỆU MỚI CHO TC02 ---
const tc02Data = {
    criterionId: "TC02",
    criterionName: "Tiếp cận thông tin, phổ biến, giáo dục pháp luật", // Tên Tiêu chí 2
    indicators: [
        // Chỉ tiêu 1 cũ (gồm 2 nội dung) -> CT2.1.1, CT2.1.2
        { 
            id: "CT2.1.1", order: 1, name: "1. Thực hiện lập Danh mục thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", 
            inputType: "boolean", // Hoặc type phù hợp khác
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.1" // Tham chiếu cha ảo
        },
        { 
            id: "CT2.1.2", order: 2, name: "2. Đăng tải Danh mục thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", 
            inputType: "boolean", // Hoặc type phù hợp khác
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.1" // Tham chiếu cha ảo
        },
        // Chỉ tiêu 2 cũ -> CT2.2
        { 
            id: "CT2.2", order: 3, name: "Chỉ tiêu 2: Thực hiện công khai văn bản...", description: "...", evidenceRequirement: "...", standardLevel: "100%", 
            inputType: "number", // Giả định là nhập số lượng
            parentCriterionId: "TC02",
        },
        // Chỉ tiêu 3 cũ -> CT2.3
        { 
            id: "CT2.3", order: 4, name: "Chỉ tiêu 3: Thực hiện cung cấp thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "100%", 
            inputType: "percentage_ratio", // Giả định cần 2 ô nhập {total, provided}
            parentCriterionId: "TC02",
        },
        // Chỉ tiêu 4 cũ (gồm 3 nội dung) -> CT2.4.1, CT2.4.2, CT2.4.3
        { 
            id: "CT2.4.1", order: 5, name: "1. Ban hành kế hoạch phổ biến...", // Nội dung 1 cũ
            description: "...", evidenceRequirement: "...", standardLevel: "Đúng hạn", 
            inputType: "TC1_like", // **LOGIC ĐẶC BIỆT GIỐNG TC1.1**
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4", // Tham chiếu cha ảo
            // Các trường đặc biệt cho TC1_like
            assignmentType: "specific", // Mặc định
            assignedDocumentsCount: 0,
            documents: []
        },
        { 
            id: "CT2.4.2", order: 6, name: "2. Tỷ lệ hoàn thành nhiệm vụ theo Kế hoạch...", // Nội dung 2 cũ
            description: "...", evidenceRequirement: "...", standardLevel: "100%", 
            inputType: "percentage_ratio", // Giả định cần 2 ô nhập {total, completed}
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4" // Tham chiếu cha ảo
        },
         { 
            id: "CT2.4.3", order: 7, name: "3. Nội dung thứ 3 của CT4 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4" // Tham chiếu cha ảo
        },
        // Chỉ tiêu 5 cũ -> CT2.5
         { 
            id: "CT2.5", order: 8, name: "Chỉ tiêu 5: Thực hiện chuyển đổi số...", description: "...", evidenceRequirement: "...", standardLevel: "01 hoạt động", 
            inputType: "checkbox_group", // Giả định là checkbox
            parentCriterionId: "TC02",
        },
        // Chỉ tiêu 6 cũ (gồm 3 nội dung) -> CT2.6.1, CT2.6.2, CT2.6.3
         { 
            id: "CT2.6.1", order: 9, name: "1. Nội dung 1 của CT6 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.6" // Tham chiếu cha ảo
        },
        { 
            id: "CT2.6.2", order: 10, name: "2. Nội dung 2 của CT6 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.6" // Tham chiếu cha ảo
        },
        { 
            id: "CT2.6.3", order: 11, name: "3. Nội dung 3 của CT6 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.6" // Tham chiếu cha ảo
        },
         // Chỉ tiêu 7 cũ (gồm 3 nội dung) -> CT2.7.1, CT2.7.2, CT2.7.3
         { 
            id: "CT2.7.1", order: 12, name: "1. Nội dung 1 của CT7 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.7" // Tham chiếu cha ảo
        },
        { 
            id: "CT2.7.2", order: 13, name: "2. Nội dung 2 của CT7 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.7" // Tham chiếu cha ảo
        },
        { 
            id: "CT2.7.3", order: 14, name: "3. Nội dung 3 của CT7 cũ...", // **ĐIỀN TÊN CHÍNH XÁC**
            description: "...", evidenceRequirement: "...", standardLevel: "...", 
            inputType: "...", // Chọn type phù hợp
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.7" // Tham chiếu cha ảo
        },
    ]
};

// --- HÀM THỰC THI (Giống hệt script TC01, chỉ thay tên biến) ---
async function rebuildTC02() {
    console.log('--- Starting TC02 Rebuild ---');

    // 1. Delete existing indicators subcollection
    const indicatorsCollectionRef = tc02DocRef.collection('indicators');
    console.log(`Deleting existing 'indicators' subcollection for ${tc02DocRef.id}...`);
    const indicatorDocs = await indicatorsCollectionRef.listDocuments();
    if (indicatorDocs.length > 0) {
        const deleteIndicatorsBatch = db.batch();
        indicatorDocs.forEach(doc => {
            console.log(` - Deleting indicator ${doc.id}`);
            deleteIndicatorsBatch.delete(doc);
        });
        await deleteIndicatorsBatch.commit();
        console.log(`Deleted ${indicatorDocs.length} existing indicators.`);
    } else {
         console.log(`No existing indicators found in subcollection for ${tc02DocRef.id}.`);
    }

     // 2. Delete the main TC02 document
     console.log(`Deleting main document ${tc02DocRef.id}...`);
     try {
         await tc02DocRef.delete();
         console.log(`Successfully deleted main document ${tc02DocRef.id}.`);
     } catch(error) {
         if (error.code === 5) { 
             console.log(`Main document ${tc02DocRef.id} did not exist, proceeding.`);
         } else {
             throw error; 
         }
     }


    // 3. Create new TC02 document and indicators subcollection
    console.log(`\nCreating new structure for ${tc02Data.criterionId}...`);
    const createBatch = db.batch();

    console.log(` - Creating main document: ${tc02Data.criterionName} (${tc02Data.criterionId})`);
    createBatch.set(tc02DocRef, {
        id: tc02Data.criterionId,
        name: tc02Data.criterionName,
    });

    const newIndicatorsCollectionRef = tc02DocRef.collection('indicators');
    console.log(`   - Creating 'indicators' subcollection and adding documents...`);
    for (const indicatorData of tc02Data.indicators) {
        const indicatorId = indicatorData.id; // ID là CT2.1.1, CT2.1.2,...
        const indicatorDocRef = newIndicatorsCollectionRef.doc(indicatorId);
        console.log(`     - Adding Indicator: "${indicatorData.name}" (ID: ${indicatorId})`);
        createBatch.set(indicatorDocRef, indicatorData);
    }

    await createBatch.commit();
    console.log(`\nSuccessfully created new structure for ${tc02Data.criterionId}.`);
    console.log('--- TC02 Rebuild Finished ---');
}

// --- CHẠY SCRIPT ---
rebuildTC02().catch(error => {
    console.error('An error occurred during the TC02 rebuild process:', error);
});