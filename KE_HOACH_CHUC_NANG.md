# Backlog triển khai theo chức năng — LITTLE READERS

Tài liệu này chia kế hoạch sản phẩm thành các phần nhỏ có thể code, rà soát và nghiệm thu độc lập. Làm lần lượt theo thứ tự; chưa bắt đầu chức năng phụ thuộc khi dữ liệu hoặc luồng trước đó chưa ổn định.

Đối tượng sử dụng chính là phụ huynh và giáo viên: lựa chọn, biên tập học liệu và hướng dẫn hoạt động đọc song ngữ. Các mục về người học mô tả hoạt động được người lớn tổ chức và hỗ trợ.

## Quy ước

- **P0:** cần cho bản thử nghiệm; **P1:** hoàn thiện sau MVP; **P2:** mở rộng.
- Mỗi chức năng phải có giao diện trạng thái tải, lỗi, rỗng và thành công khi phù hợp.
- Nội dung xuất hiện với học sinh phải qua giáo viên duyệt. Không để lộ đáp án trắc nghiệm trong truy vấn công khai.
- Học sinh không cần cung cấp thông tin nhận dạng cá nhân để dùng luồng đọc cơ bản.
- Project hiện dùng PGlite để lưu và truy vấn dữ liệu trên máy local. Khi triển khai Vercel, cần đổi lớp truy vấn sang Supabase hosted; không dùng PGlite làm database production.

## 0. Nền tảng dự án và dữ liệu — P0 (đã chuẩn bị)

- [x] Khởi tạo Next.js App Router, TypeScript, Tailwind CSS và ESLint.
- [x] Tạo SQL schema cơ sở cho chủ đề, truyện, câu, từ vựng, câu hỏi và đáp án.
- [x] Bật Row Level Security; chỉ nội dung thuộc truyện đã xuất bản mới đọc được công khai; đáp án tách riêng không có policy đọc.
- [x] Tạo SQL seed với một truyện song ngữ mẫu.
- [x] Tạo database PostgreSQL nhúng PGlite cho phát triển local, không cần Docker/server riêng.
- [x] Khởi tạo schema và truyện mẫu trong `database/local.sql`; lưu database bền vững trong `.data/little-readers/`.
- [x] Kết nối trang chủ và trang đọc truyện với database local.

**Nghiệm thu:** `npm run dev` chạy ở localhost; danh sách và nội dung truyện đọc từ database local; các file SQL hosted sẵn sàng áp dụng khi triển khai dữ liệu.

## 1. Khung giao diện và điều hướng — P0

- [x] Thiết lập font, màu, khoảng cách, nút, thẻ truyện và kiểu chữ dễ đọc để phụ huynh, giáo viên sử dụng khi hướng dẫn đọc.
- [x] Tạo bố cục chung có logo, điều hướng tới sáu khu vực, nội dung chính và footer.
- [x] Làm bố cục responsive cho điện thoại, máy tính bảng và desktop; vùng chạm đủ lớn.
- [x] Thêm trang 404 và thông báo khi chức năng chưa có dữ liệu.

**Nghiệm thu:** tất cả khu vực có đường dẫn rõ; điều hướng dùng được bằng bàn phím và màn hình nhỏ.

## 2. Tủ sách song ngữ — P0

- [x] Hiển thị chủ đề và truyện từ database local qua repository dữ liệu.
- [x] Tạo danh sách/thẻ truyện: bìa, tên hai ngôn ngữ, chủ đề, mức đọc và thời lượng.
- [x] Lọc theo chủ đề và mức 1/mức 2; thêm tìm kiếm tiêu đề nếu khối lượng truyện cần.
- [x] Tạo trang giới thiệu truyện theo slug, có nút bắt đầu đọc.
- [x] Thêm trạng thái thư viện chưa có truyện, lỗi truy vấn và nội dung đang tải.

**Nghiệm thu:** chỉ truyện xuất bản xuất hiện; bộ lọc cho kết quả đúng; trang chi tiết mở đúng truyện.

## 3. Trang đọc song ngữ — P0

