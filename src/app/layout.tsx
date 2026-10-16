import { Suspense } from "react";
import Image from "next/image";
import { io } from "next/cache";
import { sections } from "@/lib/sections";
import { getTeacher } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { MobileNavigation, MobileNavigationFallback } from "@/components/mobile-navigation";
import { ScrollControls } from "@/components/scroll-controls";
import { AccountMenu } from "@/components/account-menu";
import { HeaderLogin } from "@/components/header-login";
import { UIProvider } from "@/components/ui-provider";
import { SiteFooter } from "@/components/site-footer";
import { LoadingIndicator } from "@/components/loading-indicator";
import "./archivo-fonts.css";
import "./globals.css";
import "./honey-theme.css";
import "./reading-theme.css";
import "./library-theme.css";
import "./site-experience.css";
import "./journey-theme.css";
import "./journey-map.css";
import "./journal-theme.css";
import "./games-theme.css";
import "./illustration-motion.css";
import "./mobile-navigation.css";
import "./support-theme.css";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.site_name,
    description: settings.site_description || "Thư viện học liệu song ngữ dành cho phụ huynh và giáo viên.",
    icons: { icon: settings.icon_path || "/images/book-cover.svg" },
  };
}
async function HeaderBrand() {
  const settings = await getSiteSettings();
  return <Link href="/" className="brand">
    {settings.logo_path ? <Image className="brand-logo" src={settings.logo_path} alt={`Logo ${settings.site_name}`} width={52} height={52} unoptimized /> : <span className="brand-icon" aria-hidden="true">📚</span>}
    <span className="brand-name">{settings.site_name}{settings.site_description && <small>{settings.site_description}</small>}</span>
  </Link>;
}
async function HeaderAccount() {
  await io();
  return <AccountMenu teacher={await getTeacher()} />;
}
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <UIProvider>
        <a href="#main-content" className="skip-link">Đến nội dung chính</a>
        <header className="site-header">
          <div className="top-menu-slot"><div className="shell brand-row">
            <Suspense fallback={<Link href="/" className="brand">
              <span className="brand-icon" aria-hidden="true">📚</span>
              <span>Thư Viện Nhỏ<small>Little Readers · Cùng đọc mỗi ngày</small></span>
            </Link>}><HeaderBrand /></Suspense>
            <Suspense fallback={<HeaderLogin />}>
              <HeaderAccount />
            </Suspense>
          </div>
          </div>
          <div className="main-menu-slot"><div className="main-menu"><div className="shell">
            <Suspense fallback={<nav aria-label="Các khu vực thư viện" className="navigation">{sections.map(s => <Link key={s.href} href={s.href}>{s.icon} {s.title}</Link>)}</nav>}>
              <Navigation />
            </Suspense>
          </div></div></div>
        </header>
        <Suspense fallback={null}><ScrollControls /></Suspense>
        <main id="main-content" tabIndex={-1} className="shell main-content">{children}</main>
        <footer className="site-footer"><div className="footer-shell">
          <Suspense fallback={<LoadingIndicator />}><SiteFooter /></Suspense>
        </div></footer>
        <Suspense fallback={<MobileNavigationFallback />}><MobileNavigation /></Suspense>
        </UIProvider>
      </body>
    </html>
  );
}
