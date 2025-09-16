#!/bin/bash
# Kịch bản sao lưu dự án

# --- Cấu hình ---
# Thư mục chứa các bản sao lưu
BACKUP_DIR="backups"
# Tên file nén (sử dụng ngày-giờ)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ARCHIVE_NAME="backup_$TIMESTAMP.tar.gz"
# Các file và thư mục cần sao lưu
SOURCE_DIR="."
# Các file và thư mục cần loại trừ
EXCLUDE_PATTERNS=(
    "--exclude=$BACKUP_DIR"
    "--exclude=.next"
    "--exclude=node_modules"
    "--exclude=.git"
    "--exclude=*.log"
    "--exclude=service-account-credentials.json"
)

# --- Logic ---
echo "==================================="
echo " BẮT ĐẦU QUÁ TRÌNH SAO LƯU DỰ ÁN "
echo "==================================="

# 1. Tạo thư mục backup nếu nó chưa tồn tại
if [ ! -d "$BACKUP_DIR" ]; then
    echo "-> Tạo thư mục sao lưu: $BACKUP_DIR"
    mkdir "$BACKUP_DIR"
fi

# 2. Tạo file nén
TARGET_FILE="$BACKUP_DIR/$ARCHIVE_NAME"
echo "-> Sẽ tạo file sao lưu tại: $TARGET_FILE"

# 3. Thực hiện nén các file
# tar -czf [tên-file-đích] [các-file-loại-trừ] [thư-mục-nguồn]
tar -czf "$TARGET_FILE" "${EXCLUDE_PATTERNS[@]}" "$SOURCE_DIR"

# 4. Kiểm tra và thông báo kết quả
if [ $? -eq 0 ]; then
    echo "✅ SAO LƯU THÀNH CÔNG!"
    echo "   Bạn có thể tìm thấy bản sao lưu tại: $TARGET_FILE"
else
    echo "🔥 ĐÃ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH SAO LƯU."
fi

echo "==================================="