- [x] Tải truyện cùng các câu theo thứ tự qua repository dữ liệu local.
- [x] Hiển thị tiêu đề, mức, thời lượng, tranh bìa và danh sách câu.
- [x] Làm chế độ chỉ Tiếng Việt, chỉ English và song song từng câu.
- [x] Thêm điều khiển cỡ chữ và nút quay lại thư viện.
- [x] Thiết kế bố cục ít chữ mỗi màn hình, nút lớn và thông báo khi truyện chưa có bản dịch/câu.

**Nghiệm thu:** đổi ngôn ngữ không mất vị trí đọc; thứ tự câu và bản song ngữ khớp nhau.

**Ghi chú phạm vi mục 1–3:** hoàn thiện bản local. Sáu khu vực đã có luồng local; xem trạng thái mục 4–12 bên dưới. Bìa mặc định là hình sách SVG; repository hỗ trợ đường dẫn bìa local. Chuyển sang Supabase hosted còn chờ giai đoạn triển khai dữ liệu.

## 4. Nghe sách và tô sáng câu — P0/P1

- [x] Hỗ trợ audio giáo viên tải lên và giọng trình duyệt tùy chọn cho bản thử local.
- [ ] Chốt nguồn sản xuất audio và nghiệm thu bộ audio được giáo viên duyệt cho thử nghiệm lớp học.
- [x] Lưu đường dẫn audio theo ngôn ngữ/câu, tên tệp UUID và kiểm tra định dạng MP3/WAV/OGG ở storage local.
- [ ] Chuyển media sang Storage hosted khi triển khai.
- [x] Thêm phát/dừng, tua hoặc phát lại câu; hiển thị khi câu chưa có audio.
- [x] Đồng bộ câu hiện tại với phần tô sáng; xử lý tải audio thất bại và chuyển ngôn ngữ.

**Nghiệm thu:** audio phát đúng ngôn ngữ/câu, điều khiển hoạt động trên trình duyệt mục tiêu; nếu không có audio, chức năng đọc vẫn dùng được.

## 5. Góc từ vựng — P0

- [x] Hiển thị từ vựng của truyện dưới dạng thẻ có từ, nghĩa, ví dụ và hình minh họa.
- [x] Cho phép chạm từ trong truyện để mở nghĩa nhanh.
- [x] Phát âm từ nếu có audio; thể hiện rõ khi chưa có.
- [x] Lưu từ yêu thích trên thiết bị cho bản local, không thu thông tin nhận dạng cá nhân.

**Nghiệm thu:** giải thích dễ hiểu, đúng với ngữ cảnh truyện; thao tác đóng/mở hoạt động tốt trên cảm ứng.

## 6. Đọc vui thử tài — P0

- [x] Tạo màn hình câu hỏi 3–5 câu cho mỗi truyện.
- [x] Hỗ trợ câu hỏi chọn đáp án và sắp xếp diễn biến; nối tranh/tìm từ có thể triển khai ở đợt sau.
- [x] Gửi lựa chọn tới endpoint/RPC kiểm tra đáp án phía server; không đọc bảng `reading_answers` từ client.
- [x] Trả phản hồi tích cực, giải thích ngắn và cho làm lại; không biến thành bảng xếp hạng.
- [x] Lưu trạng thái hoàn thành thử tài trên thiết bị cho bản local.
- [ ] Đồng bộ theo học sinh/lớp sau khi phương án định danh được chấp thuận.

**Nghiệm thu:** câu hỏi gắn đúng truyện; đáp án không lộ trong payload gửi trình duyệt; làm lại được.

## 7. Nhật ký đọc sách — P0/P1

- [x] Tạo biểu mẫu ngắn: truyện đã đọc, nhân vật yêu thích, điều em học được.
- [x] Cho phép vẽ hoặc tải sản phẩm vẽ; giới hạn loại và kích thước tệp.
- [ ] Thu âm kể lại là P1; chỉ bật sau khi chốt nơi lưu, quyền xem và thời hạn xóa.
- [x] Xem lại, xóa sản phẩm và tải bản sao nhật ký trên cùng thiết bị.
- [ ] Xem sản phẩm theo mã lớp/định danh khi được chấp thuận.
- [ ] Xác định cách giáo viên xem và phản hồi mà không công khai sản phẩm ngoài lớp.

**Nghiệm thu:** lưu/xem lại được; sản phẩm chỉ người có quyền mới xem; có thao tác xóa theo chính sách đã chốt.

## 8. Hành trình đọc sách — P1

