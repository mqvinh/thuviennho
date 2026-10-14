# Vercel với dữ liệu D1 và ảnh/audio R2

Website Next.js chạy trên Vercel. Một Worker nhỏ trên Cloudflare cung cấp kết nối riêng tới D1/R2, bảo vệ bằng secret. Mã nguồn, schema và định dạng dữ liệu dùng chung với bản local; không cần chuyển dữ liệu sang loại database khác.

## Vì sao bản deploy trước lỗi

Log `Cannot find package 'wrangler' ... digest: 335975728` xuất hiện vì bản cũ gọi `getCloudflareContext()` trên Vercel. Adapter cố mở trình giả lập Wrangler dành cho local, nhưng gói này không có trong runtime Vercel. Thêm Wrangler vào production dependencies không tạo ra database hoặc kho media hosted.

Bản hiện tại chọn kết nối remote khi có `VERCEL=1` hoặc biến `LITTLE_READERS_BACKEND_URL`. Runtime Vercel không gọi Wrangler. Wrangler chỉ dùng trên máy phát triển để tạo/deploy backend; không cài trình giả lập vào Vercel Function.

## 1. Chuẩn bị Cloudflare

Cần tài khoản Cloudflare có Workers, D1 và R2. Nếu chưa có, tạo tài khoản và bật R2 trong dashboard trước. Các lệnh sau chạy trong thư mục gốc project với Node.js 22.16+:

```powershell
npm ci
npx wrangler login
```

Chỉ tạo tài nguyên nếu chưa có:

```powershell
npx wrangler d1 create little-readers
npx wrangler r2 bucket create little-readers-media
```

Trong `wrangler.backend.jsonc`, thay `database_id` toàn số 0 bằng ID database vừa tạo. Nếu dùng tài nguyên đã có, điền đúng `database_id`, `database_name` và `bucket_name`. Giữ bindings là `DB` và `MEDIA`. ID toàn số 0 chỉ là cấu hình local; không dùng để deploy hosted.

Backend tên `little-readers-backend`, riêng với bản Worker chạy toàn bộ website. `wrangler.jsonc` vẫn dành cho local và bản website Cloudflare; không cần thay state local để triển khai Vercel.

## 2. Deploy backend và đặt secret

```powershell
npm run backend:deploy
npx wrangler secret put BACKEND_TOKEN --config wrangler.backend.jsonc
```

Lệnh đầu trả URL dạng `https://little-readers-backend.<subdomain>.workers.dev`. Worker chưa có token sẽ trả 503, không mở dữ liệu công khai. Khi lệnh đặt secret hỏi giá trị, nhập một token ngẫu nhiên 64 ký tự hex. Có thể tạo token trên máy bằng:

