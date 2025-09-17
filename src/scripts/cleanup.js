// File: src/scripts/cleanup.js

const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();

const db = getFirestore();

const COLLECTION_NAME = 'assessments';
const FIELD_TO_DELETE = 'CT1';

async function cleanupOrphanedFields() {
  console.log(`Bắt đầu quét collection '${COLLECTION_NAME}' để xóa trường '${FIELD_TO_DELETE}'...`);
  
  const collectionRef = db.collection(COLLECTION_NAME);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`Không tìm thấy hồ sơ nào trong collection '${COLLECTION_NAME}'.`);
    return;
  }
  
  const batch = db.batch();
  let updatedCount = 0;

  console.log(`Tìm thấy ${snapshot.docs.length} hồ sơ. Đang kiểm tra...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    if (data.assessmentData && data.assessmentData[FIELD_TO_DELETE]) {
      console.log(`- Tìm thấy trường '${FIELD_TO_DELETE}' thừa trong hồ sơ ID: ${doc.id}. Chuẩn bị xóa...`);
      
      const updatePayload = {
        [`assessmentData.${FIELD_TO_DELETE}`]: FieldValue.delete()
      };

      batch.update(doc.ref, updatePayload);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`\nĐang thực hiện dọn dẹp cho ${updatedCount} hồ sơ...`);
    await batch.commit();
    console.log("Tất cả các cập nhật đã hoàn tất.");
  } else {
    console.log(`\nKhông có hồ sơ nào chứa trường '${FIELD_TO_DELETE}' thừa cần dọn dẹp.`);
  }

  console.log(`\n✅ Script đã chạy xong. Đã cập nhật ${updatedCount} hồ sơ.`);
}

cleanupOrphanedFields().catch(console.error);