- [x] Ghi nhận sự kiện đọc tối thiểu: bắt đầu/hoàn tất truyện và hoàn tất hoạt động.
- [x] Hiển thị tiến bộ cá nhân: truyện đã khám phá, nhiệm vụ hoàn thành, ngày đọc.
- [x] Tặng huy hiệu khích lệ theo cột mốc, không xếp hạng học sinh với nhau.
- [ ] Tạo giao diện giáo viên xem tiến độ lớp khi quyền truy cập và cách định danh đã duyệt.

**Nghiệm thu:** số liệu nhất quán, dễ hiểu, không dùng tốc độ đọc làm thước đo duy nhất.

## 9. Quản lý học liệu cho giáo viên — P0/P1

- [x] Chốt quyền giáo viên và quản trị viên; bảo vệ route/chức năng nhập liệu.
- [x] Tạo biểu mẫu thêm/sửa chủ đề và truyện với hai bản ngôn ngữ, mức đọc, thời lượng.
- [x] Nhập câu song ngữ theo thứ tự; kiểm tra câu thiếu bản dịch hoặc trùng thứ tự.
- [x] Quản lý từ vựng, câu hỏi, đáp án và tệp bìa/audio/ảnh.
- [x] Dùng trạng thái nháp/chờ duyệt/đã xuất bản; chỉ bản đã duyệt được học sinh xem.
- [x] Ghi nguồn và quyền sử dụng nội dung/tài nguyên.

**Nghiệm thu:** giáo viên sửa được học liệu trong quyền của mình; bản nháp không lộ ra thư viện công khai.

## 10. Tài khoản và lớp học — P1 (cần quyết định trước khi code)

- [x] Bản local đã chọn: giáo viên đăng nhập bằng mật khẩu, học sinh dùng bộ nhớ thiết bị; không có tài khoản học sinh.
- [x] Bản local: nhật ký/tranh/tiến độ chỉ trên thiết bị, không tự gửi cho giáo viên; người dùng chung trình duyệt có thể xem.
- [ ] Thiết kế quyền truy cập bằng RLS và kiểm tra tách dữ liệu giữa các lớp.
- [ ] Thêm luồng mời/tham gia lớp, rời lớp và xóa dữ liệu theo yêu cầu.

**Điều kiện bắt đầu:** có phương án được nhà trường/người phụ trách sản phẩm chấp thuận; không mặc định thu tên, email hay ngày sinh của học sinh.

## 11. Công cụ AI cho giáo viên — P2

- [x] Tạo màn hình giáo viên nhập chủ đề, từ khóa và bài học để sinh bản nháp.
- [x] Viết endpoint sinh truyện, từ vựng, câu hỏi dạng có cấu trúc, kiểm tra và lưu nháp.
- [ ] Cấu hình API key/model và kiểm chứng sinh học liệu với dịch vụ AI thật; bổ sung phiếu đọc nếu cần.
- [x] Lưu kết quả ở trạng thái nháp; yêu cầu giáo viên kiểm tra và duyệt trước khi xuất bản.
- [x] Thiết lập giới hạn, xử lý lỗi, log tối thiểu và kiểm soát chi phí.
- [x] Không mở chatbot tự do cho học sinh; không đưa dữ liệu cá nhân trẻ vào prompt.

**Nghiệm thu:** không có nội dung AI nào đến học sinh trước khi giáo viên duyệt; có thể sửa/xóa bản nháp.

## 12. Thử nghiệm lớp học và cải tiến — P0 trước khi mở rộng

- [x] Chuẩn bị 20 bản thảo song ngữ, 5 chủ đề, mỗi mức đọc có 10 bản thảo.
- [ ] Giáo viên rà soát và duyệt bộ truyện trước khi thử nghiệm.
- [x] Soạn hướng dẫn sử dụng local, kịch bản buổi đọc và phiếu quan sát/phản hồi.
- [ ] Tổ chức hướng dẫn trong buổi đọc mẫu thực tế.
- [ ] Thu phản hồi về độ dễ sử dụng, mức hứng thú, nội dung và hỗ trợ tiếng Anh.
- [ ] Theo dõi mức hoàn thành hoạt động và phản hồi định tính; không lấy số truyện/tốc độ làm chỉ số duy nhất.
- [ ] Tổng hợp vấn đề, ưu tiên cải tiến và quyết định mở rộng thư viện.

