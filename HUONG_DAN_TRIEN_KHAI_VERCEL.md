# Triển khai Vercel với Supabase

Vercel chạy website Next.js. Một project riêng trên Supabase cung cấp PostgreSQL và Storage. Không cần D1, R2, tài khoản Cloudflare hoặc Worker gateway cho bản Vercel hiện tại. Giữ nguyên project Vercel và repo GitHub đang dùng.

## 1. Tạo project Supabase

Vào https://supabase.com/dashboard, đăng ký/đăng nhập và chọn **New project**. Chọn tổ chức gói Free, đặt tên project, mật khẩu database và khu vực gần Việt Nam (Singapore nếu có). Chờ project sẵn sàng.

Project Supabase chứa database và kho tệp; project Vercel vẫn chứa bản deploy website. Hai dịch vụ có vai trò riêng. Gói Free có hạn mức và có thể tạm dừng project khi không hoạt động; tham khảo https://supabase.com/pricing.

Bản tích hợp này dùng HTTPS và secret key trên server; không cần cung cấp connection string PostgreSQL hoặc mật khẩu database cho ứng dụng. Không gửi secret vào chat.

## 2. Khởi tạo schema một lần

Trong Supabase, mở **SQL Editor → New query**. Dán toàn bộ nội dung `database/supabase/001_library.sql` rồi chạy.

File tạo schema riêng `little_readers`, các bảng đúng cấu trúc học liệu hiện tại và hàm `public.library_batch`. Không nạp seed mẫu, không ghi đè dữ liệu. Chạy lại file giữ nguyên nội dung đã có. Không dùng các file PostgreSQL/seed lịch sử ở thư mục `database/` để khởi tạo bản này.

Hàm RPC chỉ cấp quyền cho `service_role`, dùng SECURITY INVOKER. `anon` và `authenticated` không có quyền gọi hàm hoặc đọc schema riêng. Mỗi batch là một giao dịch PostgreSQL: lỗi điều kiện hoặc constraint hủy toàn bộ các lệnh ghi trong batch. Secret key chỉ được dùng trong Next.js server và công cụ chuyển dữ liệu, không đưa vào trình duyệt.

Khi có migration mới, chạy file migration được cung cấp bằng SQL Editor trước khi deploy code tương ứng. Không chạy lại dữ liệu ban đầu để cập nhật schema.

## 3. Cấu hình riêng tư trên máy

Sao chép `.env.supabase.example` thành `.env.supabase`, điền:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_SECRET_KEY
SUPABASE_MEDIA_BUCKET=little-readers-media
```

Lấy Project URL trong **Connect** hoặc **Settings → Data API**; lấy secret key trong **Settings → API Keys**. Dùng secret key bắt đầu bằng `sb_secret_`; nếu project cũ chỉ có JWT `service_role`, có thể dùng biến `SUPABASE_SERVICE_ROLE_KEY` thay thế. Không dùng publishable/anon key.

URL chỉ gồm origin HTTPS, không thêm `/rest/v1`, `/storage/v1`, query hoặc credentials. Không đặt secret dưới tên `NEXT_PUBLIC_*`, không đưa vào `vercel.json`, Git hoặc ZIP. `.env.supabase` đã được bỏ qua; chỉ file `.example` với giá trị minh họa được commit.

Kiểm tra kết nối:

```powershell
npm run supabase:check
```

CLI đọc `.env.supabase`; `npm run dev` không tự nạp file này, nên dữ liệu local vẫn tách riêng.

## 4. Chuyển nguyên dữ liệu lần đầu

Máy phát triển hiện đã có snapshot riêng `.data/vercel-initial-transfer/`. Snapshot giữ nguyên truyện, thứ tự câu/từ/câu hỏi, trạng thái, tài khoản và hash mật khẩu, icon/logo, đường dẫn `/media/...`, toàn bộ tệp kể cả tệp chưa gắn vào nội dung.

Nếu cần xuất dữ liệu mới trước lần nhập đầu tiên, dừng chỉnh học liệu/upload trong lúc xuất:

```powershell
node scripts/export-data.mjs --out .data/vercel-initial-transfer
```

Sau đó nhập và kiểm tra:

```powershell
npm run supabase:setup
npm run supabase:verify
```

Công cụ tự tạo bucket riêng tư `little-readers-media`. Nếu bucket có sẵn đang public, công cụ từ chối để chủ tài khoản chuyển về private trước. Tệp được upload nguyên byte, không đổi kích thước hoặc tên. Website tiếp tục phục vụ qua `/media/...`, giữ kiểm tra quyền xem tệp nháp/riêng tư và chỉ cho xem công khai các tệp đang được xuất bản.

Công cụ đối chiếu mọi giá trị database và SHA-256 của mỗi tệp. Số 0/1 từ D1 được chuyển sang boolean PostgreSQL và kiểm tra theo cùng ý nghĩa. Văn bản, ngày tạo, ID, thứ tự và chuỗi JSON được giữ nguyên.

Công cụ chỉ nhập vào đích rỗng, từ chối ghi đè dữ liệu hiện có và bỏ qua snapshot đã nhập. Nếu bị ngắt, chạy lại cùng snapshot để tiếp tục từ checkpoint. Không xuất lại/đổi snapshot trong lúc có lần nhập chưa hoàn tất. Không tự retry lệnh ghi khi HTTP lỗi.

Nếu nguồn là `.site-transfer/` từ ZIP riêng tư:

```powershell
node --env-file=.env.supabase scripts/supabase-setup.mjs --from .site-transfer
node --env-file=.env.supabase scripts/supabase-setup.mjs --verify --from .site-transfer
```

Không đưa snapshot hoặc dữ liệu tài khoản lên GitHub. Tiến độ, nhật ký và từ yêu thích trong localStorage thuộc từng domain; dùng chức năng sao lưu/khôi phục thiết bị khi đổi domain.

## 5. Cập nhật project Vercel đang có

Giữ repo `mqvinh/thuviennho`, nhánh `main` và project Vercel hiện tại. Trong **Settings → Environment Variables**, thêm cho Production:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (hoặc legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_MEDIA_BUCKET=little-readers-media`

