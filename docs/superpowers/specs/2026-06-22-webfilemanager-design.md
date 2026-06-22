# Web App Quản Lý File — Design Spec
**Ngày:** 2026-06-22  
**Trạng thái:** Approved

---

## 1. Tổng quan

Web app quản lý file chạy trên VPS Ubuntu, không dùng database. Dữ liệu lưu bằng file JSON. Có hai mặt: trang client để xem/tải file, trang admin để quản lý.

**Stack:** Node.js + Express, Multer (upload), express-session (auth), UUID (id generation)  
**Ngôn ngữ UI:** Tiếng Việt  
**Deploy:** Nginx (HTTP) + PM2 trên Ubuntu VPS

---

## 2. Cấu trúc thư mục

```
/app
  server.js
  package.json
  .env.example
  README.md
  /public
    /css
      style.css        ← Client styles
      admin.css        ← Admin styles
    /js
      client.js        ← Filter/search/download (client-side)
      admin.js         ← Upload/CRUD (client-side)
  /views
    index.html         ← Trang client (/)
    admin.html         ← Trang admin (/admin)
    login.html         ← Form đăng nhập (/admin/login)
  /routes
    admin.js           ← Login, upload, CRUD groups/categories/files, logs
    api.js             ← GET /api/files, /api/groups, /api/categories
    download.js        ← GET /download/:id
  /utils
    storage.js         ← readJSON / writeJSON helpers
    logger.js          ← appendLog helper
    fileHelper.js      ← generateId, safeFilename, validateExtension

/storage                ← KHÔNG expose qua Express static
  /files/              ← File thực tế (đổi tên UUID)
  /data/
    files.json
    groups.json
    categories.json
    logs.json
```

---

## 3. Data Schema

### files.json
```json
[
  {
    "id": "uuid-v4",
    "originalName": "Bao_cao_Q1.pdf",
    "storedName": "a1b2c3d4-xxxx.pdf",
    "displayName": "Báo cáo Quý 1 2024",
    "groupId": "grp-uuid",
    "categoryId": "cat-uuid",
    "size": 204800,
    "uploadedAt": "2024-01-15T08:30:00.000Z",
    "downloadCount": 0
  }
]
```

### groups.json & categories.json
```json
[
  { "id": "grp-uuid", "name": "Tài chính", "createdAt": "2024-01-15T08:00:00.000Z" }
]
```

### logs.json
```json
[
  {
    "action": "upload|download|delete|login",
    "fileId": "uuid hoặc null",
    "fileName": "tên file hoặc null",
    "ip": "1.2.3.4",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-15T08:30:00.000Z"
  }
]
```

---

## 4. API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/` | — | Trang client |
| GET | `/admin` | redirect to login | Trang admin |
| GET | `/admin/login` | — | Form đăng nhập |
| POST | `/admin/login` | — | Xử lý đăng nhập |
| POST | `/admin/logout` | admin | Đăng xuất |
| POST | `/admin/upload` | admin | Upload file |
| DELETE | `/admin/files/:id` | admin | Xóa file (JSON + file thật) |
| GET | `/admin/logs` | admin | Xem logs (100 gần nhất) |
| POST | `/admin/groups` | admin | Tạo nhóm |
| DELETE | `/admin/groups/:id` | admin | Xóa nhóm |
| POST | `/admin/categories` | admin | Tạo loại |
| DELETE | `/admin/categories/:id` | admin | Xóa loại |
| GET | `/api/files` | — | Danh sách file (JSON) |
| GET | `/api/groups` | — | Danh sách nhóm (JSON) |
| GET | `/api/categories` | — | Danh sách loại (JSON) |
| GET | `/download/:id` | — | Download file qua backend |

---

## 5. Bảo mật

- **Extension bị chặn:** `.php .exe .sh .bat .cmd .js .mjs .cjs .py .rb .pl .phtml .asp .aspx`
- **Giới hạn dung lượng:** `MAX_FILE_SIZE_MB` từ `.env` → Multer `limits.fileSize`
- **Tên file:** Đổi thành `{uuid}.{ext}` khi lưu, tên gốc lưu trong JSON
- **Path traversal:** `path.resolve()` + kiểm tra prefix `/storage/files/` trước khi gửi file
- **Admin auth:** Middleware `requireAuth` — check `req.session.admin === true`
- **Session:** `httpOnly: true`, `sameSite: 'lax'`, secret từ `SESSION_SECRET` trong `.env`
- **Storage:** Không mount làm Express static — chỉ truy cập qua `/download/:id`

---

## 6. Giao diện

### Trang Client (`/`)
- Header: tên app + ô tìm kiếm real-time
- Bộ lọc: dropdown Nhóm + dropdown Loại (mặc định "Tất cả")
- Danh sách card: icon theo đuôi file, tên hiển thị, nhóm/loại, kích thước, nút **Tải xuống**
- Filter hoàn toàn phía client (không gọi thêm API sau lần load đầu)
- Responsive: 1 cột mobile, 2-3 cột grid desktop

### Trang Admin (`/admin`)
- Dashboard: Tổng file | Tổng lượt tải | Số nhóm | Số loại
- Tab: Upload | Danh sách file | Nhóm | Loại | Log
- Upload form: file input + select Nhóm + select Loại + input Tên hiển thị
- Danh sách file: bảng + nút Xóa (confirm dialog trước khi xóa)
- Nhóm/Loại: form thêm + danh sách + nút Xóa (confirm)
- Log: 100 log gần nhất, bảng có cột action / tên file / IP / thời gian

**Màu sắc:** Accent `#2563EB` (xanh dương), nền `#F8FAFC`, font `system-ui`

---

## 7. Biến môi trường (.env.example)

```env
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
SESSION_SECRET=your-very-long-random-secret-here
MAX_FILE_SIZE_MB=100
APP_NAME=Quản Lý File
```

---

## 8. Deploy

- **Process manager:** PM2 (`pm2 start server.js --name webfilemanager`)
- **Web server:** Nginx reverse proxy HTTP → `localhost:PORT`
- **Startup:** `pm2 startup` + `pm2 save`
- **Storage path:** `/home/ubuntu/webfilemanager/storage` (hoặc theo cấu hình VPS)

---

## 9. Khởi tạo tự động

Khi `server.js` khởi động:
- Tạo `/storage/files/` nếu chưa có
- Tạo `/storage/data/` nếu chưa có
- Tạo mỗi file JSON với mảng rỗng `[]` nếu chưa tồn tại
- Không throw error khi JSON rỗng

---

## 10. Dependencies

```json
{
  "express": "^4.18",
  "multer": "^1.4.5-lts.1",
  "express-session": "^1.17",
  "uuid": "^9.0",
  "dotenv": "^16.0"
}
```
