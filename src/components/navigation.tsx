"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { isSectionActive, sections } from "@/lib/sections";

export function Navigation() {
  const pathname = usePathname();
  return <AdaptiveNavigation key={pathname} pathname={pathname} />;
}

function AdaptiveNavigation({ pathname }: { pathname: string }) {
  const [count, setCount] = useState(sections.length), [measured, setMeasured] = useState(false), [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null), measure = useRef<HTMLDivElement>(null), more = useRef<HTMLButtonElement>(null);
  const countRef = useRef(sections.length), panel = useRef<HTMLDivElement>(null), id = useId();
  const remaining = sections.slice(count), overflowActive = remaining.some(section => isSectionActive(pathname, section.href));
  useEffect(() => {
    const element = root.current, ruler = measure.current;
    if (!element || !ruler) return;
    let disposed = false;
    const fit = () => {
      if (disposed || !element.clientWidth) return;
      const widths = [...ruler.children].map(child => child.getBoundingClientRect().width);
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      const available = element.clientWidth;
      let next = sections.length;
      if (widths.slice(0, -1).reduce((sum, width) => sum + width, 0) + gap * (sections.length - 1) > available) {
        next = 0;
        let used = widths[widths.length - 1];
        for (const width of widths.slice(0, -1)) { if (used + gap + width > available) break; used += gap + width; next++; }
      }
      if (countRef.current !== next) { countRef.current = next; setCount(next); setOpen(false); }
      setMeasured(true);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element); observer.observe(ruler);
    void document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);
    fit();
    return () => { disposed = true; observer.disconnect(); document.fonts.removeEventListener("loadingdone", fit); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const link = (section: typeof sections[number]) => <Link className="navigation-link" key={section.href} href={section.href} aria-current={isSectionActive(pathname, section.href) ? "page" : undefined} onNavigate={() => setOpen(false)}><span aria-hidden="true">{section.icon}</span>{section.title}</Link>;
  return <nav ref={root} aria-label="Các khu vực thư viện" className="navigation navigation-adaptive" data-measured={measured} onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); more.current?.focus(); }
  }}>
    {sections.slice(0, count).map(link)}
    {remaining.length > 0 && <div className="navigation-more">
      <button ref={more} type="button" className={`navigation-more-trigger${overflowActive ? " is-active" : ""}`} aria-label="Xem thêm" title="Xem thêm" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          const last = event.key === "ArrowUp";
          requestAnimationFrame(() => { const links = panel.current?.querySelectorAll<HTMLAnchorElement>("a"); links?.[last ? links.length - 1 : 0]?.focus(); });
        }
      }}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{[5, 12, 19].map(cx => <circle key={cx} cx={cx} cy="12" r="2" />)}</svg></button>
      {open && <div ref={panel} id={id} className="navigation-more-panel" onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")], current = links.indexOf(document.activeElement as HTMLAnchorElement);
        links[event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus();
      }}>{remaining.map(link)}</div>}
    </div>}
    <div ref={measure} className="navigation-measure" aria-hidden="true" inert>{sections.map(section => <span key={section.href} className="navigation-link"><span>{section.icon}</span>{section.title}</span>)}<span className="navigation-more-trigger"><svg width="24" height="24" /></span></div>
  </nav>;
}
