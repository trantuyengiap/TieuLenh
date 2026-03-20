# TieuLenh Control Center

Ứng dụng được viết lại hoàn toàn theo mô hình **client-server** để thay thế bản HTML + localStorage cũ. Mục tiêu là nhiều máy tính trong cùng mạng LAN hoặc qua internet có thể đăng nhập và nhìn thấy **cùng một danh sách user, nhân viên, tiêu lệnh, lịch sử và kết quả kiểm tra**.

## Vì sao bản cũ gặp lỗi “tạo user ở máy này nhưng máy khác không thấy”?

Bản cũ sử dụng:

- `localStorage` để lưu user, nhân viên, lịch sử.
- phiên đăng nhập cục bộ theo từng trình duyệt/tab.
- hàm hash đơn giản kiểu `simpleHash` không phù hợp cho mật khẩu thật.
- không có backend, không có database dùng chung.

Hệ quả:

- tạo user ở máy A chỉ nằm trong bộ nhớ trình duyệt máy A.
- máy B không thể nhìn thấy dữ liệu đó vì không có server trung tâm.
- không thể đồng bộ realtime giữa màn hình Admin và màn hình LED.
- reload, đổi trình duyệt, đổi máy đều có thể mất hoặc lệch trạng thái.

## Kiến trúc mới

```text
/client   -> React + Vite (UI đăng nhập, admin, LED)
/server   -> Node.js + Express + Socket.IO + Prisma
/database -> SQLite qua Prisma (dễ nâng cấp sang PostgreSQL sau này)
```

### Những gì đã được thay thế khỏi localStorage

- **Danh sách user**: từ localStorage -> bảng `users` trong database.
- **Danh sách nhân viên**: từ localStorage -> bảng `employees`.
- **Bộ tiêu lệnh**: từ localStorage -> bảng `command_sets`/`command_items` qua model `CommandSet` + `CommandItem`.
- **Lịch sử kiểm tra/kết quả**: từ localStorage -> bảng `drill_sessions` + `session_results`.
- **Trạng thái màn hình LED**: từ localStorage/tab state -> `app_settings.led_state` + Socket.IO.
- **Đăng nhập**: từ session cục bộ -> JWT lưu trong cookie HttpOnly, xác thực ở server.

Nhờ đó, khi tạo user hoặc cập nhật dữ liệu ở máy A, máy B sẽ nhìn thấy cùng một dữ liệu vì tất cả cùng đọc/ghi từ database thông qua API server.

## Tính năng chính

- Đăng nhập / đăng xuất.
- Quản trị người dùng: thêm, sửa trạng thái, xóa, đổi mật khẩu, khóa/mở khóa, role `SUPERADMIN` / `ADMIN` / `VIEWER`.
- Quản lý nhân viên.
- Quản lý bộ tiêu lệnh theo nhân viên/chức danh.
- Quay số ngẫu nhiên hoặc chọn thủ công.
- Màn hình LED realtime bằng Socket.IO.
- Lưu lịch sử và kết quả đánh giá đạt/chưa đạt.
- Thống kê tổng hợp.
- Import / export JSON hoặc Excel.
- Seed tài khoản mặc định `superadmin` khi khởi tạo hệ thống.

## Bảo mật

- Không dùng localStorage để lưu danh sách user.
- Mật khẩu được hash bằng `bcryptjs`.
- Xác thực bằng JWT trong cookie `HttpOnly`.
- Middleware kiểm tra role ở backend.
- Validate request bằng `zod`.
- `VIEWER` không vào được trang admin.
- Không dùng `simpleHash` tự viết.

## Schema database

Prisma schema ở `server/prisma/schema.prisma` gồm các model:

- `User`
- `Employee`
- `CommandSet`
- `CommandItem`
- `DrillSession`
- `SessionResult`
- `AppSetting`

SQLite đang được dùng mặc định. Khi cần đổi sang PostgreSQL, chỉ cần đổi datasource Prisma và migrate lại, phần route/service vẫn giữ nguyên vì đang đi qua Prisma ORM.

## API chính

Tất cả endpoint được mount dưới tiền tố `/api`:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST|PUT|DELETE /api/users`
- `GET|POST|PUT|DELETE /api/employees`
- `GET|POST|PUT|DELETE /api/commands`
- `GET /api/sessions`
- `GET /api/sessions/current`
- `POST /api/sessions/start`
- `POST /api/sessions/:id/result`
- `POST /api/sessions/reset-led`
- `GET /api/stats`
- `GET /api/system/export`
- `POST /api/system/import`

## Chạy local

### 1. Chuẩn bị biến môi trường

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 2. Cài package

```bash
npm install
```

### 3. Chạy ứng dụng

```bash
npm run dev
```

Lệnh trên sẽ:

- cài Prisma client.
- tự tạo/cập nhật SQLite schema bằng `prisma db push`.
- chạy seed tạo `superadmin` mặc định.
- chạy Express server ở `http://localhost:4000`.
- chạy React client ở `http://localhost:5173`.

## Tài khoản mặc định

Sau lần khởi tạo đầu tiên:

- Username: `superadmin`
- Password: `Admin@123456`

Hãy đổi mật khẩu thật ngay khi triển khai nội bộ.

## Build production nội bộ

```bash
npm run build
```

Client build nằm trong `client/dist`.

## Gợi ý triển khai trên LAN

1. Chạy server ở một máy đóng vai trò trung tâm, ví dụ `192.168.1.10`.
2. Sửa `server/.env`:

```env
CLIENT_ORIGIN=http://192.168.1.10:5173
```

3. Sửa `client/.env`:

```env
VITE_API_URL=http://192.168.1.10:4000/api
VITE_SOCKET_URL=http://192.168.1.10:4000
```

4. Build client và phục vụ bằng web server nội bộ, hoặc dùng Vite preview trong môi trường thử nghiệm.
5. Các máy trong cùng mạng truy cập vào địa chỉ của server trung tâm.

## Import dữ liệu cũ

- Có thể export JSON/Excel từ hệ cũ rồi import vào endpoint `/api/system/import`.
- Phiên bản hiện tại đã có luồng import cơ bản cho dữ liệu nhân viên và khung mở rộng để map thêm user, bộ tiêu lệnh, lịch sử từ JSON legacy.
- Nên chuẩn hóa file JSON cũ theo nhóm `employees`, `commandSets`, `sessions`, `results` trước khi nhập hàng loạt.

## Realtime

- Khi admin bắt đầu phiên kiểm tra hoặc chốt kết quả, server sẽ lưu trạng thái mới nhất vào `AppSetting(key = led_state)`.
- Đồng thời Socket.IO phát event `led:update`, `session:update`, `stats:update`.
- Vì LED đọc trạng thái từ server khi load trang, nên reload vẫn không mất trạng thái hiện tại.

## Cấu trúc thư mục

```text
.
├── client
│   └── src
├── server
│   ├── prisma
│   └── src
└── README.md
```

## Hướng mở rộng tiếp theo

- Thêm refresh token hoặc session store Redis nếu triển khai internet thật.
- Bổ sung audit log chi tiết thao tác admin.
- Mở rộng import legacy đầy đủ cho mọi bảng.
- Thêm unit/integration test cho route và service.
- Chuyển SQLite sang PostgreSQL khi số lượng user tăng hoặc cần HA/backup tốt hơn.