```powershell
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Lưu token riêng để dùng lại trong cấu hình Vercel. Không đưa token vào Git, `vercel.json`, `wrangler.backend.jsonc` hoặc biến `NEXT_PUBLIC_*`.

Tạo `.env.remote` từ `.env.remote.example` và điền:

```dotenv
LITTLE_READERS_BACKEND_URL=https://little-readers-backend.YOUR_SUBDOMAIN.workers.dev
LITTLE_READERS_BACKEND_TOKEN=the-same-token-as-BACKEND_TOKEN
```

URL là origin HTTPS, không kèm path, query hoặc thông tin đăng nhập. `.env.remote` được Git và gói ZIP bỏ qua. Chỉ bản `.example` với giá trị minh họa được commit.

## 3. Chuyển nguyên dữ liệu lần đầu

Trên máy đang có dữ liệu local, tạm ngừng chỉnh học liệu hoặc upload trong lúc xuất:

```powershell
npm run data:export
npm run remote:setup
npm run remote:verify
```

Snapshot mới và toàn bộ ảnh/audio nằm trong `.data/current-sites-transfer/`. Công cụ nhập giữ ID, thứ tự câu/từ/câu hỏi, trạng thái, tài khoản, hash mật khẩu và đường dẫn `/media/...`; kiểm tra mọi giá trị database và SHA-256 của tệp. Tệp chưa gắn vào truyện cũng được giữ.

Nếu dùng thư mục `.site-transfer/` đã giải nén từ ZIP riêng tư:

```powershell
npm run remote:setup -- --from .site-transfer
npm run remote:verify -- --from .site-transfer
```

Không cần đưa database, snapshot hoặc media riêng tư lên GitHub/Vercel. Công cụ chỉ nhập lần đầu vào database rỗng, từ chối ghi đè dữ liệu đã có và bỏ qua snapshot đã nhập. Khi nhập bị gián đoạn, chạy lại cùng snapshot để tiếp tục từ checkpoint. Không đổi snapshot trong lúc có lần nhập chưa hoàn tất.

Backend dùng `D1.batch()` native cho từng batch SQL; lỗi guard hoặc constraint rollback toàn bộ batch. Client không tự retry lệnh ghi. Ảnh/audio được upload trước các bản ghi tham chiếu.

Local và remote là hai bộ dữ liệu riêng. Chuyển code không tự đồng bộ những truyện sửa ở hai nơi. Nhật ký, từ yêu thích và tiến độ trong localStorage cần tải/khôi phục bản sao riêng khi đổi domain.

## 4. Cấu hình Vercel và redeploy

Trong project Vercel liên kết `mqvinh/thuviennho`:

- **Framework Preset:** Next.js.
- **Root Directory:** thư mục chứa `package.json` ở gốc repo (`./`), không chọn `src/`.
- **Node.js Version:** 22.x.
- **Install Command:** `npm ci`.
- **Build Command:** `npm run build:vercel`.
- **Output Directory:** để mặc định của Next.js.

`vercel.json` đã đặt framework và hai lệnh cài/build. Không dùng `build:sites`, `.open-next/` hoặc `wrangler deploy` làm build Vercel.

Ở **Settings → Environment Variables**, thêm hai biến trong `.env.remote` cho **Production**. `LITTLE_READERS_BACKEND_TOKEN` phải giống `BACKEND_TOKEN` trên Worker. Nếu cần Preview, nên dùng backend và dữ liệu riêng cho môi trường thử.

Redeploy commit mới sau khi nhập dữ liệu và cấu hình biến môi trường. Đổi environment variables không cập nhật các deployment đã chạy; cần một deployment mới.

Kiểm tra trang chủ, chi tiết truyện, đọc/nghe, ảnh/audio và đăng nhập quản lý. Chỉ xác nhận online khi đã mở và kiểm tra URL thật. Phiên IDE không có quyền truy cập dashboard Vercel thay cho chủ tài khoản.

Vercel giới hạn payload vào Function ở 4,5 MB (xem [Functions limits](https://vercel.com/docs/functions/limitations)), nên form và API trong bản Vercel cùng giới hạn tệp mới ở **4 MB**. Bản local/Workers vẫn nhận 5 MB. Nhập dữ liệu ban đầu bằng CLI đi thẳng tới backend nên không chịu giới hạn request của Vercel; ảnh/audio hiện có được giữ nguyên. Giới hạn riêng của backend cho mỗi ảnh/audio là 5 MB.

## 5. Cập nhật và sao lưu

Sau khi sửa code, kiểm tra rồi commit/push nhánh `main`; Vercel có thể build deployment mới từ repo đã liên kết. Giữ nguyên URL backend, secret và bindings để tiếp tục dùng dữ liệu hiện có.

Nếu có migration schema mới, áp dụng bằng:

```powershell
npm run remote:migrate
```

Lệnh này chỉ áp dụng migration chưa chạy, không nhập snapshot, không reset dữ liệu và không xóa R2. Cập nhật backend bằng `npm run backend:deploy` khi mã gateway thay đổi; secret đã đặt được giữ lại.

Sao lưu dữ liệu online:

```powershell
npm run remote:export
```

Bản sao ở `.data/remote-sites-transfer/`, riêng với snapshot local. Có thể chỉ định thư mục mới bằng `npm run remote:export -- --out .data/remote-backups/my-backup`. Giữ các bản sao riêng tư vì có dữ liệu tài khoản và hash mật khẩu.

## Chẩn đoán kết nối

| Log | Cách xử lý |
|---|---|
| `Configure LITTLE_READERS_BACKEND_URL ...` | Thêm đủ hai biến trên Vercel và redeploy. |
| `Library backend (401): Unauthorized` | Đối chiếu secret Vercel với `BACKEND_TOKEN` trên Worker. |
| `Library backend (503): Backend configuration is incomplete` | Kiểm tra secret và bindings `DB`, `MEDIA` trong backend đã deploy. |
| `no such table` hoặc chưa có cài đặt website | Nhập dữ liệu lần đầu vào backend đã chọn; không thay bằng seed mẫu. |
| `Refusing to overwrite non-empty ...` | Target đã có dữ liệu; giữ nguyên và kiểm tra backend/snapshot đang chọn. |
| `Wrangler` vẫn được gọi ở runtime Vercel | Deployment đang dùng code cũ hoặc thiếu nhánh `VERCEL=1`; kiểm tra commit và cấu hình build. |
