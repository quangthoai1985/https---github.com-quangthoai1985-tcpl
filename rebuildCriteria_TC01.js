// File: rebuildCriteria_TC01.js
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
const tc01DocRef = db.collection('criteria').doc('TC01');

// --- ĐỊNH NGHĨA DỮ LIỆU MỚI CHO TC01 ---
const tc01Data = {
    criterionId: "TC01",
    criterionName: "Ban hành văn bản quy phạm pháp luật", // Lấy tên chính xác từ CSDL cũ hoặc nhập lại
    // --- Cấu hình đặc biệt nằm ở cấp Tiêu chí ---
    assignmentType: "specific", // Mặc định khi tạo mới
    assignedDocumentsCount: 0,   // Mặc định khi tạo mới
    documents: [],               // Mặc định khi tạo mới
    // --- Danh sách chỉ tiêu con (đã làm phẳng) ---
    indicators: [
        {
            id: "CT1.1", // ID mới cho nội dung cũ "1. Ban hành VBQPPL..."
            order: 1,
            name: "1. Ban hành VBQPPL của HĐND, UBND cấp xã đúng thời hạn và đúng quy định của pháp luật", // Lấy tên chính xác
            description: "Tỷ lệ Nghị quyết của Hội đồng nhân dân, Quyết định của Ủy ban nhân dân cấp xã được ban hành đúng thời hạn...", // Lấy mô tả chính xác
            evidenceRequirement: "Nghị quyết của Hội đồng nhân dân, Quyết định của Ủy ban nhân dân cấp xã (nếu có).", // Lấy yêu cầu chính xác
            standardLevel: "100%", // Yêu cầu đạt chuẩn hiển thị
            inputType: "TC1_like", // **QUAN TRỌNG:** Đánh dấu đây là loại cần logic đặc biệt
            parentCriterionId: "TC01", // ID tiêu chí cha
            // originalParentIndicatorId KHÔNG CẦN vì đây là chỉ tiêu chính của nhóm logic TC1
        },
        {
            id: "CT1.2", // ID mới cho nội dung cũ "2. Dự thảo VBQPPL..."
            order: 2,
            name: "2. Dự thảo VBQPPL của Hội đồng nhân dân, Quyết định của Ủy ban nhân dân cấp xã được truyền thông...", // Lấy tên chính xác
            description: "Tỷ lệ dự thảo Nghị quyết của Hội đồng nhân dân, Quyết định của Ủy ban nhân dân cấp xã được truyền thông...", // Lấy mô tả chính xác
            evidenceRequirement: "Dự thảo văn bản quy phạm pháp luật của Hội đồng nhân dân, Ủy ban nhân dân cấp xã được truyền thông (nếu có).", // Lấy yêu cầu chính xác
            standardLevel: "100%", // Yêu cầu đạt chuẩn hiển thị
            inputType: "number", // **QUAN TRỌNG:** Chỉ cần nhập số lượng, không cần kiểm tra ký số
            parentCriterionId: "TC01",
            // originalParentIndicatorId KHÔNG CẦN
        },
        {
            id: "CT1.3", // ID mới cho nội dung cũ "3. Thực hiện tự kiểm tra..."
            order: 3,
            name: "3. Thực hiện tự kiểm tra VBQPPL của Hội đồng nhân dân, Ủy ban nhân dân cấp xã theo quy định...", // Lấy tên chính xác
            description: "Tỷ lệ Nghị quyết của Hội đồng nhân dân, Quyết định của Ủy ban nhân dân cấp xã được thực hiện tự kiểm tra...", // Lấy mô tả chính xác
            evidenceRequirement: "Hồ sơ thể hiện về tự kiểm tra theo quy định của pháp luật về ban hành văn bản quy phạm pháp luật (nếu có).", // Lấy yêu cầu chính xác
            standardLevel: "100%", // Yêu cầu đạt chuẩn hiển thị
            inputType: "number", // **QUAN TRỌNG:** Chỉ cần nhập số lượng, không cần kiểm tra ký số
            parentCriterionId: "TC01",
            // originalParentIndicatorId KHÔNG CẦN
        },
    ]
};

// --- HÀM THỰC THI ---
async function rebuildTC01() {
    console.log('--- Starting TC01 Rebuild ---');

    // 1. Delete existing indicators subcollection
    const indicatorsCollectionRef = tc01DocRef.collection('indicators');
    console.log(`Deleting existing 'indicators' subcollection for ${tc01DocRef.id}...`);
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
         console.log(`No existing indicators found in subcollection for ${tc01DocRef.id}.`);
    }

     // 2. Delete the main TC01 document (optional, but ensures clean state)
     console.log(`Deleting main document ${tc01DocRef.id}...`);
     try {
         await tc01DocRef.delete();
         console.log(`Successfully deleted main document ${tc01DocRef.id}.`);
     } catch(error) {
         // Handle case where document might not exist - this is OK
         if (error.code === 5) { // Firestore code for NOT_FOUND
             console.log(`Main document ${tc01DocRef.id} did not exist, proceeding.`);
         } else {
             throw error; // Re-throw other errors
         }
     }


    // 3. Create new TC01 document and indicators subcollection
    console.log(`\nCreating new structure for ${tc01Data.criterionId}...`);
    const createBatch = db.batch();

    // Create the main TC01 document
    console.log(` - Creating main document: ${tc01Data.criterionName} (${tc01Data.criterionId})`);
    createBatch.set(tc01DocRef, {
        id: tc01Data.criterionId,
        name: tc01Data.criterionName,
        // Add the special config fields directly to the Criterion document
        assignmentType: tc01Data.assignmentType,
        assignedDocumentsCount: tc01Data.assignedDocumentsCount,
        documents: tc01Data.documents,
    });

    // Create indicators in the subcollection
    const newIndicatorsCollectionRef = tc01DocRef.collection('indicators');
    console.log(`   - Creating 'indicators' subcollection and adding documents...`);
    for (const indicatorData of tc01Data.indicators) {
        const indicatorId = indicatorData.id;
        const indicatorDocRef = newIndicatorsCollectionRef.doc(indicatorId);
        console.log(`     - Adding Indicator: "${indicatorData.name}" (ID: ${indicatorId})`);
        createBatch.set(indicatorDocRef, indicatorData);
    }

    await createBatch.commit();
    console.log(`\nSuccessfully created new structure for ${tc01Data.criterionId}.`);
    console.log('--- TC01 Rebuild Finished ---');
}

// --- CHẠY SCRIPT ---
rebuildTC01().catch(error => {
    console.error('An error occurred during the TC01 rebuild process:', error);
});