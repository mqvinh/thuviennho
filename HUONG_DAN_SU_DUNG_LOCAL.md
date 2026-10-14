# LITTLE READERS — hướng dẫn bản local

## Chạy và đăng nhập

- Chạy `npm run dev`, mở http://localhost:3000.
- Khu vực giáo viên: http://localhost:3000/admin.
- Tài khoản quản trị local đầu tiên đã được tạo. Thông tin nằm trong `.data/teacher-login.txt`, được Git bỏ qua. Không chia sẻ tệp này.
- Trên một bản cài mới, dừng server rồi chạy `node scripts/setup-local-admin.mjs` để tạo quản trị với mật khẩu ngẫu nhiên. Lệnh không thay đổi quản trị đã tồn tại.
- Muốn cấp thêm tài khoản, dừng server rồi chạy `node scripts/create-teacher.mjs ten-dang-nhap teacher` (hoặc `admin`). Mật khẩu nhập trong terminal, từ 6 đến 200 ký tự và có chữ hoa, chữ thường, số, ký tự đặc biệt.
- Giáo viên chỉnh sửa truyện của mình, lưu nháp và gửi duyệt. Quản trị viên quản lý chủ đề, chỉnh sửa mọi học liệu, duyệt và xuất bản. Tài khoản giáo viên không thể tự xuất bản.
- Phiên đăng nhập hết hạn sau 8 giờ. Đăng xuất hủy phiên ở server. Đăng nhập sai quá 8 lượt/tên tài khoản bị hạn chế trong 15 phút.

## Học liệu và duyệt nội dung

Database có truyện mẫu đã xuất bản và thêm 20 bản thảo Việt–Anh, chia thành 5 chủ đề, 2 mức đọc. Bản thảo do trợ lý AI soạn, cần người phụ trách rà soát nội dung, bản dịch, câu hỏi và quyền sử dụng. Không tự xuất bản các bản thảo này.

Trong khu vực giáo viên:

1. Chọn truyện rồi bấm **Sửa**, hoặc tạo truyện mới.
2. Để lưu bản nháp, chỉ cần **Mã truyện**, **Tên tiếng Việt** và **Tên English**; các trường bắt buộc có dấu `*` đỏ. Có thể bổ sung giới thiệu, chủ đề, nguồn, quyền sử dụng và nội dung sau. Truyện có thể ở trạng thái **Chưa phân chủ đề**; thời lượng để trống dùng mặc định 5 phút.
3. Bấm tiêu đề thẻ để mở/thu nội dung. Kéo tay nắm hoặc dùng nút lên/xuống để sắp xếp câu song ngữ, từ vựng và câu hỏi; nút thùng rác ở cuối thẻ xóa mục đó. Thứ tự sau khi lưu được dùng trên trang đọc công khai. Chỉ mã truyện, tên tiếng Việt và tên tiếng Anh là bắt buộc khi tạo, lưu và xuất bản; các phần nội dung còn lại có thể bổ sung sau.
4. Thêm từ vựng, ví dụ, hình/phát âm nếu có; có thể thêm tối đa 5 câu hỏi chọn đáp án hoặc sắp xếp. **Số lựa chọn** mặc định là 3, cho phép 2–6 lựa chọn. Với câu hỏi sắp xếp, chọn diễn biến ở từng **Vị trí** trong **Thứ tự đúng**; các vị trí tự đổi chỗ để tránh đáp án trùng. Đáp án và giải thích chỉ được quản lý trong khu vực giáo viên.
5. **Lưu bản nháp**, **Gửi duyệt**, sau đó quản trị viên kiểm tra và **Duyệt và xuất bản**. Khi chờ duyệt, giáo viên có thể **Rút yêu cầu duyệt**; khi đã xuất bản, quản trị viên có thể **Gỡ xuất bản**. Cả hai thao tác đưa truyện về nháp và giữ nguyên nội dung, lựa chọn hiển thị. Lưu sửa một truyện đã xuất bản cũng đưa truyện về nháp.
6. Có thể ẩn hoặc xóa truyện. Database ghi nhận các migration nên các bản thảo đã xóa không được nạp lại khi khởi động.

Danh sách quản lý đặt truyện có thời gian tạo mới nhất ở đầu; sửa truyện không đổi thời gian tạo. Truyện cũ chưa được ghi nhận thời gian tạo nằm phía sau.

Chủ đề được lưu trong database. Quản trị viên xóa chủ đề tại menu thao tác trong **Danh sách chủ đề**. Nếu chủ đề đang được dùng, thông báo nêu số truyện liên quan trước khi xác nhận. Xóa chủ đề giữ nguyên các truyện và trạng thái xuất bản, đồng thời chuyển trường chủ đề của chúng thành `null` (**Chưa phân chủ đề**).