**Nghiệm thu:** có báo cáo thử nghiệm với quan sát, phản hồi và danh sách hành động tiếp theo.

## Quyết định cần chốt trước các phần liên quan

- [ ] Tạo database Supabase hosted khi bắt đầu giai đoạn tích hợp dữ liệu; không cần container runtime local cho scaffold giao diện.
- [x] Phương án bản local được người phụ trách chọn: học sinh lưu trên thiết bị, giáo viên đăng nhập tài khoản local có mật khẩu.
- [ ] Phương án lớp học và quyền dữ liệu hosted khi mở rộng.
- [ ] Nguồn audio, tranh minh họa và người chịu trách nhiệm kiểm duyệt.
- [x] Bản local: giáo viên sửa học liệu của mình và gửi duyệt; quản trị viên quản lý chủ đề, duyệt và xuất bản.
- [ ] Phạm vi nhật ký đọc, lưu vẽ/ghi âm và thời hạn lưu.
- [ ] Thiết bị/trình duyệt mục tiêu cho đợt dùng thử với phụ huynh và giáo viên.

## Trạng thái bản local sau đợt triển khai mục 4–12

Các mục 4–9 đã có luồng local: audio theo câu và giọng trình duyệt tùy chọn, từ vựng/yêu thích, thử tài chấm server, nhật ký/vẽ, tiến độ/huy hiệu, đăng nhập giáo viên và duyệt học liệu. Nhật ký/tiến độ chỉ lưu trên thiết bị, không có báo cáo lớp. Có thêm 20 bản thảo chưa xuất bản. Mục 11 đã có tích hợp AI nhưng chưa cấu hình/kiểm chứng dịch vụ thật.

Mục 10 (lớp học/RLS tách lớp), ghi âm kể lại, Supabase/Storage hosted, audio được duyệt và nghiệm thu thực tế mục 12 vẫn chưa hoàn thành. Không đánh dấu các phần cần quyết định bên ngoài là đã nghiệm thu. Xem `HUONG_DAN_SU_DUNG_LOCAL.md` và `KE_HOACH_THU_NGHIEM.md`.

**Lựa chọn đã xác nhận:** học sinh lưu nhật ký/tiến độ/từ yêu thích trên thiết bị; giáo viên dùng tài khoản local có mật khẩu. Giọng trình duyệt là nguồn đọc mặc định cho bản thử nghiệm; AI chờ cấu hình dịch vụ. Không cần triển khai tài khoản học sinh hoặc đồng bộ lớp cho phạm vi local đã chọn.

## Hoàn thiện luồng local sau khi chốt phương án sử dụng

- [x] Bổ sung đọc thử bản nháp có kiểm tra quyền sở hữu; hiển thị đáp án chỉ cho người duyệt, không ghi tiến độ học sinh.
- [x] Cấp, khóa/mở, đặt lại mật khẩu tài khoản giáo viên bằng giao diện quản trị; giáo viên tự đổi mật khẩu, hủy các phiên cũ.
- [x] Chờ tải giọng trình duyệt, tạm dừng/tiếp tục, chọn tốc độ và tua audio thu âm trong từng câu.
- [x] Khôi phục bản sao nhật ký/tiến độ trên thiết bị sau kiểm tra định dạng và xác nhận thay thế; dữ liệu sai không ghi đè dữ liệu hiện tại.

Các phần hosted, AI dịch vụ và nghiệm thu trong lớp vẫn giữ trạng thái chờ như trên.

## Bổ sung học liệu ngày 12/10/2026

- [x] Thêm 10 bản thảo song ngữ: 5 truyện mức 1 và 5 truyện mức 2, trải đều 5 chủ đề.
- [x] Mỗi truyện có 6–8 câu, 2 từ vựng và 3 câu hỏi kèm đáp án để giáo viên đọc thử.
- [ ] Giáo viên rà soát và xuất bản 10 truyện mới; tổng bộ bản thảo chuẩn bị là 30 truyện, chưa tính truyện mẫu.

## Xuất bản học liệu ngày 12/10/2026

