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
        { id: "CT2.1.1", order: 1, name: "1. Thực hiện lập Danh mục thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.1" },
        { id: "CT2.1.2", order: 2, name: "2. Đăng tải Danh mục thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.1" },
        { id: "CT2.2", order: 3, name: "Chỉ tiêu 2: Thực hiện công khai văn bản...", description: "Số Nghị quyết của HĐND, Quyết định của UBND sau khi ban hành được công khai...", evidenceRequirement: "...", standardLevel: "100%", inputType: "number", parentCriterionId: "TC02" },
        { id: "CT2.3", order: 4, name: "Chỉ tiêu 3: Thực hiện cung cấp thông tin...", description: "Tỷ lệ thông tin được cung cấp đúng hạn khi có yêu cầu...", evidenceRequirement: "...", standardLevel: "100%", inputType: "percentage_ratio", parentCriterionId: "TC02" }, // {total, provided}
        {
            id: "CT2.4.1", order: 5, name: "1. Ban hành kế hoạch phổ biến, giáo dục pháp luật...", description: "Kế hoạch được ban hành đáp ứng yêu cầu...", evidenceRequirement: "Kế hoạch PBGDPL năm...", standardLevel: "Đúng hạn (7 ngày làm việc)",
            inputType: "TC1_like", // Logic đặc biệt
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4",
            assignmentType: "specific", // Cấu hình mặc định
            assignedDocumentsCount: 0,
            documents: []
         },
         {
            id: "CT2.4.2", order: 6, name: "2. Tỷ lệ hoàn thành nhiệm vụ theo Kế hoạch phổ biến, giáo dục pháp luật hằng năm", description: "Tỷ lệ % = (Tổng số nhiệm vụ hoàn thành / Tổng số nhiệm vụ đề ra)...", evidenceRequirement: "Báo cáo kết quả thực hiện Kế hoạch...", standardLevel: "100%",
            inputType: "percentage_ratio", // {total, completed}
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4"
         },
         { 
            id: "CT2.4.3", order: 7, name: "3. Tỷ lệ hoàn thành nhiệm vụ về phổ biến, giáo dục pháp luật phát sinh ngoài kế hoạch phổ biến, giáo dục pháp luật hằng năm", description: "Tỷ lệ % = (Tổng số nhiệm vụ hoàn thành / Tổng số nhiệm vụ đề ra)...", evidenceRequirement: "Báo cáo kết quả thực hiện Kế hoạch...", standardLevel: "100%",
            inputType: "percentage_ratio",
            parentCriterionId: "TC02",
            originalParentIndicatorId: "CT2.4"},
         {
            id: "CT2.5", order: 8, name: "Chỉ tiêu 5: Thực hiện chuyển đổi số...", description: "Thực hiện ít nhất 01 hoạt động chuyển đổi số...", evidenceRequirement: "...", standardLevel: ">= 1 hoạt động",
            inputType: "checkbox_group",
            parentCriterionId: "TC02",
            // Options for checkbox group will be hardcoded in the frontend component
        },
        { id: "CT2.6.1", order: 9, name: "1. Nội dung 1 của CT6...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.6" }, // Xác nhận lại InputType
        { id: "CT2.6.2", order: 10, name: "2. Nội dung 2 của CT6...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.6" }, // Xác nhận lại InputType
        { id: "CT2.6.3", order: 11, name: "3. Nội dung 3 của CT6...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.6" }, // Xác nhận lại InputType
        { id: "CT2.7.1", order: 12, name: "1. Nội dung 1 của CT7...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.7" }, // Xác nhận lại InputType
        { id: "CT2.7.2", order: 13, name: "2. Nội dung 2 của CT7...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.7" }, // Xác nhận lại InputType
        { id: "CT2.7.3", order: 14, name: "3. Nội dung 3 của CT7...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "boolean", parentCriterionId: "TC02", originalParentIndicatorId: "CT2.7" }, // Xác nhận lại InputType
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