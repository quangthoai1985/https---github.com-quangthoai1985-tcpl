// File: rebuildCriteria.js
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
const criteriaCollectionRef = db.collection('criteria');

// --- ĐỊNH NGHĨA DỮ LIỆU CRITERIA MỚI ---
// (QUAN TRỌNG: Rà soát và chỉnh sửa tên, mô tả, ID,... cho chính xác)
const newCriteriaData = [
    {
        criterionId: "TC01",
        criterionName: "Ban hành văn bản quy phạm pháp luật",
        indicators: [
            { 
                id: "CT1.1", order: 1, name: "Chỉ tiêu 1: Văn bản...", description: "...", evidenceRequirement: "...", standardLevel: "100%", 
                inputType: "TC1_like", 
                // Các trường đặc biệt cho TC1_like
                assignmentType: "specific", // Hoặc 'quantity' - Cấu hình mặc định
                assignedDocumentsCount: 0,
                documents: []
            },
            { 
                id: "CT1.2", order: 2, name: "Chỉ tiêu 2: Dự thảo...", description: "...", evidenceRequirement: "...", standardLevel: "100%", 
                inputType: "TC1_like", 
                assignmentType: "specific", 
                assignedDocumentsCount: 0,
                documents: []
            },
             { 
                id: "CT1.3", order: 3, name: "Chỉ tiêu 3: Thực hiện tự kiểm tra...", description: "...", evidenceRequirement: "...", standardLevel: "100%", 
                inputType: "TC1_like", 
                assignmentType: "specific", 
                assignedDocumentsCount: 0,
                documents: []
            },
            // Thêm các chỉ tiêu khác của TC01 nếu có (đã làm phẳng)
        ]
    },
    {
        criterionId: "TC02",
        criterionName: "Tiếp cận thông tin, phổ biến, giáo dục pháp luật",
        indicators: [
             { id: "CT2.1", order: 1, name: "Chỉ tiêu 1: Thực hiện lập...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean" },
             { id: "CT2.2", order: 2, name: "Chỉ tiêu 2: Thực hiện công khai...", description: "...", evidenceRequirement: "...", standardLevel: "100%", inputType: "number" }, // Ví dụ inputType number
             { id: "CT2.3", order: 3, name: "Chỉ tiêu 3: Thực hiện cung cấp thông tin...", description: "...", evidenceRequirement: "...", standardLevel: "100%", inputType: "number_ratio" }, // Ví dụ loại input mới nếu cần {total, provided}
             // Chỉ tiêu 4 được tách thành 2
             { 
                id: "CT4.1", order: 4, name: "1. Ban hành kế hoạch phổ biến, giáo dục pháp luật...", description: "Kế hoạch được ban hành đáp ứng...", evidenceRequirement: "Kế hoạch...", standardLevel: "Đúng hạn", 
                inputType: "TC1_like", // Logic giống TC1
                originalParentIndicatorId: "CT4", // Tham chiếu cha ảo
                assignmentType: "specific", 
                assignedDocumentsCount: 0,
                documents: []
             },
             { 
                id: "CT4.2", order: 5, name: "2. Tỷ lệ hoàn thành nhiệm vụ theo Kế hoạch...", description: "Tỷ lệ % = (Tổng số nhiệm vụ...)", evidenceRequirement: "Báo cáo, số liệu...", standardLevel: "100%", 
                inputType: "percentage_ratio", // Ví dụ loại input mới {total, completed}
                originalParentIndicatorId: "CT4" // Tham chiếu cha ảo
             },
             { id: "CT5", order: 6, name: "Chỉ tiêu 5: Thực hiện chuyển đổi số...", description: "...", evidenceRequirement: "...", standardLevel: "01 hoạt động", inputType: "checkbox_group" }, // Ví dụ checkbox
             { id: "CT6", order: 7, name: "Chỉ tiêu 6: Bảo đảm nguồn lực...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean" },
             { id: "CT7", order: 8, name: "Chỉ tiêu 7: Thông tin, giới thiệu...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean" },
            // Thêm các chỉ tiêu khác của TC02 nếu có (đã làm phẳng)
        ]
    },
     {
        criterionId: "TC03",
        criterionName: "Hòa giải ở cơ sở, đánh giá, công nhận, xây dựng xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật",
        indicators: [
             { id: "CT3.1", order: 1, name: "Chỉ tiêu 1: Thành lập, kiện toàn...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", originalParentIndicatorId: "CT3.1_Parent" }, // Ví dụ con của CT3.1
             { id: "CT3.1.2", order: 2, name: "Nội dung 2 của CT3.1...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean", originalParentIndicatorId: "CT3.1_Parent" }, // Ví dụ con của CT3.1
             { id: "CT3.2", order: 3, name: "Chỉ tiêu 2: Các mâu thuẫn...", description: "...", evidenceRequirement: "...", standardLevel: "100%", inputType: "percentage_ratio", originalParentIndicatorId: "CT3.2_Parent" }, // Ví dụ con của CT3.2
             { id: "CT3.3", order: 4, name: "Chỉ tiêu 3: Có sự phối hợp...", description: "...", evidenceRequirement: "...", standardLevel: "01 hoạt động", inputType: "checkbox_group" },
             { id: "CT3.4", order: 5, name: "Chỉ tiêu 4: Đảm bảo nguồn lực...", description: "...", evidenceRequirement: "...", standardLevel: "Đạt", inputType: "boolean" },
            // Thêm các chỉ tiêu khác của TC03 nếu có (đã làm phẳng)
        ]
    },
];

// --- HÀM THỰC THI ---
async function rebuildCriteria() {
    console.log('--- Starting Criteria Rebuild ---');

    // 1. Delete existing criteria documents
    console.log('Deleting existing criteria documents...');
    const existingSnapshot = await criteriaCollectionRef.get();
    if (!existingSnapshot.empty) {
        const deleteBatch = db.batch();
        existingSnapshot.docs.forEach(doc => {
            console.log(` - Deleting ${doc.id}`);
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        console.log(`Deleted ${existingSnapshot.size} existing criteria documents.`);
    } else {
        console.log('No existing criteria documents to delete.');
    }

    // 2. Create new criteria and indicators
    console.log('\nCreating new criteria structure...');
    const createBatch = db.batch();

    for (const criterionData of newCriteriaData) {
        const { criterionId, criterionName, indicators } = criterionData;
        const criterionDocRef = criteriaCollectionRef.doc(criterionId);

        console.log(` - Creating Criterion: ${criterionName} (${criterionId})`);
        createBatch.set(criterionDocRef, {
            id: criterionId,
            name: criterionName,
        });

        const indicatorsCollectionRef = criterionDocRef.collection('indicators');
        console.log(`   - Creating 'indicators' subcollection for ${criterionId}`);

        for (const indicatorData of indicators) {
            const indicatorId = indicatorData.id;
            const indicatorDocRef = indicatorsCollectionRef.doc(indicatorId);
            console.log(`     - Adding Indicator: "${indicatorData.name}" (ID: ${indicatorId})`);

            // Add parentCriterionId to each indicator
            const finalIndicatorData = {
                ...indicatorData,
                parentCriterionId: criterionId 
            };

            createBatch.set(indicatorDocRef, finalIndicatorData);
        }
    }

    await createBatch.commit();
    console.log('\nSuccessfully created new criteria structure.');
    console.log('--- Criteria Rebuild Finished ---');
}

// --- CHẠY SCRIPT ---
rebuildCriteria().catch(error => {
    console.error('An error occurred during the rebuild process:', error);
});