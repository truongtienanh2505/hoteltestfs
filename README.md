# Asteria Resort - Hotel ERP System

Asteria Resort (Hotel ERP FS) là hệ thống quản lý khách sạn và khu nghỉ dưỡng toàn diện, cung cấp cả cổng thông tin đặt phòng cho khách hàng (Customer Portal) lẫn hệ thống quản trị nội bộ cho nhân viên (Admin Dashboard).

Dự án được xây dựng dựa trên kiến trúc mạnh mẽ với **ASP.NET Core (Backend)** và **ReactJS (Frontend)**, hỗ trợ xử lý nghiệp vụ phức tạp như chống overbooking bằng Redis, cập nhật thông báo thời gian thực bằng SignalR, và phân quyền chi tiết (RBAC).

## 🚀 Công Nghệ Sử Dụng

### Backend (`HotelERP.BE`)
* **Framework:** .NET 8 (ASP.NET Core Web API)
* **Cơ Sở Dữ Liệu:** SQL Server & Entity Framework Core
* **Bộ Nhớ Đệm & Khóa Phân Tán:** Redis (dùng cho RedLock chống overbooking, lưu trữ tạm OTP/giữ chỗ).
* **Real-time:** SignalR (đẩy thông báo lập tức cho Admin, Receptionist, Guest).
* **Bảo Mật:** JWT Authentication, BCrypt (Mã hóa mật khẩu), Role-Based Access Control (RBAC).
* **Tiện Ích Khác:** Hangfire (Xử lý Background Jobs), Cloudinary (Lưu trữ ảnh), Gửi Email SMTP.

### Frontend (`HotelERP.FE`)
* **Framework:** ReactJS (Vite)
* **UI/UX:** Ant Design (được tùy chỉnh giao diện sang trọng), CSS thuần.
* **State Management:** Zustand
* **Kết Nối API:** Axios (kèm Interceptor tự động xử lý Refresh Token).

---

## 🛠 Tính Năng Nổi Bật

### 1. Phân Quyền Vai Trò Khắt Khe (RBAC)
* Hỗ trợ đa dạng chức danh: `Admin`, `Manager`, `Receptionist`, `Accountant`, `Housekeeping`, `WarehouseStaff`, `Guest`.
* Cấu hình phân quyền động dựa trên DB (`Role_Permissions`), phân chia rõ rệt các quyền từ quản lý giao dịch, kho bãi cho đến xem báo cáo Dashboard.

### 2. Động Cơ Đặt Phòng (Booking Engine)
* **Chống Overbooking:** Sử dụng thuật toán RedLock (Redis) để khóa tạm thời phòng vật lý trong lúc khách hàng thực hiện thanh toán (Holding trong 15 phút).
* **Giải phóng tự động:** Hangfire tự động chạy nền để quét và giải phóng các phòng bị giữ chỗ quá hạn nhưng chưa thanh toán.
* **Tự động xếp phòng:** Tìm kiếm và tự động phân bổ mã phòng vật lý tối ưu khi khách hàng đặt.
* Tích hợp hạng thành viên (Membership Tier), tự động giảm giá và tính điểm Loyalty Points.

### 3. Thông Báo Thời Gian Thực (Real-time Notifications)
* Tích hợp **SignalR** kết hợp với **Ant Design Popover**.
* Khách hàng sẽ nhận được thông báo in-app ngay khi đặt phòng thành công, được cấp voucher sinh nhật...
* Lễ tân/Quản lý sẽ lập tức nhận được thông báo pop-up khi có đơn đặt phòng mới, yêu cầu hủy, hay các hoạt động quan trọng trong khách sạn.

### 4. Báo Cáo Thống Kê (Dashboard)
* Lưu trữ dữ liệu dưới dạng Snapshot (Ảnh chụp dữ liệu) giúp tính toán cực nhanh.
* Hỗ trợ thống kê tự động theo: `DAILY`, `MONTHLY`, `QUARTERLY`, `YEARLY`.

---

## ⚙️ Hướng Dẫn Cài Đặt và Chạy Dự Án

### 1. Database (Cơ Sở Dữ Liệu)
* Mở SQL Server Management Studio (SSMS).
* Chạy nội dung của file `db/HotelManagementDB.sql` để khởi tạo cấu trúc bảng, dữ liệu mẫu, và hệ thống phân quyền mới nhất.

### 2. Cấu Hình Backend
1. Di chuyển vào thư mục `HotelERP.BE`:
   ```bash
   cd HotelERP.BE
   ```
2. Mở tệp `appsettings.json`, cập nhật chuỗi kết nối của bạn:
   * **ConnectionStrings.DefaultConnection**: Chuỗi kết nối tới SQL Server của bạn.
   * **Redis.ConnectionString**: Chuỗi kết nối tới Redis (Có thể dùng Upstash hoặc Redis local).
   * **JwtSettings**: Cấu hình khóa bí mật của JWT.
   * Cấu hình **Email** và **Cloudinary** (nếu cần upload ảnh).
3. Chạy Backend:
   ```bash
   dotnet run
   ```

### 3. Cấu Hình Frontend
1. Di chuyển vào thư mục `HotelERP.FE`:
   ```bash
   cd HotelERP.FE
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Chạy Frontend (Môi trường Dev):
   ```bash
   npm run dev
   ```
4. Giao diện sẽ hiển thị (thường là tại `http://localhost:5173/`).

---

## 📦 Tài Khoản Thử Nghiệm

* **Quản Trị Viên (Admin):** `admin@hotel.com` / `(mật khẩu của bạn)`
* **Quản Lý (Manager):** `manager@hotel.com`
* **Lễ Tân (Receptionist):** `reception1@hotel.com`
* **Thủ Kho (Warehouse):** (Có thể tạo trong trang quản trị)

*(Toàn bộ các tài khoản mẫu đã được khởi tạo theo script SQL ở thư mục `db/`)*

---
*Phát triển bởi đội ngũ Asteria Resort.*
