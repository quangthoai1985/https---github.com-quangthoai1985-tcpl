# Tổng quan Luồng hoạt động Kiểm tra Chữ ký số Tự động

Tài liệu này mô tả chi tiết về quy trình tự động kiểm tra chữ ký số trên các tệp PDF được tải lên hệ thống, một tính năng quan trọng để đảm bảo tính xác thực và hợp lệ của hồ sơ minh chứng.

## Quy trình hoạt động cho Chỉ tiêu 1 (Ban hành VBQPPL)

Luồng hoạt động được chia thành các bước chính sau:

### Bước 1: Người dùng tải tệp lên (Phía Client)

1.  **Hành động:** Cán bộ cấp xã truy cập trang **Tự Chấm điểm** (`/commune/assessments`).
2.  **Mục tiêu:** Tại **Chỉ tiêu 1 của Tiêu chí 1** (liên quan đến việc ban hành văn bản), người dùng cần tải lên các tệp PDF làm minh chứng cho các văn bản đã được ban hành.
3.  **Giới hạn:** Giao diện người dùng đã được tùy chỉnh để chỉ chấp nhận các tệp có định dạng `.pdf` cho chỉ tiêu cụ thể này, đảm bảo người dùng cung cấp đúng loại tệp.

### Bước 2: Kích hoạt Cloud Function (Phía Backend)

1.  **Trigger:** Ngay khi một tệp mới được tải lên thành công vào Firebase Storage, một trigger sự kiện `onObjectFinalized` sẽ được kích hoạt.
2.  **Hàm được gọi:** Sự kiện này sẽ tự động gọi thực thi Cloud Function `verifyPDFSignature` mà chúng ta đã viết trong `functions/src/index.ts`.

### Bước 3: Xử lý và Phân tích trong Cloud Function

Hàm `processSignedPDF` là trung tâm của toàn bộ quy trình:

1.  **Kiểm tra đầu vào:** Hàm đầu tiên sẽ kiểm tra `contentType` và đường dẫn của tệp.
    *   Nó chỉ tiếp tục xử lý nếu tệp là `application/pdf`.
    *   Nó phân tích đường dẫn (`hoso/{communeId}/evidence/{periodId}/TC01_CT01/{docIndex}/{fileName}`) để lấy ra các thông tin quan trọng như `communeId`, `periodId`, và `docIndex` (chỉ số của văn bản được giao). Nếu đường dẫn không khớp với cấu trúc này, hàm sẽ bỏ qua.
2.  **Tải nội dung tệp:** Sử dụng Admin SDK, hàm tải nội dung của tệp PDF vào một `Buffer` trong bộ nhớ để xử lý.
3.  **Trích xuất chữ ký thô:**
    *   Một hàm trợ giúp là `extractSignature` được sử dụng để đọc `Buffer` dưới dạng chuỗi.
    *   Hàm này tìm kiếm các đối tượng `/ByteRange` và `/Contents` theo tiêu chuẩn của Adobe PDF để xác định và trích xuất khối dữ liệu chữ ký số thô (dưới dạng mã hex).
4.  **Phân tích chữ ký với `node-forge`:**
    *   Khối dữ liệu hex được chuyển đổi thành cấu trúc dữ liệu ASN.1.
    *   Thư viện `node-forge` sau đó phân tích cấu trúc này để tạo ra một đối tượng chữ ký PKCS#7 mà máy tính có thể hiểu được.
5.  **Trích xuất thông tin chi tiết:** Từ đối tượng chữ ký đã được phân tích, hàm lấy ra:
    *   `signerName`: Tên của người ký (Common Name).
    *   `signingTime`: Thời gian chính xác khi văn bản được ký.

### Bước 4: Đối chiếu và Lưu kết quả

