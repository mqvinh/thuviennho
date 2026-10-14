# THƯ VIỆN NHỎ – LITTLE READERS

Website đọc mở rộng song ngữ dành cho học sinh lớp 2. Ứng dụng dùng Next.js App Router, TypeScript và Tailwind CSS.

## Chạy local cùng database local

Yêu cầu Node.js 20+ và npm.

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Project dùng PGlite, PostgreSQL nhúng chạy ngay trong tiến trình Next.js; không cần Docker, cài PostgreSQL server hay tạo tài khoản Supabase. Schema và truyện mẫu được khởi tạo từ `database/local.sql` trong lần chạy đầu tiên. Database được lưu bền vững ở `.data/little-readers/` và được Git bỏ qua.

Trang chủ và trang đọc truyện lấy dữ liệu trực tiếp từ database local. Muốn tạo lại database từ đầu, dừng server, xóa thư mục `.data/little-readers/`, rồi chạy lại `npm run dev`. Có thể sửa hoặc bổ sung dữ liệu mẫu trong `database/local.sql`.

## Database khi triển khai

Không cần Supabase local để phát triển. `database/local.sql` dành cho database nhúng ở máy phát triển. Khi triển khai hosted Supabase, dùng schema chuẩn ở `database/001_initial_library_schema.sql` và dữ liệu mẫu tùy chọn ở `database/seed.sql`.

Khi sẵn sàng triển khai dữ liệu:

1. Tạo project PostgreSQL/Supabase riêng.
2. Chạy nội dung `database/001_initial_library_schema.sql` trong SQL Editor của database.
3. Chạy `database/seed.sql` nếu muốn nạp truyện demo.
4. Cấu hình các biến kết nối an toàn trong Vercel Project Settings → Environment Variables.
5. Deploy mã nguồn lên Vercel bằng Git repository hoặc Vercel CLI.

Vercel triển khai ứng dụng Next.js; nó không tự tạo database chỉ từ file SQL. SQL và mã nguồn là phần chính cần chuẩn bị, nhưng ứng dụng còn cần database đã tạo, biến môi trường, cùng media (tranh/audio) và bucket/policies nếu tính năng đó sử dụng.

## Cấu trúc chính

- `src/app/`: routes và giao diện Next.js.
- `database/local.sql`: schema và dữ liệu mẫu cho database local PGlite.
- `database/001_initial_library_schema.sql`: schema, index và RLS policies cho Supabase hosted.
- `database/seed.sql`: dữ liệu demo tùy chọn.
- `KE_HOACH_TRIEN_KHAI.md`: kế hoạch tổng thể.
- `KE_HOACH_CHUC_NANG.md`: backlog code theo chức năng.

Không commit secret key vào Git hoặc đưa secret vào biến `NEXT_PUBLIC_*`.

## Các chức năng local đã bổ sung

Sáu khu vực đã có luồng sử dụng: đọc/nghe theo câu, từ vựng/yêu thích, thử tài chấm ở server, nhật ký có vẽ/chọn ảnh, tiến độ và huy hiệu trên thiết bị. Khu vực `/admin` có tài khoản local, nhập học liệu, quản lý tệp và duyệt xuất bản. Có thêm 20 bản thảo, chưa xuất bản tự động.

Xem `HUONG_DAN_SU_DUNG_LOCAL.md` để đăng nhập, cấp tài khoản và cấu hình AI. `KE_HOACH_THU_NGHIEM.md` là hướng dẫn buổi đọc và mẫu thu phản hồi; chưa có thử nghiệm thực tế.

Giao diện dùng mẫu Kệ sách ấm áp. Ảnh góc đọc ở `public/images/reading-corner.jpg` tải từ https://images.unsplash.com/photo-1481627834876-b7833e8f5570; bìa mặc định dựng bằng HTML/CSS, bìa giáo viên tải lên được giữ nguyên.
