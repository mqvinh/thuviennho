# Một mã nguồn, local và hosting dùng D1/R2

Nếu deploy website lên Vercel, dùng [HUONG_DAN_TRIEN_KHAI_VERCEL.md](HUONG_DAN_TRIEN_KHAI_VERCEL.md). Bản Vercel hiện dùng Supabase PostgreSQL và Storage, không cần Cloudflare. Hướng dẫn bên dưới dành riêng cho bản Worker/Sites.

## Trạng thái và điều kiện của Sites

Dự án đã chuyển sang D1/R2, có bản build Worker bằng OpenNext và gói dữ liệu đầy đủ. Mã nguồn đã liên kết GitHub tại [mqvinh/thuviennho](https://github.com/mqvinh/thuviennho), nhánh `main`, remote `origin`. Đây là bước chuẩn bị kỹ thuật; chưa có Site online hoặc chứng nhận tương thích của nền tảng. Phiên IDE này không có công cụ provisioning/save-version/deploy của Sites.

Website được định hướng dành cho phụ huynh và giáo viên để lựa chọn, biên tập và tổ chức hoạt động đọc song ngữ. Các màn hình đọc/nghe, từ vựng, thử tài, nhật ký và hành trình hiện vẫn hỗ trợ hoạt động tương tác với người học.

Theo [OpenAI Docs](https://learn.chatgpt.com/docs/sites), Sites không hỗ trợ trải nghiệm nhắm tới trẻ dưới 13 tuổi hoặc tuổi đồng ý số áp dụng. Nền tảng cần đánh giá đối tượng và luồng sử dụng thực tế; thay đổi mô tả không tự xác nhận website đáp ứng điều kiện. Các bước dưới đây mô tả cách kiểm tra artifact và bảo toàn dữ liệu khi nền tảng xác nhận một cách sử dụng được hỗ trợ.

## Lấy mã nguồn từ GitHub

```bash
git clone https://github.com/mqvinh/thuviennho.git
cd thuviennho
```

Repo đã bao gồm các thành phần cần để cài và build:

- `src/` và `public/`: giao diện, API, ảnh minh họa, icon chủ đề và font.
- `package.json`, `package-lock.json` và các cấu hình Next.js, OpenNext, TypeScript: cài đúng phụ thuộc và build Worker.
- `wrangler.jsonc`, `.openai/hosting.json`: cấu hình runtime và tên bindings `DB`, `MEDIA`.
- `database/d1/migrations/`, `scripts/`, `tests/`: schema, công cụ chuyển dữ liệu và kiểm thử.
- Các tài liệu hướng dẫn local, triển khai và cập nhật.

Git không chứa `.env*`, mật khẩu dạng text, `.data/`, `.site-transfer/`, `.wrangler/`, `node_modules/` hoặc thư mục build. Dữ liệu ứng dụng và ảnh/audio tải lên vẫn được giữ trên máy gốc và trong ZIP riêng tư. Để lần triển khai đầu có đủ học liệu, cần chuyển cả gói này và thực hiện các bước nhập D1/R2 bên dưới; chỉ lấy repo sẽ chưa có dữ liệu hiện tại.

Khi giao việc cho agent có công cụ hosting, cung cấp link repo, nhánh/commit cần dùng và ZIP riêng tư. Yêu cầu đọc tài liệu này, kiểm tra điều kiện nền tảng, build bằng `npm ci` rồi `npm run build:sites`, và giữ nguyên dữ liệu/media khi nhập lần đầu. Nền tảng phải xác nhận hỗ trợ lấy code từ repo; tài liệu Sites hiện không xác lập một luồng tự deploy mỗi khi GitHub có push.

## Cài bản local từ repo hoặc ZIP

Nếu dùng repo và cần dữ liệu hiện tại, giải nén thư mục ẩn `.site-transfer/` từ ZIP riêng tư vào thư mục gốc của repo. Nếu dùng toàn bộ ZIP, giữ nguyên thư mục ẩn này khi giải nén. Cài Node.js 22.16+ và Git, sau đó:

```bash
npm ci
npm run local:setup
npm run dev
```

Setup chỉ nhập vào database trống. Nó giữ ID, slug, trạng thái, thứ tự, tài khoản, hash mật khẩu và các đường dẫn media. Không reset mật khẩu cũ. Nếu không có gói chuyển dữ liệu, setup chỉ khởi tạo database trống; có thể chạy `node scripts/setup-local-admin.mjs` để tạo quản trị đầu tiên. D1/R2 local lưu ở `.wrangler/state/v3/`; dev, preview và các script cùng dùng đường dẫn này. Việc sửa code và restart không làm mất dữ liệu.

`npm run data:verify` so sánh với snapshot nhập ban đầu. Khi đã chỉnh dữ liệu trên web, snapshot cũ có thể khác: xuất bản sao mới bằng `npm run data:export`, rồi kiểm tra bằng `node scripts/local-setup.mjs --verify --from .data/current-sites-transfer`.

Tranh nhật ký, từ yêu thích và tiến độ của học sinh vẫn nằm trong localStorage theo trình duyệt và origin. ZIP server không thể tự mang chúng sang domain khác; dùng chức năng tải/khôi phục bản sao ở Hành trình để chuyển riêng.

## Kiểm tra artifact Worker

```bash
npm run build:sites
npm run preview:sites
```

Worker: `.open-next/worker.js`, assets: `.open-next/assets/`. Preview mở cổng 3001. Dừng preview trước khi rebuild trên Windows. OpenNext có cảnh báo Windows; nếu phát sinh lỗi môi trường build, có thể build bằng WSL/Linux với cùng lockfile.

Next 16.4 có manifest `preview-props.json` mới; `scripts/prepare-opennext.mjs` bổ sung manifest thật vào adapter khi postinstall/build. Cache Components và Partial Prefetching đã tắt vì runtime Worker gặp lỗi chia sẻ timer giữa request. Không đổi sang Edge runtime; OpenNext chạy server Node qua `nodejs_compat`.

Đã kiểm tra lint, TypeScript, build Worker, rollback batch D1, nhập toàn bộ dataset gốc và chống nhập lặp. Kiểm thử trên Worker tách biệt xác minh chấm bài, phân quyền giáo viên/admin, upload ảnh/audio, lưu thứ tự/JSON, xuất bản/ẩn, tài khoản mới và hủy phiên sau đổi mật khẩu. Smoke test với dữ liệu thật đã kiểm tra trang desktop/mobile, không lỗi JavaScript/overflow và SHA-256 của các media được mở công khai.

`npm audit` hiện báo 9 mục high trong chuỗi phụ thuộc công cụ build/lint (gồm glob và braces). Chưa chạy `audit fix --force` vì đề xuất hạ adapter/Next tooling sang phiên bản khác, có thể phá tương thích Next 16.4. Các mục này vẫn cần được xử lý trước khi vận hành hosting thật; build và kiểm thử thành công không thay thế việc đó.

## Gói chuyển dữ liệu và nhập lần đầu lên hosted

Chạy `npm run package:sites` khi không có ai sửa học liệu hoặc upload tệp. Dữ liệu được xuất từ D1/R2 hiện tại và xác minh trước khi nén. ZIP bao gồm:

- Mã nguồn, lockfile, SQL migration, toàn bộ ảnh/font/tệp tĩnh trong `public/`.
- `.site-transfer/snapshot.json`: mọi bảng dữ liệu ứng dụng.
- `.site-transfer/manifest.json`: số bản ghi và SHA-256 của snapshot/media.
- `.site-transfer/media/`: tất cả object R2 với đúng tên gốc, kể cả tệp chưa gắn vào bản ghi.
- `.site-transfer/import-plan.json`: schema và các batch D1 có parameter, checkpoint và guard chống ghi đè.

Không đặt `.site-transfer/` vào `public/` hay commit vào Git. ZIP có dữ liệu tài khoản và hash mật khẩu, chỉ chuyển trong luồng riêng tư cho người có quyền.

Khi có công cụ hosting phù hợp, cần thực hiện đầy đủ:

1. Provision D1 binding `DB` và R2 binding `MEDIA`. Với Sites, giữ tên này trong `.openai/hosting.json`; nền tảng cấp `project_id`. ID toàn số 0 trong `wrangler.jsonc` chỉ dành cho local, không phải tài nguyên hosted.
2. Áp dụng các migration SQL theo thứ tự, ghi nhận trong `d1_migrations`. Không chạy PostgreSQL seed cũ hoặc tạo truyện mẫu thay thế dữ liệu hiện tại.
3. Đối chiếu SHA-256 rồi upload mọi media vào R2 bằng key trong manifest; giữ MIME PNG/JPG/WebP/MP3/WAV/OGG. Không đổi tên, resize hay recompress file.
4. Nếu database rỗng, chạy từng `statements` trong `import-plan.json` bằng **D1.batch atomic**. Guard sẽ từ chối database có dữ liệu. Nếu import bị gián đoạn, đọc `data_import_progress.next_index` và tiếp tục batch chưa chạy; nếu đã có `data_imports` với checksum snapshot thì bỏ qua nhập lần đầu.
5. Đối chiếu mọi giá trị/ID/thứ tự, số bản ghi, foreign key và SHA-256 của tất cả object. Có thể tái sử dụng `verifyTransfer` trong `scripts/lib/data-transfer.mjs` với bindings hosted do công cụ nền tảng cung cấp. Không bật endpoint import công khai.
6. Kiểm tra đăng nhập cũ, ảnh/audio, nháp và quyền truy cập, đọc truyện và chấm bài. Không chỉ kiểm tra lệnh build thành công.
7. Với Sites, lưu một version từ commit đã chọn, rồi deploy version qua công cụ Sites. Chỉ báo thành công khi nền tảng trả URL production và URL đã được kiểm tra.

Upload ZIP không tự chạy những bước nhập D1/R2 này. Không có CLI Sites được giả định trong dự án; `wrangler deploy` triển khai Cloudflare của bạn, không tương đương deploy GPT Sites.

## Cập nhật code từ local

Git đã được khởi tạo thật trên máy, có commit mốc trước chuyển đổi. Remote `origin` hiện trỏ tới `https://github.com/mqvinh/thuviennho.git`, nhánh làm việc là `main`. Sau khi sửa code trên local:

```bash
git status
npm run lint
npm run build:sites
git add .
git commit -m "Describe the change"
git push origin main
```

Trên một bản clone khác có working tree sạch, dùng `git pull --ff-only origin main` rồi `npm ci` để lấy phiên bản mới. Chỉ tạo lại ZIP bằng `npm run package:sites` khi cần gửi bản sao dữ liệu mới hoặc bàn giao trọn gói. Không cần đưa ZIP lên GitHub.

Giữ nguyên liên kết Site/project_id và bindings đã provision. Khi cập nhật deployment, chỉ đưa code và migration schema mới; **không nhập lại snapshot, không reset D1, không xóa R2**. Hosted data tiếp tục được giữ trong bindings hiện có. Nếu gửi ZIP mới, yêu cầu agent dùng snapshot chỉ làm bản sao/tham chiếu và bỏ qua nhập khi hosted đã có dữ liệu.

Local và online độc lập. Sửa truyện trên local không tự sửa nội dung trên online, và ngược lại. Muốn chuyển thay đổi nội dung sau lần đầu cần backup cả hai bên và một bước đồng bộ có xử lý xung đột; pipeline hiện tại cố ý từ chối ghi đè database không rỗng. Thay đổi code thì không cần đồng bộ lại data.

## Secrets và khôi phục

AI là tùy chọn. Sau khi áp dụng migration mới, admin có thể cấu hình địa chỉ API, API key và model trong **Cài đặt website → Cấu hình AI hỗ trợ** mà không cần redeploy. Key được lưu trong database riêng tư, không hiển thị lại trên form; bản sao database có thể chứa key nên phải bảo quản riêng tư. `OPENAI_API_KEY` và `OPENAI_MODEL` ở server vẫn là cấu hình dự phòng. Không đưa giá trị secret vào hosting.json, ZIP hoặc Git. Chưa gọi AI thật trong kiểm thử.

Backup trước chuyển đổi nằm trong `.data/backups/sites-migration-20261014-185707/`, gồm PGlite và 100 media gốc. `.data/little-readers/` và `.data/media/` cũng vẫn còn. Backup không được tự xóa. Để khôi phục bản D1/R2 từ transfer, dùng một thư mục state mới qua `LITTLE_READERS_STATE_DIR`, không ghi đè state đang sử dụng.
