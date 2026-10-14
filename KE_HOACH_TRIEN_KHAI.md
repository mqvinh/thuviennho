# Kế hoạch triển khai — THƯ VIỆN NHỎ – LITTLE READERS

**Sản phẩm:** Website học liệu song ngữ dành cho phụ huynh và giáo viên

**Trạng thái:** Kế hoạch sản phẩm, cập nhật đối tượng sử dụng chính theo định hướng mới

**Định hướng:** Hỗ trợ phụ huynh và giáo viên lựa chọn, biên tập, kiểm duyệt học liệu và tổ chức hoạt động đọc.

## Nền tảng triển khai hiện tại

- **Ứng dụng:** Next.js App Router, TypeScript, Tailwind CSS.
- **Hosting:** Vercel chạy Next.js, kết nối tới backend Worker riêng có xác thực. Có thể build toàn bộ website thành Worker bằng OpenNext.
- **Database:** D1; local dùng giả lập, hosted dùng tài nguyên Cloudflare bền vững.
- **Tệp media:** R2, giữ nguyên key và đường dẫn `/media/...` khi chuyển dữ liệu.
- **Hướng dẫn hiện tại:** [triển khai Vercel](HUONG_DAN_TRIEN_KHAI_VERCEL.md) hoặc [bản Worker/Sites](HUONG_DAN_TRIEN_KHAI_SITES.md). SQL PostgreSQL/PGlite cũ giữ cho chuyển đổi và kiểm thử, không nạp lại khi deploy. Một số checklist phía dưới ghi lại kế hoạch ban đầu trước chuyển đổi D1/R2.
- **Backlog theo chức năng:** xem [KE_HOACH_CHUC_NANG.md](KE_HOACH_CHUC_NANG.md).

## 1. Tầm nhìn và mục tiêu

THƯ VIỆN NHỎ – LITTLE READERS là website học liệu song ngữ dành cho phụ huynh và giáo viên, kết hợp truyện ngắn, tranh minh họa, âm thanh và hoạt động đọc hiểu. Website giúp người hướng dẫn chuẩn bị học liệu, tổ chức đọc cùng người học và khuyến khích thói quen đọc.

Mục tiêu của bản thử nghiệm:

- Giúp phụ huynh và giáo viên tìm, rà soát và lựa chọn truyện phù hợp với trình độ người học.
- Hỗ trợ nghe truyện bằng tiếng Việt và tiếng Anh, đọc song song theo câu.
- Biến việc đọc thành hoạt động tương tác nhẹ nhàng, khuyến khích suy nghĩ và sáng tạo.
- Cho giáo viên tổ chức hoạt động đọc ở lớp hoặc tại nhà và theo dõi tiến bộ theo hướng động viên.
- Tạo nền tảng để bổ sung tính năng AI hỗ trợ giáo viên sau khi trải nghiệm cốt lõi được kiểm chứng.

## 2. Người dùng và vai trò

- **Phụ huynh:** lựa chọn học liệu, tổ chức đọc cùng con tại nhà và xem tiến độ được lưu trên thiết bị.
- **Giáo viên:** biên tập, kiểm duyệt học liệu, giới thiệu truyện và hướng dẫn hoạt động đọc. Báo cáo tiến độ lớp là phần mở rộng cần chốt.
- **Quản trị viên nội dung:** quản lý truyện, tranh, âm thanh, câu hỏi, từ vựng và danh mục.

Người học tham gia các hoạt động đọc/nghe, từ vựng, thử tài và nhật ký do phụ huynh hoặc giáo viên hướng dẫn. Các màn hình tương tác này vẫn có trong ứng dụng; thay đổi định hướng tài liệu chưa bổ sung cơ chế giới hạn người sử dụng.

## 3. Phạm vi chức năng

### 3.1. Sáu khu vực chính

