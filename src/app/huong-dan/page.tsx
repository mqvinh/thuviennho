import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

async function RuntimeMetadata() {
  await connection();
  return null;
}

export default function HelpPage() {
  return <article className="reading-width help-page">
    <Suspense fallback={null}><RuntimeMetadata /></Suspense>
    <header className="panel"><h1>Cùng khám phá thư viện</h1><p>Một vài gợi ý để em và gia đình đọc sách thật vui mỗi ngày.</p><Link className="button" href="/">Về tủ sách →</Link></header>
    <section id="cau-hoi" className="panel"><h2>Câu hỏi thường gặp</h2>
      <h3>Làm sao để nghe truyện?</h3><p>Mở mục “Nghe sách”, chọn một truyện rồi bấm “Nghe truyện”. Em có thể chọn câu, tiếng Việt hoặc tiếng Anh và tốc độ nghe trong trang đọc.</p>
      <h3>Làm sao để lưu từ yêu thích?</h3><p>Trong mục từ vựng, chạm “Yêu thích từ”. Mở tab “Từ yêu thích” để xem lại những từ đã lưu trên thiết bị này.</p>
      <h3>Nhật ký và hành trình được lưu ở đâu?</h3><p>Dữ liệu được lưu trong trình duyệt trên thiết bị em đang dùng. Mục “Hành trình đọc sách” có chức năng xuất và nhập bản sao để em giữ lại những khám phá của mình.</p>
    </section>
    <section id="phu-huynh" className="panel"><h2>Dành cho phụ huynh</h2><p>Cùng con chọn một câu chuyện, nghe và đọc theo từng câu, rồi trò chuyện về nhân vật hoặc điều con nhớ. Con có thể học một từ mới, thử một câu hỏi và ghi lại cảm nhận trong nhật ký.</p><p>Khuyến khích con đọc theo nhịp của mình. Một buổi đọc ngắn, đều đặn và vui vẻ cũng là một bước tiến đáng quý.</p></section>
    <section id="lien-he" className="panel"><h2>Liên hệ với chúng tôi</h2><p>Phụ huynh và học sinh có thể trao đổi trực tiếp với giáo viên hoặc người quản lý thư viện của lớp khi cần hỗ trợ học liệu, tài khoản hay cách sử dụng.</p></section>
    <section id="gop-y" className="panel"><h2>Góp ý & phản hồi</h2><p>Khi góp ý cho người quản lý thư viện, hãy ghi lại tên truyện, mục đang sử dụng và điều em muốn cải thiện. Với lỗi nghe truyện, thêm tên thiết bị và trình duyệt sẽ giúp giáo viên kiểm tra dễ hơn.</p></section>
  </article>;
}
