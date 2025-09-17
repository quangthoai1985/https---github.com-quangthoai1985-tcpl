
/* eslint-disable no-console */
import { admin } from '@/lib/firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ========================================================================================
// SCRIPT SAO LƯU DỮ LIỆU FIRESTORE
// ========================================================================================
// MỤC ĐÍCH:
// - Script này sử dụng Firebase Admin SDK để xuất (export) toàn bộ cơ sở dữ liệu
//   Firestore của bạn.
// - Dữ liệu sẽ được lưu vào một thư mục trong Firebase Storage.
// - Đây là một phương pháp sao lưu thủ công, an toàn và hiệu quả để bạn có thể
//   chạy bất cứ khi nào cần tạo một bản sao lưu.
//
// HƯỚNG DẪN CHẠY:
// 1. Đảm bảo bạn đang ở trong môi trường có quyền truy cập Google Cloud (như Cloud Shell)
//    hoặc đã cài đặt và xác thực gcloud CLI ở local.
// 2. Mở terminal và chạy lệnh: `npm run backup:firestore`
// ========================================================================================

function getProjectId(): string | undefined {
    // 1. Ưu tiên lấy từ biến môi trường (thường có sẵn trên Cloud Run/Functions)
    const envProjectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    if (envProjectId) {
        console.log(`Project ID found from environment variable: ${envProjectId}`);
        return envProjectId;
    }

    // 2. Lấy từ file service account credentials
    const serviceAccountPath = path.join(process.cwd(), 'service-account-credentials.json');
    if (fs.existsSync(serviceAccountPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            if (serviceAccount.project_id) {
                console.log(`Project ID found from service-account-credentials.json: ${serviceAccount.project_id}`);
                return serviceAccount.project_id;
            }
        } catch (e) {
            console.warn("Could not read or parse service-account-credentials.json");
        }
    }

    // 3. Lấy từ cấu hình khởi tạo của Admin SDK (ít tin cậy hơn khi chạy script local)
    const sdkProjectId = admin.instanceId?.().app.options.projectId;
     if (sdkProjectId) {
        console.log(`Project ID found from initialized Admin SDK: ${sdkProjectId}`);
        return sdkProjectId;
    }
    
    return undefined;
}


async function main() {
  const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
  
  const projectId = getProjectId();
  
  if (!projectId) {
      console.error("🔥 Lỗi: Không thể xác định Project ID. Hãy đảm bảo file 'service-account-credentials.json' có trường 'project_id' hoặc biến môi trường GCLOUD_PROJECT đã được đặt.");
      process.exit(1);
  }

  const bucket = `gs://${projectId}.appspot.com`; // Bucket mặc định của Firebase
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const path = `${bucket}/firestore-backups/${timestamp}`;
  
  const databaseName = firestoreClient.databasePath(projectId, '(default)');

  console.log(`Bắt đầu quá trình xuất dữ liệu Firestore...`);
  console.log(`- Project ID: ${projectId}`);
  console.log(`- Nguồn: ${databaseName}`);
  console.log(`- Đích (Storage Bucket): ${path}`);

  try {
    const [response] = await firestoreClient.exportDocuments({
      name: databaseName,
      outputUriPrefix: path,
      // Để trống collectionIds để xuất toàn bộ database
      // collectionIds: ['users', 'units'] 
    });
    
    console.log("\n-----------------------------------------");
    console.log("... Đang xử lý, quá trình này có thể mất vài phút ...");
    console.log(`- Tên tiến trình (Operation Name): ${response.name}`);
    console.log("-----------------------------------------\n");
    console.log("✅ Yêu cầu sao lưu đã được gửi thành công!");
    console.log("Kiểm tra Firebase Storage của bạn trong thư mục 'firestore-backups' sau vài phút nữa.");

  } catch (error) {
    console.error("\n========================================");
    console.error("🔥 Đã xảy ra lỗi trong quá trình xuất dữ liệu:", error);
    console.error("========================================");
    process.exit(1);
  }
}

main();