1.  **Lấy thông tin Deadline:**
    *   Dựa vào `communeId` và `periodId` lấy từ đường dẫn tệp, hàm truy vấn vào collection `assessments` trong Firestore để tìm hồ sơ tương ứng.
    *   Tiếp theo, hàm đọc collection `criteria` để lấy thông tin về `TC01`.
    *   Sử dụng `docIndex`, hàm tìm đúng thông tin văn bản đã được Admin giao (trong mảng `documents`), từ đó lấy ra `issueDate` (ngày ban hành dự kiến) và `issuanceDeadlineDays` (số ngày cho phép) để tính ra ngày hết hạn cuối cùng (`deadline`).
2.  **So sánh:** Hàm so sánh `signingTime` (thời gian ký thực tế) với `deadline` (hạn chót).
3.  **Ghi kết quả vào Firestore:**
    *   Một document mới được tạo trong collection `signature_checks`.
    *   Document này chứa tất cả các thông tin cần thiết: tên tệp, tên người ký, thời gian ký, và quan trọng nhất là `status`.
    *   `status` sẽ là **"valid"** nếu `signingTime` trước hoặc bằng `deadline`, và là **"expired"** nếu sau `deadline`.
4.  **Xử lý lỗi:** Toàn bộ quy trình được bọc trong `try...catch`. Nếu có bất kỳ lỗi nào xảy ra (không tìm thấy chữ ký, tệp lỗi, không tìm thấy hồ sơ...), một document với `status` là **"error"** và `reason` là thông báo lỗi sẽ được ghi lại, giúp cho việc gỡ lỗi sau này.

---

## Quy trình hoạt động cho Chỉ tiêu 2 & 3 (Tiêu chí 1)

Khác với Chỉ tiêu 1, các chỉ tiêu còn lại trong Tiêu chí 1 (ví dụ: Chỉ tiêu 2 - Truyền thông dự thảo, Chỉ tiêu 3 - Tự kiểm tra văn bản) có quy trình đơn giản hơn nhiều và không liên quan đến việc kiểm tra chữ ký số tự động.

### 1. Bối cảnh & Nghiệp vụ

*   **Mục tiêu:** Đánh giá việc thực hiện các hoạt động khác liên quan đến văn bản, như truyền thông hoặc tự kiểm tra.
*   **Yêu cầu:** Cán bộ xã chỉ cần cung cấp minh chứng cho thấy hoạt động đã được thực hiện. Minh chứng này không yêu cầu chữ ký số.

### 2. Thiết kế & Luồng dữ liệu

1.  **Tải Minh chứng (Phía Client):**
    *   Tại giao diện của Chỉ tiêu 2 hoặc 3, người dùng sử dụng component `EvidenceUploaderComponent` thông thường.
    *   Component này cho phép tải lên nhiều loại tệp (Word, Excel, ảnh, video, PDF...).
    *   Tệp được tải lên Firebase Storage với cấu trúc đường dẫn đơn giản hơn (không có `docIndex`):
        `hoso/{communeId}/evidence/{periodId}/{indicatorId}/{fileName}`
    *   URL của tệp được lưu vào mảng `files` trong `assessmentData` của chỉ tiêu tương ứng.

2.  **Xử lý Phía Backend:**
    *   **KHÔNG CÓ XỬ LÝ TỰ ĐỘNG:** Cloud Function `verifyPDFSignature` được thiết kế để bỏ qua các tệp được tải lên cho các chỉ tiêu này. Điều kiện `if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.1'))` (hoặc tương tự) sẽ không khớp, và function sẽ kết thúc sớm.
    *   Việc xác minh tính hợp lệ của các minh chứng này hoàn toàn do **Admin thực hiện thủ công** khi xem xét, thẩm định hồ sơ đánh giá chi tiết.

### 3. Tổng kết

Quy trình cho Chỉ tiêu 2 và 3 là một luồng upload-lưu trữ thông thường, không có sự can thiệp tự động của backend để kiểm tra nội dung. Việc đánh giá "Đạt" hay "Không đạt" phụ thuộc vào việc xã có nộp minh chứng và sự thẩm định của Admin.

---

Như vậy, chúng ta đã xây dựng một hệ thống hoàn toàn tự động, giúp giảm tải công việc xác minh thủ công, tăng cường độ chính xác và minh bạch cho quy trình đánh giá.