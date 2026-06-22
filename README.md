# Quản Lý File — Web App

Ứng dụng quản lý và chia sẻ file chạy trên VPS Ubuntu. Không dùng database — dữ liệu lưu bằng JSON.

## Chạy local

```bash
git clone <repo> webfilemanager && cd webfilemanager
npm install
cp .env.example .env
# Chỉnh sửa .env — bắt buộc đổi ADMIN_PASSWORD và SESSION_SECRET
npm start
```

- Client: http://localhost:3000
- Admin: http://localhost:3000/admin

## Deploy VPS Ubuntu + Nginx + PM2

### 1. Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Cài PM2

```bash
sudo npm install -g pm2
```

### 3. Upload source lên VPS

```bash
# Tùy chọn A — SCP
scp -r ./webfilemanager ubuntu@YOUR_VPS_IP:/home/ubuntu/

# Tùy chọn B — Git
ssh ubuntu@YOUR_VPS_IP
git clone <repo> /home/ubuntu/webfilemanager
```

### 4. Cấu hình .env

```bash
cd /home/ubuntu/webfilemanager
cp .env.example .env
nano .env
# Bắt buộc đổi ADMIN_PASSWORD và SESSION_SECRET thành giá trị ngẫu nhiên mạnh
```

### 5. Cài dependencies và khởi động với PM2

```bash
cd /home/ubuntu/webfilemanager
npm install --production
pm2 start ecosystem.config.js
pm2 startup   # Copy lệnh hiển thị và chạy với sudo
pm2 save
```

### 6. Kiểm tra app đang chạy

```bash
pm2 status
curl http://localhost:3000
# Expected: HTML của trang client
```

### 7. Cài và cấu hình Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo nano /etc/nginx/sites-available/webfilemanager
```

Nội dung file cấu hình Nginx:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Khớp với MAX_FILE_SIZE_MB + dư 10MB
    client_max_body_size 110M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/webfilemanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

App live tại: **http://YOUR_DOMAIN_OR_IP**  
Admin tại: **http://YOUR_DOMAIN_OR_IP/admin**

## Cập nhật app

```bash
cd /home/ubuntu/webfilemanager
git pull
npm install --production
pm2 restart webfilemanager
```

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `PORT` | Port lắng nghe | `3000` |
| `ADMIN_USERNAME` | Tên đăng nhập admin | `admin` |
| `ADMIN_PASSWORD` | Mật khẩu admin | **Bắt buộc đổi** |
| `SESSION_SECRET` | Secret cho session cookie | **Bắt buộc đổi** |
| `MAX_FILE_SIZE_MB` | Giới hạn dung lượng file | `100` |
| `APP_NAME` | Tên hiển thị | `Quản Lý File` |

## Bảo mật

- File nguy hiểm bị chặn: `.php .exe .sh .bat .cmd .js .py .asp` và các biến thể
- Storage không bao giờ được expose làm static directory
- Mọi download đi qua route backend với kiểm tra path traversal
- Session admin dùng httpOnly cookie
- **Bắt buộc thay `ADMIN_PASSWORD` và `SESSION_SECRET`** trước khi deploy production