Trong **Cài đặt website**, quản trị viên có thể đổi tên, mô tả, icon và logo. **Mô tả website** xuất hiện dưới tên trên thanh đầu trang; để trống để bỏ dòng này. Cài đặt và các biểu mẫu quản lý được đặt giữa trang với cùng chiều rộng.

## Audio và hình

- Giáo viên tải ảnh PNG/JPG/WebP hoặc audio MP3/WAV/OGG, tối đa 5 MB/tệp, tại trường tương ứng trong biểu mẫu.
- Tệp được lưu local ở `.data/media/`; tên do server tạo. Đường dẫn gắn theo câu/ngôn ngữ, từ vựng hoặc bìa.
- Tệp của bản nháp không được đọc công khai; tệp thuộc truyện đã xuất bản mới được mở công khai. Tệp chưa gắn vào truyện chỉ chủ sở hữu hoặc quản trị viên xem được.
- Bộ phát có lưới nút chọn câu ở bên trái, mặc định chọn câu đầu tiên. Bên phải có **Nghe truyện / Dừng nghe** và **Nghe lại câu**. Chọn **Tiếng Việt** hoặc **Tiếng Anh** bằng nút lớn; câu đang chọn và câu đang phát được tô sáng. Tốc độ và nguồn giọng đọc dùng các nút chọn, với nguồn giọng đọc đặt dưới tốc độ.
- Mặc định **Tự chọn** ưu tiên bản thu âm của từng câu/ngôn ngữ; nếu chưa có, dùng giọng đọc trên thiết bị. Chọn **Bản thu âm** hoặc **Giọng máy** để dùng riêng một nguồn. Chất lượng và ngôn ngữ giọng thiết bị tùy trình duyệt/hệ điều hành. Thiếu audio hoặc tải lỗi không cản trở đọc truyện.
- Khi triển khai hosted cần chuyển tệp sang Storage, chốt quyền truy cập, nguồn/giấy phép và sản xuất bộ audio đã duyệt. PGlite và `.data` không phù hợp để lưu production trên Vercel.

## Học sinh trên thiết bị

Sáu khu vực: tủ sách, nghe sách, từ vựng, thử tài, nhật ký và hành trình.

- Tủ sách chỉ có truyện đã xuất bản. Lọc chủ đề/mức hoặc tìm tên Việt–Anh.
- Trang đọc chuyển Việt/Anh/song ngữ, chỉnh cỡ chữ, chạm từ được đánh dấu để xem nghĩa.
- Thử tài chấm ở server; câu hỏi công khai không có đáp án. Sau khi gửi bài có phản hồi, giải thích và làm lại.
- Từ yêu thích, hoạt động thử tài, nhật ký, tranh và tiến độ lưu trong `localStorage` của trình duyệt. Không thu tên/email/ngày sinh, không tự gửi sản phẩm cho giáo viên.
- Học sinh chủ động ghi nhận bắt đầu/hoàn tất đọc. Huy hiệu theo cột mốc, không có xếp hạng.
- Nhật ký tối đa 50 sản phẩm; ảnh chọn tối đa 1 MB, ảnh được thu nhỏ trước khi lưu. Có thể vẽ trực tiếp, xóa sản phẩm và tải bản sao JSON.
- Dữ liệu thiết bị được giữ đến khi người dùng hoặc trình duyệt xóa. Ai dùng chung thiết bị có thể xem. Với máy dùng chung, lưu bản sao nếu cần rồi dùng **Xóa dữ liệu trên thiết bị** ở Hành trình.
- Ghi âm kể lại chưa bật; cần chốt quyền xem, nơi lưu và thời hạn xóa trước.

## AI dành cho giáo viên

