# THƯ VIỆN NHỎ – LITTLE READERS

Website học liệu song ngữ dành cho phụ huynh và giáo viên, hỗ trợ lựa chọn, biên tập và tổ chức hoạt động đọc. Ứng dụng dùng Next.js App Router, TypeScript và Tailwind CSS.

## Chạy local với D1 và R2

Yêu cầu Node.js 22.16+ và npm. Git cần cho lưu phiên bản và đóng ZIP. Wrangler được cài bằng npm; không cần Docker hay database server.

```bash
npm ci
npm run local:setup
npm run dev
```

Mở http://localhost:3000. D1 lưu database, R2 lưu ảnh/audio trong `.wrangler/state/`. Local mô phỏng cả hai bằng workerd, không cần tài khoản Cloudflare. Lệnh setup áp dụng schema và nhập `.site-transfer/` trong ZIP hoặc `.data/sites-transfer/` trên máy gốc. Nó từ chối ghi đè dữ liệu đã có và không nạp lại snapshot đã nhập. Bản cài không có snapshot khởi tạo database trống; chạy `node scripts/setup-local-admin.mjs` để tạo quản trị đầu tiên.

Ứng dụng lấy dữ liệu động từ D1, đọc tệp qua R2 với cùng đường dẫn `/media/...`. Bản PGlite và tệp media cũ trong `.data/` vẫn được giữ làm nguồn khôi phục, không còn là database đang chạy. Không xóa `.wrangler/state/` để cập nhật code.

## Build và đóng gói

```bash
npm run lint
npm run build:sites
npm run preview:sites
```

Preview bản Worker tại http://localhost:3001 với cùng D1/R2 local. `npm start` cũng mở preview; `next start` không cung cấp bindings D1/R2. Dừng preview trước khi build lại để tránh khóa thư mục trên Windows. `npm run build` chỉ kiểm tra build Next.js, chưa tạo Worker.

```bash
npm run data:export
npm run package:sites
```

ZIP trong `.data/packages/` chứa mã nguồn, toàn bộ `public/`, snapshot D1, tất cả tệp R2 và kế hoạch nhập dữ liệu. Chương trình đối chiếu giá trị database, checksum media và từng file trong ZIP. ZIP chứa bản ghi tài khoản và hash mật khẩu, cần giữ riêng tư. Không chứa `.env`, mật khẩu khởi tạo dạng text, `node_modules`, Git hoặc cache build.

Mã nguồn nằm tại [mqvinh/thuviennho](https://github.com/mqvinh/thuviennho), nhánh `main`. Repo chứa cấu hình build, schema D1 và toàn bộ ảnh/font tĩnh trong `public/`. Dữ liệu truyện, tài khoản và ảnh/audio tải lên được chuyển bằng ZIP riêng tư; clone repo chưa có các dữ liệu này.

Xem [HUONG_DAN_TRIEN_KHAI_SITES.md](HUONG_DAN_TRIEN_KHAI_SITES.md) để biết bước nhập lần đầu và cập nhật từ Git. D1/R2 local và hosted là hai bộ dữ liệu riêng; deploy code không tự đồng bộ dữ liệu. Push GitHub cũng không tự tạo hoặc cập nhật Site. Chưa có công cụ Sites hoặc project_id trong phiên IDE này, nên chưa tạo deployment online.

Khả năng triển khai lên GPT Sites cần được đối chiếu với [điều kiện của nền tảng](https://learn.chatgpt.com/docs/sites) và cách sử dụng thực tế; xem hướng dẫn triển khai. Bản Worker/D1/R2 cũng có thể dùng cho hosting riêng.

## Cấu trúc chính

- `src/app/`: routes và giao diện Next.js.
- `database/d1/migrations/`: schema D1 và các migration có phiên bản.
- `scripts/local-setup.mjs`: khởi tạo local và chuyển dữ liệu an toàn.
- `scripts/package-sites.mjs`: xuất dữ liệu hiện tại, tạo và kiểm tra ZIP.
- `wrangler.jsonc`: runtime Worker và bindings local `DB`, `MEDIA`.
- `.openai/hosting.json`: tên bindings cho Sites; project_id chỉ do nền tảng cấp.
- `database/local.sql` và SQL PostgreSQL cũ: nguồn lịch sử cho chuyển đổi/kiểm thử, không tự nạp vào D1.
- `KE_HOACH_TRIEN_KHAI.md`: kế hoạch tổng thể.
- `KE_HOACH_CHUC_NANG.md`: backlog code theo chức năng.

Không commit secret key vào Git hoặc đưa secret vào biến `NEXT_PUBLIC_*`.

## Các chức năng local đã bổ sung

Sáu khu vực đã có luồng sử dụng: đọc/nghe theo câu, từ vựng/yêu thích, thử tài chấm ở server, nhật ký có vẽ/chọn ảnh, tiến độ và huy hiệu trên thiết bị. Khu vực `/admin` có tài khoản local, nhập học liệu, quản lý tệp và duyệt xuất bản. Có thêm 20 bản thảo, chưa xuất bản tự động.

Xem `HUONG_DAN_SU_DUNG_LOCAL.md` để đăng nhập, cấp tài khoản và cấu hình AI. `KE_HOACH_THU_NGHIEM.md` là hướng dẫn buổi đọc và mẫu thu phản hồi; chưa có thử nghiệm thực tế.

Giao diện dùng mẫu Kệ sách ấm áp. Ảnh góc đọc ở `public/images/reading-corner.jpg` tải từ https://images.unsplash.com/photo-1481627834876-b7833e8f5570; bìa mặc định dựng bằng HTML/CSS, bìa giáo viên tải lên được giữ nguyên.
