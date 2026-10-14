import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty">
      <h1>Không tìm thấy trang</h1>
      <p>
        Trang hoặc truyện này chưa có trong thư viện. Em chọn một câu chuyện
        khác nhé!
      </p>
      <Link className="button" href="/">
        Về tủ sách
      </Link>
    </section>
  );
}