Bỏ hai biến gateway Cloudflare cũ `LITTLE_READERS_BACKEND_URL` và `LITTLE_READERS_BACKEND_TOKEN` khỏi cấu hình Vercel để tránh nhầm. Bản Vercel hiện chọn Supabase; các biến cũ không thay thế được cấu hình mới.

Thiết lập build:

- Framework: Next.js; Node.js: 22.x.
- Root Directory: gốc repo có `package.json` (`./`).
- Install Command: `npm ci`.
- Build Command: `npm run build:vercel`.
- Output Directory: mặc định của Next.js.

`vercel.json` đã khai báo framework và lệnh build. Sau khi khởi tạo schema, nhập dữ liệu và đặt env, redeploy commit mới nhất. Thay environment variables cần tạo deployment mới.

Kiểm tra trang chủ, đọc/nghe, từ vựng, thử tài, ảnh/audio, đăng nhập và chỉnh sửa quản lý trên URL thật. Gói mã nguồn hoặc build local chưa đồng nghĩa đã có website online.

Form/API trên Vercel cùng giới hạn tệp upload mới ở 4 MB để nằm dưới giới hạn payload 4,5 MB của Vercel Functions. Local vẫn nhận 5 MB. Nhập dữ liệu ban đầu đi trực tiếp tới Storage, giữ nguyên các tệp hiện có (giới hạn mỗi tệp 5 MB trong công cụ).

## 6. Local, cập nhật và sao lưu

`npm run dev` tiếp tục dùng D1/R2 giả lập và dữ liệu hiện có trong `.wrangler/state/`; không cần Cloudflare account, không cần R2 thanh toán. Không xóa thư mục state để cập nhật code. D1 hosted đã tạo trước đây không được bản Vercel sử dụng và không bị công cụ này xóa.

Có thể thử cùng backend Supabase ở local bằng `node --env-file=.env.supabase node_modules/next/dist/bin/next dev`, nhưng khi đó chỉnh sửa sẽ tác động trực tiếp tới project Supabase đã cấu hình. Dùng project thử riêng khi cần.

Sau khi sửa code, kiểm tra rồi commit/push `main`; project Vercel liên kết GitHub có thể tự build bản mới. Giữ nguyên Supabase project và bucket để tiếp tục dùng dữ liệu online. Deploy code không tự đồng bộ các chỉnh sửa dữ liệu giữa local và Supabase.

Dừng chỉnh học liệu/upload trong lúc sao lưu online:

```powershell
npm run supabase:export
```

Bản sao ở `.data/supabase-backup/`. Có thể chọn thư mục riêng bằng `node --env-file=.env.supabase scripts/supabase-setup.mjs --export --out .data/supabase-backups/my-backup`. Giữ bản sao riêng tư; không nhập bản sao đè vào backend đang có dữ liệu.

## Chẩn đoán

| Lỗi | Cách xử lý |
|---|---|
| `Configure SUPABASE_URL ...` | Thêm biến Supabase trong Vercel và redeploy. |
| Key không hợp lệ, 401/403 | Dùng secret/service_role key đúng project, không dùng publishable/anon. |
| Không tìm thấy `public.library_batch` | Chạy `database/supabase/001_library.sql` trong SQL Editor đúng project; chờ Data API cập nhật schema cache. |
| Permission denied | Chạy đủ file schema để cấp quyền service_role; không mở quyền cho anon/authenticated. |
| Bucket phải private | Tắt Public bucket trong Storage trước khi nhập. |
| `Refusing to overwrite non-empty ...` | Đích đã có dữ liệu; kiểm tra đúng project/snapshot, không reset hoặc seed lại. |
| `Another snapshot import is unfinished` | Chạy lại snapshot gốc đang nhập, không trộn hai bản xuất. |
| `Wrangler` vẫn được gọi trên Vercel | Kiểm tra deployment đang dùng commit mới và build command đúng. |