1. **Tủ sách song ngữ – Bilingual Library:** truyện được phân loại theo chủ đề, độ dài và mức đọc; có bản tiếng Việt, tiếng Anh đơn giản và tranh minh họa.
2. **Nghe sách – Listen and Read:** phát giọng đọc theo ngôn ngữ; tô sáng câu đang đọc; cho phép nghe lại đoạn/câu.
3. **Góc từ vựng – Word Garden:** từ mới kèm tranh, nghĩa tiếng Việt, phát âm và ví dụ; học sinh có thể lưu từ yêu thích.
4. **Đọc vui thử tài – Reading Games:** nối tranh với từ, sắp xếp sự việc, chọn nhân vật, trả lời câu hỏi đọc hiểu và tìm từ trong truyện.
5. **Nhật ký đọc sách – My Reading Journal:** ghi truyện đã đọc, nhân vật yêu thích, điều đã học; hỗ trợ vẽ tranh hoặc thu âm kể lại nếu điều kiện kỹ thuật cho phép.
6. **Hành trình đọc sách – Reading Journey:** ghi nhận truyện đã đọc, ngày đọc, nhiệm vụ và huy hiệu; tập trung khuyến khích sự tiến bộ, không xếp hạng gây áp lực.

### 3.2. Trang đọc truyện

- Giao diện ít chữ trên màn hình, nút bấm lớn, thao tác đơn giản và phù hợp điện thoại/máy tính bảng.
- Hiển thị tên truyện tiếng Việt và tiếng Anh, chủ đề, mức đọc và thời lượng ước tính.
- Cho phép chọn tiếng Việt, tiếng Anh hoặc xem song song từng câu.
- Phát âm thanh theo câu hoặc cả truyện và làm nổi bật câu đang đọc.
- Chạm từ để xem nghĩa đơn giản, phát âm, tranh và câu ví dụ.
- Kết thúc truyện có 3–5 câu hỏi ngắn, hoạt động sáng tạo như vẽ, viết kết thúc khác hoặc kể lại.
- Âm thanh phải là tệp đã chuẩn bị hoặc dùng dịch vụ đọc văn bản được lựa chọn; giao diện đơn thuần không tự tạo ra giọng đọc.

### 3.3. Nội dung thư viện ban đầu

MVP bắt đầu với **20–30 truyện song ngữ**, sau đó mở rộng theo chương trình học và phản hồi thực tế. Tám chủ đề đề xuất:

- Gia đình yêu thương – Family and Love
- Bạn bè và trường học – Friends and School
- Lòng tốt và sẻ chia – Kindness and Sharing
- Quê hương Việt Nam – My Homeland
- Thiên nhiên xanh – Nature and Environment
- Thế giới động vật – Animal World
- Kỹ năng sống an toàn – Life Skills and Safety
- Khám phá khoa học – Science and Discovery

Mỗi truyện hỗ trợ hai mức:

- **Mức 1 – Em đọc cùng cô:** truyện ngắn, câu đơn giản, tranh rõ, có âm thanh hỗ trợ.
- **Mức 2 – Em tự khám phá:** dài hơn một chút, có câu hỏi suy luận và hoạt động kể lại.

Tiếng Anh cần phù hợp trình độ thực tế của học sinh; bản dịch được biên soạn tự nhiên, không bắt buộc dịch sát từng câu tiếng Việt.

### 3.4. AI — giai đoạn mở rộng

AI không phải điều kiện để phát hành bản thử nghiệm ban đầu. Sau khi chức năng đọc cốt lõi hoạt động ổn định, có thể bổ sung các công cụ dành cho giáo viên:

- **Trợ lý đọc hiểu:** đề xuất câu hỏi gợi mở về nhân vật và nội dung.
- **Từ điển tranh thông minh:** gợi ý cách giải thích từ đơn giản, ví dụ và tranh minh họa.
- **Cá nhân hóa nhiệm vụ:** đề xuất truyện tiếp theo theo mức đọc và sở thích quan sát được.
- **Xưởng sáng tạo truyện:** hỗ trợ giáo viên tạo bản nháp truyện theo chủ đề, từ khóa hoặc bài học.
- **Hỗ trợ giáo viên:** tạo bản nháp phiếu đọc, câu hỏi, bài nối từ và hoạt động sau đọc.

Mọi nội dung AI tạo ra phải ở trạng thái bản nháp và được giáo viên duyệt về độ chính xác, ngôn ngữ, hình ảnh và mức độ phù hợp trước khi dùng trong hoạt động đọc. Công cụ AI dành cho người biên tập học liệu; không cung cấp chatbot mở cho người học và không yêu cầu thông tin cá nhân của người học. Cần thống nhất chính sách dữ liệu và giới hạn sử dụng trước khi tích hợp dịch vụ AI.

## 4. Luồng hoạt động học tập

