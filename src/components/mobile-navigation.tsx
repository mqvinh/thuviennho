"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { isSectionActive, mobileNavigationQuery } from "@/lib/sections";

const primaryItems = [
  { href: "/", label: "Tủ sách", icon: "book" },
  { href: "/nghe-sach", label: "Nghe", icon: "headphones" },
  { href: "/tu-vung", label: "Từ vựng", icon: "sprout" },
  { href: "/nhat-ky", label: "Nhật ký", icon: "pencil" },
] as const;

const moreItems = [
  { href: "/thu-tai", label: "Đọc vui thử tài", description: "Kiểm tra hiểu biết qua những câu hỏi thú vị", icon: "trophy" },
  { href: "/hanh-trinh", label: "Hành trình đọc sách", description: "Theo dõi và lưu giữ hành trình của bạn", icon: "sun" },
] as const;

function NavigationIcon({ name }: { name: string }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "book" && <><path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Z" /><path d="M12 5v15" /></>}
    {name === "headphones" && <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>}
    {name === "sprout" && <><path d="M12 21v-9M12 16c0-6 3-10 9-10 0 6-3 10-9 10ZM12 12C6 12 3 9 3 4c6 0 9 2 9 8Z" /></>}
    {name === "pencil" && <><path d="m15 4 5 5M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15l-1 5ZM5 15l4 4" /></>}
    {name === "more" && <>{[5, 12, 19].map(cx => <circle key={cx} cx={cx} cy="12" r="1.8" fill="currentColor" stroke="none" />)}</>}
    {name === "trophy" && <><path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 15v6M8 21h8" /></>}
    {name === "sun" && <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>}
  </svg>;
}

type TabBarProps = {
  pathname?: string;
  moreOpen?: boolean;
  moreId?: string;
  moreButton?: Ref<HTMLButtonElement>;
  onMore?: () => void;
  onNavigate?: () => void;
};

function TabBar({ pathname = "", moreOpen = false, moreId, moreButton, onMore, onNavigate }: TabBarProps) {
  const moreActive = moreOpen || moreItems.some(item => isSectionActive(pathname, item.href));
  return <nav className="mobile-bottom-nav" aria-label="Menu chính trên di động">
    {primaryItems.map(item => <Link key={item.href} href={item.href} className="mobile-nav-tab" aria-current={!moreOpen && isSectionActive(pathname, item.href) ? "page" : undefined} onNavigate={onNavigate}>
      <span className="mobile-nav-symbol"><NavigationIcon name={item.icon} /></span>
      <span className="mobile-nav-label">{item.label}</span>
    </Link>)}
    <button ref={moreButton} type="button" className={`mobile-nav-tab${moreActive ? " is-active" : ""}`} aria-expanded={moreOpen} aria-controls={moreOpen ? moreId : undefined} aria-haspopup="dialog" onClick={onMore} disabled={!onMore}>
      <span className="mobile-nav-symbol"><NavigationIcon name="more" /></span>
      <span className="mobile-nav-label">Thêm</span>
    </button>
  </nav>;
}

export function MobileNavigationFallback() {
  return <div className="mobile-nav-shell"><TabBar /></div>;
}

export function MobileNavigation() {
  const pathname = usePathname();
  return <MobileNavigationContent key={pathname} pathname={pathname} />;
}

function MobileNavigationContent({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const moreId = useId();
  const titleId = useId();

  useEffect(() => {
    const media = window.matchMedia(mobileNavigationQuery);
    const resize = () => { if (!media.matches) setMoreOpen(false); };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const shellElement = shell.current;
    const trigger = moreButton.current;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelectorAll<HTMLElement>(".site-header, #main-content, .site-footer, .back-to-top, .skip-link")];
    const inertStates = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => shellElement?.querySelector<HTMLAnchorElement>(".mobile-more-link[aria-current='page'], .mobile-more-link")?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => { element.inert = inertStates[index]; });
      if (trigger?.isConnected && window.matchMedia(mobileNavigationQuery).matches && (document.activeElement === document.body || shellElement?.contains(document.activeElement))) trigger.focus({ preventScroll: true });
    };
  }, [moreOpen]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!moreOpen) return;
    if (event.key === "Escape") { event.preventDefault(); setMoreOpen(false); return; }
    if (event.key !== "Tab") return;
    const targets = shell.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled):not([tabindex='-1'])");
    const first = targets?.[0], last = targets?.[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return <div ref={shell} className={`mobile-nav-shell${moreOpen ? " has-more" : ""}`} role={moreOpen ? "dialog" : undefined} aria-modal={moreOpen ? true : undefined} aria-labelledby={moreOpen ? titleId : undefined} onKeyDown={onKeyDown}>
    {moreOpen && <>
      <button type="button" className="mobile-more-backdrop" tabIndex={-1} aria-label="Đóng menu Thêm" onClick={() => setMoreOpen(false)} />
      <section id={moreId} className="mobile-more-sheet">
        <span className="mobile-more-handle" aria-hidden="true" />
        <div className="mobile-more-heading"><h2 id={titleId}>Khám phá thêm</h2><button type="button" className="mobile-more-close" aria-label="Đóng menu" onClick={() => setMoreOpen(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
        <div className="mobile-more-items">{moreItems.map(item => <Link className="mobile-more-link" key={item.href} href={item.href} aria-current={isSectionActive(pathname, item.href) ? "page" : undefined} onNavigate={() => setMoreOpen(false)}>
          <span className={`mobile-more-icon ${item.icon}`}><NavigationIcon name={item.icon} /></span>
          <span className="mobile-more-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
          <svg className="mobile-more-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </Link>)}</div>
      </section>
    </>}
    <TabBar pathname={pathname} moreOpen={moreOpen} moreId={moreId} moreButton={moreButton} onMore={() => setMoreOpen(open => !open)} onNavigate={() => setMoreOpen(false)} />
  </div>;
}
