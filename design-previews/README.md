# 5 bản thiết kế Thư Viện Nhỏ

Mở index.html để so sánh. Mỗi mẫu có trang thư viện và bảng quản trị. Bản minh họa tĩnh, chưa tích hợp vào ứng dụng.

1. Vườn truyện: Ấm áp · Tự nhiên · Gần gũi (01-vuon-truyen.html)
2. Hành tinh đọc: Vui tươi · Sáng tạo · Nổi bật (02-hanh-tinh-doc.html)
3. Tạp chí nhỏ: Tinh tế · Thanh lịch · Tập trung vào nội dung (03-tap-chi-nho.html)
4. Thư viện số: Gọn gàng · Hiện đại · Dễ sử dụng (04-thu-vien-so.html)
5. Xưởng sáng tạo: Cá tính · Nhiều màu sắc · Giàu tương tác (05-xuong-sang-tao.html)

Ảnh minh họa sách tải từ Unsplash, không phải ảnh AI hoặc bìa truyện chính thức:
- https://unsplash.com/photos/1507842217343-583bb7270b66 (nguồn tải: images.unsplash.com/photo-1507842217343-583bb7270b66)
- https://images.unsplash.com/photo-1481627834876-b7833e8f5570
- https://images.unsplash.com/photo-1519682337058-a94d519337bc

Ảnh chụp tạo bằng Chromium từ các file HTML. Công cụ imagegen tích hợp không có trong phiên; không gọi API tạo ảnh.

## 5 bố cục mới (mẫu 06–10)

Mở index-06-10.html hoặc chạy `node design-previews/serve.mjs` rồi vào http://localhost:3200.

- 06: Kệ sách ấm áp — lọc chủ đề, bìa sách hover, hộp đọc thử.
- 07: Bản đồ khám phá — chọn đảo cập nhật bảng truyện bên phải.
- 08: Báo truyện nhỏ — bố cục ba cột, masthead và mục lục.
- 09: Không gian học tập — sidebar, tìm kiếm, đổi lưới/danh sách và bảng quản trị.
- 10: Sân khấu truyện — carousel, playlist và sóng chuyển động có nút dừng.

Tương tác minh họa đã kiểm tra bằng Chromium. Không nối dữ liệu, không phát audio, không thay đổi website hiện tại.