1. **Chọn sách:** phụ huynh hoặc giáo viên chọn truyện theo chủ đề và trình độ người học.
2. **Đọc và nghe:** người hướng dẫn tổ chức đọc tiếng Việt, nghe hoặc khám phá bản tiếng Anh theo khả năng người học.
3. **Tương tác:** làm câu hỏi, học từ mới hoặc sắp xếp diễn biến.
4. **Chia sẻ:** kể lại, vẽ nhân vật hoặc viết 2–3 câu về điều đã học.

Giáo viên có thể theo dõi truyện đã đọc, nhiệm vụ hoàn thành và sản phẩm đọc. Không đánh giá thói quen đọc chỉ bằng số lượng truyện hay tốc độ đọc.

## 5. Kế hoạch theo giai đoạn

### Giai đoạn 1 — Thiết kế nền tảng và trải nghiệm đọc

- Chốt cấu trúc trang, danh mục và cách phân mức truyện.
- Thiết kế giao diện thư viện, trang danh mục, trang đọc song ngữ và luồng chuyển ngôn ngữ.
- Xây dựng mô hình nội dung cho truyện, câu song ngữ, tranh, âm thanh, từ mới và câu hỏi.
- Chuẩn bị một nhóm truyện mẫu đã được rà soát để kiểm tra trải nghiệm.

**Đầu ra:** cấu trúc website, thiết kế giao diện, mô hình nội dung và bản đọc mẫu.

### Giai đoạn 2 — MVP đọc và tương tác

- Hoàn thiện tủ sách, lọc theo chủ đề/mức đọc và trang chi tiết truyện.
- Xây dựng nghe sách, tô sáng câu, chuyển ngôn ngữ và tra từ.
- Bổ sung câu hỏi đọc hiểu và các trò chơi cơ bản.
- Làm nhật ký đọc tối thiểu: lưu truyện đã đọc và cảm nhận/sản phẩm đơn giản.
- Xây dựng công cụ quản lý nội dung để giáo viên/quản trị viên cập nhật học liệu.

**Đầu ra:** MVP dùng được với bộ truyện ban đầu; ưu tiên tổng số 20–30 truyện song ngữ.

### Giai đoạn 3 — Hành trình đọc và hỗ trợ AI cho giáo viên

- Bổ sung nhiệm vụ, huy hiệu và màn hình tiến độ theo hướng khích lệ.
- Thử nghiệm công cụ AI hỗ trợ tạo bản nháp câu hỏi, từ vựng, phiếu đọc và truyện.
- Thiết lập quy trình giáo viên duyệt nội dung trước khi xuất bản cho học sinh.
- Xem xét gợi ý truyện theo sở thích/mức đọc, chỉ dùng dữ liệu cần thiết.

**Đầu ra:** công cụ hỗ trợ giáo viên có kiểm duyệt và cơ chế theo dõi tiến bộ phù hợp.

### Giai đoạn 4 — Thử nghiệm thực tế và cải tiến

- Thử nghiệm với nhóm phụ huynh và giáo viên theo kế hoạch của người phụ trách.
- Hướng dẫn phụ huynh và giáo viên lựa chọn học liệu và tổ chức hoạt động đọc ở lớp hoặc tại nhà.
- Thu thập phản hồi từ học sinh, giáo viên và phụ huynh; rà soát khả năng sử dụng, mức độ hứng thú và thói quen đọc trước–sau.
- Điều chỉnh nội dung, thao tác và tính năng trước khi mở rộng.

**Đầu ra:** báo cáo thử nghiệm, danh sách cải tiến và kế hoạch phát triển tiếp theo.

## 6. Tiêu chí nghiệm thu bản thử nghiệm

- Học sinh tìm được truyện theo chủ đề và mức đọc, mở được trang đọc trên điện thoại/máy tính bảng.
- Trang đọc hiển thị bản tiếng Việt và tiếng Anh theo chế độ chọn hoặc song song.
- Âm thanh hoạt động với tài nguyên đã cấu hình; câu đang đọc được nhận biết trực quan nếu có đồng bộ câu.
- Học sinh tra được từ mới, làm câu hỏi sau đọc và hoàn thành ít nhất một hoạt động tương tác.
- Truyện và tiến độ đọc được lưu theo phương án dữ liệu đã thống nhất; nếu chưa có tài khoản học sinh, cần thiết kế định danh lớp/nhóm an toàn.
- Giáo viên/quản trị viên có thể cập nhật và kiểm tra nội dung trước khi xuất bản.
- Các thao tác chính có vùng bấm lớn, ngôn ngữ dễ hiểu, trạng thái tải/lỗi/rỗng rõ ràng.
- Bộ truyện thử nghiệm có quyền sử dụng hợp lệ và nội dung tiếng Anh được rà soát.

