import * as admin from "firebase-admin";
import * as fs from "fs";

// Khởi tạo Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "chuan-tiep-can-pl",
});

const db = admin.firestore();

async function exportData() {
  const standardsSnap = await db.collection("standards").get();
  const standards: any[] = [];

  for (const stdDoc of standardsSnap.docs) {
    const stdData = stdDoc.data();
    const criteriaSnap = await stdDoc.ref.collection("criteria").get();
    const criteria: any[] = [];

    for (const criDoc of criteriaSnap.docs) {
      const criData = criDoc.data();
      const indicatorsSnap = await criDoc.ref.collection("indicators").get();
      const indicators = indicatorsSnap.docs.map((indDoc) => ({
        id: indDoc.id,
        ...indDoc.data(),
      }));

      criteria.push({ id: criDoc.id, ...criData, indicators });
    }

    standards.push({ id: stdDoc.id, ...stdData, criteria });
  }

  fs.writeFileSync("standards.json", JSON.stringify({ standards }, null, 2));
  console.log("✅ Exported to standards.json");
}

exportData().catch((err) => console.error("Export failed:", err));
