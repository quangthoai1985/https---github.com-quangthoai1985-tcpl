// File: rebuildCriteria_TC03.js
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
const tc03DocRef = db.collection('criteria').doc('TC03');

// --- ĐỊNH NGHĨA DỮ LIỆU MỚI CHO TC03 ---
const tc03Data = {
    criterionId: "TC03",
    criterionName: "Hòa giải ở cơ sở, đánh giá, công nhận, xây dựng xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật", // Tên Tiêu chí 3
    indicators: [
        { id: "CT3.1.1", order: 1, name: "1. Thành lập, kiện toàn tổ hòa giải...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", parentCriterionId: "TC03", originalParentIndicatorId: "CT3.1" },
        { id: "CT3.1.2", order: 2, name: "2. Công nhận, cho thôi hòa giải viên...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", parentCriterionId: "TC03", originalParentIndicatorId: "CT3.1" },
        { id: "CT3.2.1", order: 3, name: "1. Các mâu thuẫn, tranh chấp, vi phạm pháp luật thuộc phạm vi hòa giải...", description: "...", evidenceRequirement: "...", standardLevel: "...", inputType: "number", parentCriterionId: "TC03", originalParentIndicatorId: "CT3.2" }, // Nhập số vụ việc
        { id: "CT3.2.2", order: 4, name: "2. Tỷ lệ vụ, việc hòa giải thành...", description: "...", evidenceRequirement: "...", standardLevel: ">= 80%", inputType: "percentage_ratio", parentCriterionId: "TC03", originalParentIndicatorId: "CT3.2" }, // {total, successful}
        {
            id: "CT3.3", order: 5, name: "Chỉ tiêu 3: Có sự phối hợp, huy động các tổ chức...", description: "...", evidenceRequirement: "...", standardLevel: ">= 1 hoạt động",
            inputType: "checkbox_group",
            parentCriterionId: "TC03",
            // Options for checkbox group will be hardcoded in the frontend component
        },
        { id: "CT3.4", order: 6, name: "Chỉ tiêu 4: Bảo đảm kinh phí, cơ sở vật chất...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", parentCriterionId: "TC03" },
    ]
};

// --- HÀM THỰC THI (Giống hệt script TC01, chỉ thay tên biến) ---
async function rebuildTC03() {
    console.log('--- Starting TC03 Rebuild ---');

    // 1. Delete existing indicators subcollection
    const indicatorsCollectionRef = tc03DocRef.collection('indicators');
    console.log(`Deleting existing 'indicators' subcollection for ${tc03DocRef.id}...`);
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
         console.log(`No existing indicators found in subcollection for ${tc03DocRef.id}.`);
    }

     // 2. Delete the main TC03 document
     console.log(`Deleting main document ${tc03DocRef.id}...`);
     try {
         await tc03DocRef.delete();
         console.log(`Successfully deleted main document ${tc03DocRef.id}.`);
     } catch(error) {
         if (error.code === 5) { 
             console.log(`Main document ${tc03DocRef.id} did not exist, proceeding.`);
         } else {
             throw error; 
         }
     }


    // 3. Create new TC03 document and indicators subcollection
    console.log(`\nCreating new structure for ${tc03Data.criterionId}...`);
    const createBatch = db.batch();

    console.log(` - Creating main document: ${tc03Data.criterionName} (${tc03Data.criterionId})`);
    createBatch.set(tc03DocRef, {
        id: tc03Data.criterionId,
        name: tc03Data.criterionName,
    });

    const newIndicatorsCollectionRef = tc03DocRef.collection('indicators');
    console.log(`   - Creating 'indicators' subcollection and adding documents...`);
    for (const indicatorData of tc03Data.indicators) {
        const indicatorId = indicatorData.id; // ID là CT2.1.1, CT2.1.2,...
        const indicatorDocRef = newIndicatorsCollectionRef.doc(indicatorId);
        console.log(`     - Adding Indicator: "${indicatorData.name}" (ID: ${indicatorId})`);
        createBatch.set(indicatorDocRef, indicatorData);
    }

    await createBatch.commit();
    console.log(`\nSuccessfully created new structure for ${tc03Data.criterionId}.`);
    console.log('--- TC03 Rebuild Finished ---');
}

// --- CHẠY SCRIPT ---
rebuildTC03().catch(error => {
    console.error('An error occurred during the TC03 rebuild process:', error);
});