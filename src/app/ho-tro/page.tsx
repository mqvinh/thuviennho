import Link from "next/link";
import { CatalogBanner } from "@/components/catalog-banner";
import { IllustrationScene } from "@/components/illustration-scene";
import { GardenCorners } from "@/components/reading-artwork";
import { ListeningIcon } from "@/components/listening-icon";
import { helpGuides } from "@/lib/help-guides";

export const metadata = { title: "Hỗ trợ & hướng dẫn · Thư Viện Nhỏ" };
export default function SupportPage() {
  return <div className="library-page support-page"><CatalogBanner kind="support" />
    <section id="help-guides" className="help-hub" aria-labelledby="help-hub-title"><div className="help-hub-heading"><span aria-hidden="true">💬</span><div><h2 id="help-hub-title">Bạn cần hướng dẫn phần nào?</h2><p>Chọn một nội dung để xem cách sử dụng, mẹo học cùng nhau và câu hỏi thường gặp.</p></div></div>
      <div className="help-guide-grid">{helpGuides.map((guide, index) => <IllustrationScene key={guide.slug} className="help-guide-card"><Link href={`/ho-tro/${guide.slug}`}>
        <div className={`help-guide-art help-guide-art-${index + 1}`}><span aria-hidden="true">{guide.icon}</span><GardenCorners /></div>
        <div className="help-guide-card-body"><span className="help-eyebrow">{index < 3 ? "HƯỚNG DẪN TRÒ CHƠI" : "TIẾN ĐỘ & SAO LƯU"}</span><h3>{guide.title}</h3><p>{guide.summary}</p><span className="help-card-action">Xem hướng dẫn<ListeningIcon name="arrow-right" /></span></div>
      </Link></IllustrationScene>)}</div>
      <p className="help-hub-note"><ListeningIcon name="help" />Trong các trang có hướng dẫn, chạm nút hỗ trợ ở góc dưới để xem ngay mà vẫn giữ nguyên trang đang dùng.</p>
      <Link href="/huong-dan">Câu hỏi chung, thông tin dành cho phụ huynh và liên hệ →</Link>
    </section>
  </div>;
}