## 7. Nội dung, quyền sử dụng và an toàn

- Ưu tiên truyện tự biên soạn, tài liệu được cấp phép hoặc tác phẩm có thể sử dụng hợp pháp.
- Không đăng toàn văn sách có bản quyền khi chưa được cho phép; lưu thông tin nguồn và giấy phép của từng tài nguyên.
- Rà soát độ phù hợp lứa tuổi, tính chính xác kiến thức, bản dịch, tranh và âm thanh trước khi xuất bản.
- Giảm tối đa dữ liệu cá nhân của trẻ; xác định rõ ai được xem nhật ký đọc và sản phẩm của học sinh.
- Nếu hỗ trợ ghi âm, cần xác định nơi lưu, quyền truy cập, thời hạn lưu và cách xóa.
- Tránh bảng xếp hạng tạo áp lực; dùng phản hồi tích cực và tiến bộ cá nhân.

## 8. Rủi ro và quyết định cần chốt

- **Tài nguyên đa phương tiện:** cần quy trình sản xuất/kiểm duyệt tranh, âm thanh và đồng bộ âm thanh với câu.
- **Khối lượng nội dung:** 20–30 truyện song ngữ cần ngân sách biên soạn, minh họa, thu âm và rà soát.
- **Quản lý người học:** cần quyết định dùng tài khoản cá nhân, mã lớp hay phương án khác phù hợp với học sinh nhỏ tuổi.
- **AI và dữ liệu:** cần chọn dịch vụ, chi phí, giới hạn, cách xử lý dữ liệu và quy trình duyệt nội dung; nên để sau MVP.
- **Phạm vi tính năng:** thu âm, vẽ trực tiếp, cá nhân hóa và dashboard giáo viên có thể triển khai theo từng đợt sau khi thử nghiệm.
- **Tích hợp dữ liệu:** SQL cần được áp dụng lên database đã tạo riêng; khi deploy trên Vercel phải cấu hình biến môi trường kết nối và tài nguyên Storage cần dùng.

## 9. Việc cần làm tiếp theo

- [ ] Chốt nhóm người dùng đầu tiên và cách giáo viên/quản trị viên đăng nhập.
- [ ] Xác định nội dung và chương trình học mà phụ huynh, giáo viên cần hỗ trợ.
- [ ] Chọn 20–30 truyện đầu tiên, chủ đề, mức đọc và người chịu trách nhiệm biên tập.
- [ ] Chốt cách tạo giọng đọc (thu âm sẵn hoặc dịch vụ đọc văn bản) và yêu cầu đồng bộ câu.
- [ ] Chốt cách lưu nhật ký, tranh vẽ/ghi âm và quyền xem của giáo viên/phụ huynh.
- [x] Chọn stack ban đầu: Next.js, Vercel và Supabase PostgreSQL.
- [x] Tạo scaffold ứng dụng và SQL schema/seed khởi đầu.
- [x] Chuẩn bị dữ liệu local có thể truy vấn để phát triển và chạy UI.
- [ ] Tạo database hosted, áp dụng SQL và cấu hình biến môi trường khi đến giai đoạn tích hợp.
- [ ] Chốt cách định danh học sinh/lớp trước khi xây nhật ký và theo dõi tiến độ.
- [ ] Phân rã giai đoạn 1–2 thành các đầu việc trong [KE_HOACH_CHUC_NANG.md](KE_HOACH_CHUC_NANG.md).
- [ ] Xác định cách đo kết quả thử nghiệm: mức độ dễ sử dụng, hứng thú, hoàn thành hoạt động và phản hồi định tính.

---

**Ghi chú:** Chưa ấn định thời lượng và ngân sách vì chưa có quy mô đội ngũ, số lượng học sinh thử nghiệm, chi phí sản xuất nội dung và yêu cầu vận hành cụ thể.