Endpoint và biểu mẫu đã có, chỉ hoạt động khi server được cấu hình trong `.env.local`:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=your-enabled-model-supporting-structured-outputs
```

Không dùng biến `NEXT_PUBLIC_*` cho key. Model do quản trị chọn theo quyền sử dụng/ngân sách. Khởi động lại server sau khi cấu hình.

- API Responses với Structured Outputs, `store: false`, tối đa 5.000 output tokens/lượt, timeout 45 giây.
- Giới hạn 5 lượt/tài khoản trong 24 giờ; lượt thất bại cũng tính vào giới hạn để tránh gọi lặp tốn chi phí. Model vẫn có thể phát sinh phí theo input và output thực tế.
- Chỉ gửi chủ đề, từ khóa và bài học; không gửi nhật ký, mã lớp hay thông tin cá nhân học sinh.
- Kết quả được kiểm tra định dạng và lưu thành nháp. Người phụ trách có thể bổ sung nội dung, bản dịch, đáp án, nguồn và quyền sử dụng trong trang biên tập.
- Không có chatbot học sinh. Không lưu prompt hoặc phản hồi vào log; chỉ lưu học liệu nháp và bộ đếm giới hạn.
- Chưa cấu hình key/model trên máy này, chưa kiểm chứng một lượt sinh học liệu với dịch vụ thật.

Tài liệu API tham khảo: https://developers.openai.com/api/docs/guides/structured-outputs

## Kiểm tra

```bash
npm run lint
npm run build
npm test
```

Kiểm thử dùng Google Chrome cài trên máy, Next.js riêng tại cổng 3100, database tách biệt `.data/automated-tests/` và `.next-test/`. Không sử dụng dữ liệu học sinh hoặc API AI thật. Lần chạy sau chỉ xóa database kiểm thử này.

Cache Turbopack ghi ra filesystem đã tắt vì máy gần hết dung lượng; có thể bật lại theo hướng dẫn Next.js sau khi có đủ dung lượng.

## Phần còn cần quyết định/dịch vụ bên ngoài

- Bản local đã chốt lưu học sinh trên thiết bị và tài khoản giáo viên có mật khẩu. Mã lớp/định danh giả danh và quyền xem sản phẩm chỉ xem xét khi mở rộng. Chưa có luồng tham gia/rời lớp hoặc báo cáo lớp.
- Supabase hosted và RLS tách lớp: cần tài khoản/dự án hosted và phương án quyền được chấp thuận.
- Nguồn audio và người duyệt; 20 bản thảo cần rà soát trước thử nghiệm.
- AI: cấu hình key/model và kiểm chứng dịch vụ thật.
- Thử nghiệm tại trường: thực hiện buổi đọc, thu phản hồi và viết báo cáo thực tế theo `KE_HOACH_THU_NGHIEM.md`.

## Hoàn thiện các luồng local

### Đọc thử trước khi duyệt

Bấm **Đọc thử** bên cạnh truyện trong Quản lý học liệu. Trang riêng hiển thị bản đọc, audio, từ vựng, câu hỏi và đáp án để giáo viên rà soát. Chỉ chủ sở hữu hoặc quản trị viên xem được; bản nháp vẫn không xuất hiện ở tủ sách hay trang đọc công khai. Đọc thử không ghi tiến độ hoặc từ yêu thích của học sinh.

### Cấp tài khoản và đổi mật khẩu trên web

Trong **Tài khoản**, bật **Đổi mật khẩu** để đổi mật khẩu cùng thông tin cá nhân. Mật khẩu mới cần từ 6 đến 200 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Việc đổi mật khẩu hủy các phiên cũ, giữ một phiên mới cho người vừa đổi.

**Ảnh đại diện** được tải lên trong trang Tài khoản hoặc form tạo/sửa người dùng. Ảnh xuất hiện bên trái tên ở menu đầu trang, kể cả trên điện thoại. Không có ảnh thì dùng chữ cái đầu của tên; ảnh đại diện chỉ được truy cập bởi chính tài khoản đó, chủ sở hữu tệp hoặc quản trị viên.

Quản trị viên có thể cấp tài khoản, đặt lại mật khẩu, khóa hoặc mở tài khoản. Khóa tài khoản và đặt lại mật khẩu đều hủy phiên cũ. Không thể khóa tài khoản đang sử dụng; việc đặt lại mật khẩu của chính mình dùng biểu mẫu đổi mật khẩu. Tệp `.data/teacher-login.txt` chỉ chứa mật khẩu khởi tạo, không cập nhật sau khi đổi mật khẩu.

### Nghe liên tục và giọng trình duyệt

Bộ phát chờ danh sách giọng tải trên thiết bị (tối đa 4 giây), ưu tiên giọng local đúng ngôn ngữ. Nút **Nghe truyện** chuyển thành **Dừng nghe** trong khi phát hoặc chờ giọng đọc; bấm dừng sẽ hủy lượt nghe hiện tại. Chọn câu bằng lưới nút lớn; nút của câu đang chọn luôn nổi bật. Đổi nguồn hoặc ngôn ngữ sẽ dừng lượt nghe hiện tại. Khi đang phát, đổi tốc độ hoặc chuyển câu sẽ tiếp tục nghe với lựa chọn mới. Với audio thu âm có thanh tua trong câu. Nếu thiết bị không có giọng đúng ngôn ngữ, ứng dụng thông báo thay vì đọc bằng giọng ngôn ngữ khác.

### Khôi phục bản sao thiết bị

Ở **Hành trình**, chọn bản sao JSON đã tải. Ứng dụng kiểm tra định dạng, ngày tháng, giới hạn dữ liệu và ảnh trước khi cho khôi phục. Chọn tệp chưa thay đổi dữ liệu hiện tại; cần xác nhận **Khôi phục bản sao** để thay thế. Nên tải bản sao hiện tại trước khi thay thế. Tệp sai định dạng hoặc không đủ dung lượng không ghi đè dữ liệu cũ. Không gửi bản sao lên server.
