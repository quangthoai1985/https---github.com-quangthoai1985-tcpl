/**
 * Migration script: convert old indicator fields (standardLevel, inputType, evidenceRequirement)
 * into the new contents[] structure with passRule=all
 */

const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function migrateCriteria() {
  const snapshot = await db.collection("criteria").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const indicators = data.indicators || [];

    const newIndicators = indicators.map(ind => {
      // Nếu indicator chưa có contents → tạo 1 content từ field cũ
      if (!ind.contents || ind.contents.length === 0) {
        const content = {
          id: `${ind.id || Date.now()}`, // tạo id tạm
          name: ind.name || "Nội dung 1",
          description: ind.description || "",
          // di chuyển evidenceRequirement xuống nội dung
          evidenceRequirement: ind.evidenceRequirement || "",
          // có thể lưu lại inputType, standardLevel nếu muốn dùng
          inputType: ind.inputType || "file",
          standardLevel: ind.standardLevel || null,
        };
        ind.contents = [content];
      }

      // Gán passRule mặc định = all
      ind.passRule = { type: "all" };

      // Xóa field cũ
      delete ind.evidenceRequirement;
      delete ind.inputType;
      delete ind.standardLevel;

      return ind;
    });

    // Ghi lại document criteria đã migrate
    await db.collection("criteria").doc(doc.id).update({
      indicators: newIndicators,
    });

    console.log(`Migrated criteria ${doc.id}`);
  }

  console.log("Migration completed ✅");
}

migrateCriteria().catch(err => {
  console.error("Migration failed ❌", err);
});