Người phụ trách đã đọc, xác nhận nội dung và yêu cầu xuất bản. Đã xuất bản 30 truyện trong hai đợt bổ sung lên web local, cùng truyện mẫu có sẵn; tổng cộng 31 truyện công khai. Việc này không bao gồm triển khai hosting hoặc nghiệm thu lớp học.

## Cập nhật giao diện quản trị

- [x] Trang quản trị chỉ tại `/admin`; đã xóa route `/giao-vien` và chuyển hướng cũ. Đọc thử tại `/admin/xem-thu/[slug]`.
- [x] Layout gồm thanh logo/tài khoản, menu chính, nội dung và footer; dropdown sau đăng nhập có quản lý học liệu, tài khoản và đăng xuất.
- [x] Danh sách học liệu và tài khoản hiển thị dạng bảng, cuộn ngang trong vùng bảng trên màn hình nhỏ. Nút có hover và hỗ trợ giảm chuyển động.

## Áp dụng mẫu thiết kế 6 — Kệ sách ấm áp

- [x] Người phụ trách chọn mẫu 6: tông kem–nâu, kệ sách và thẻ đọc.
- [x] Trang chủ có bìa sách dạng đứng, bộ lọc chủ đề, hiệu ứng nâng bìa và gợi ý đọc từ dữ liệu thật.
- [x] Đồng bộ màu sắc và typography cho trang đọc, các khu vực học tập và bảng quản trị; giữ nguyên phân quyền và dữ liệu.

## Tinh chỉnh tủ sách và đăng nhập

- [x] Tủ sách phân trang 10 truyện mỗi trang; chọn chủ đề, mức đọc hoặc tìm kiếm đưa về trang đầu.
- [x] Bỏ dropdown chủ đề trùng với tab; giữ mức đọc và tìm tên truyện.
- [x] Bỏ border input/select/textarea, giữ dấu hiệu focus khi dùng bàn phím.
- [x] Tiêu đề form `/admin` là “Đăng nhập”; căn giữa tiêu đề và mô tả.
- [x] Đặt lại mật khẩu tất cả tài khoản local theo yêu cầu người phụ trách và hủy các phiên đăng nhập cũ.

## Tách trang quản lý và điều hướng khi cuộn

- [x] Các trang riêng: `/admin/tai-khoan`, `/admin/truyen`, `/admin/chu-de`, `/admin/ai`, `/admin/bien-tap`.
- [x] Danh sách truyện, tài khoản và chủ đề phân trang 10 dòng/trang; thao tác từng dòng nằm trong dropdown icon ⋮.
- [x] Input/select/textarea nhỏ hơn, có viền mặc định và không có viền/halo khi focus.
- [x] Nút icon lên đầu trang. Trong khu vực quản lý, thanh logo/tài khoản hiện cố định khi cuộn lên sau khi qua thanh; ngoài quản lý, menu chính dùng cùng cơ chế. Cuộn xuống ẩn thanh cố định; có animation và hỗ trợ giảm chuyển động.

## Điều hướng quản lý trong dropdown tài khoản

- [x] Các mục tài khoản, truyện, chủ đề (admin), AI và biên tập truyện cùng đăng xuất nằm trong dropdown top; bỏ menu quản lý và đăng xuất lặp lại trong nội dung.
- [x] Dropdown top không có viền. Nút tạo truyện nằm trên bảng; cột thao tác cố định 80px; nhãn sửa và đọc thử không kèm tên truyện.

## Bộ lọc học liệu và luồng biên tập

- [x] Icon cho từng mục trong dropdown top; breadcrumb thay thông tin username/role trong nội dung quản lý.
- [x] Danh sách có tác giả và bộ lọc tên, trạng thái, chủ đề; bộ lọc tác giả chỉ cho admin. Học liệu có sẵn chưa có người tạo tài khoản được ghi đúng là “Học liệu có sẵn”.
- [x] Admin không có thao tác gửi duyệt; giáo viên không có thao tác duyệt/xuất bản.
- [x] Input giữ viền mặc định khi focus/active. Ảnh bìa có preview cao 200px; tải thành công không hiện thông báo, lỗi có thông báo.
- [x] Lưu nháp dẫn đến trang sửa với thông báo thành công. Admin xuất bản, giáo viên gửi duyệt rồi về danh sách; việc xuất bản vẫn kiểm tra nội dung và quyền sử dụng.
