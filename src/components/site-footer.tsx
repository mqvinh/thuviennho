import Image from "next/image";
import Link from "next/link";
import { io } from "next/cache";
import { getSiteSettings } from "@/lib/site-settings";
import { getThemes } from "@/lib/library";
import { sections } from "@/lib/sections";
import { ThemeIcon } from "./theme-icon";
import { ListeningIcon } from "./listening-icon";

const support = [
  { href: "/ho-tro", icon: "📖", title: "Hướng dẫn sử dụng" },
  { href: "/huong-dan#cau-hoi", icon: "❔", title: "Câu hỏi thường gặp" },
  { href: "/huong-dan#lien-he", icon: "✉️", title: "Liên hệ với chúng tôi" },
  { href: "/huong-dan#phu-huynh", icon: "👥", title: "Dành cho phụ huynh" },
  { href: "/huong-dan#gop-y", icon: "⚙️", title: "Góp ý & phản hồi" },
];
export async function SiteFooter() {
  await io();
  const [settings, themes] = await Promise.all([getSiteSettings(), getThemes()]);
  return <div className="footer-card">
    <div className="footer-main">
      <section className="footer-introduction" aria-label="Về thư viện">
        <Link href="/" className="footer-brand">
          {settings.logo_path ? <Image src={settings.logo_path} alt="" width={60} height={60} unoptimized /> : <span aria-hidden="true">📚</span>}
          <strong>{settings.site_name}</strong><ListeningIcon name="sprout" />
        </Link>
        <p className="footer-motto">Mỗi ngày một câu chuyện · Cùng đọc, cùng lớn lên!</p>
        <p>Những câu chuyện song ngữ thú vị giúp em yêu thích đọc sách, khám phá thế giới và nuôi dưỡng ước mơ mỗi ngày!</p>
        <Link className="footer-management" href="/admin">Quản lý thư viện →</Link>
      </section>
      <nav className="footer-column footer-explore" aria-label="Khám phá thư viện">
        <h2><ListeningIcon name="book" />Khám phá</h2>
        {sections.map(section => <Link key={section.href} href={section.href}><span aria-hidden="true">{section.icon}</span>{section.title}</Link>)}
      </nav>
      <nav className="footer-column footer-topics" aria-label="Chủ đề đọc sách">
        <h2><ListeningIcon name="sprout" />Chủ đề</h2>
        {themes.map(theme => <Link key={theme.slug} href={`/tu-sach?chu-de=${encodeURIComponent(theme.slug)}#books`}><ThemeIcon path={theme.icon_path} />{theme.name_vi}</Link>)}
      </nav>
      <nav className="footer-column footer-support" aria-label="Hỗ trợ thư viện">
        <h2><span aria-hidden="true">💬</span>Hỗ trợ</h2>
        {support.map(item => <Link href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span>{item.title}</Link>)}
      </nav>
      <div className="footer-art" aria-hidden="true"><p>Mỗi ngày<br />đọc một chút!</p><div /></div>
    </div>
    <div className="footer-bottom">
      <p><ListeningIcon name="sprout" />© {new Date().getFullYear()} {settings.site_name} · Góc đọc song ngữ cho bé</p>
      <div><span><ListeningIcon name="heart" />Đọc cùng con mỗi ngày</span></div>
    </div>
  </div>;
}
