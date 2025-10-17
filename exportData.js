"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const fs = require("fs");
// Khởi tạo Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
    projectId: "chuan-tiep-can-pl",
});
const db = admin.firestore();
async function exportData() {
    const standardsSnap = await db.collection("standards").get();
    const standards = [];
    for (const stdDoc of standardsSnap.docs) {
        const stdData = stdDoc.data();
        const criteriaSnap = await stdDoc.ref.collection("criteria").get();
        const criteria = [];
        for (const criDoc of criteriaSnap.docs) {
            const criData = criDoc.data();
            const indicatorsSnap = await criDoc.ref.collection("indicators").get();
            const indicators = indicatorsSnap.docs.map((indDoc) => (Object.assign({ id: indDoc.id }, indDoc.data())));
            criteria.push(Object.assign(Object.assign({ id: criDoc.id }, criData), { indicators }));
        }
        standards.push(Object.assign(Object.assign({ id: stdDoc.id }, stdData), { criteria }));
    }
    fs.writeFileSync("standards.json", JSON.stringify({ standards }, null, 2));
    console.log("✅ Exported to standards.json");
}
exportData().catch((err) => console.error("Export failed:", err));
