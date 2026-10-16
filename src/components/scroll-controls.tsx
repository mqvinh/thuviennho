"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cancelScrollToTop, scrollToTop } from "@/lib/scroll-to-top";
import { mobileNavigationQuery } from "@/lib/sections";
import { helpForPath } from "@/lib/help-guides";
import { ContextualHelp } from "./contextual-help";
export function ScrollControls() {
  const pathname = usePathname();
  const guide = helpForPath(pathname);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const management = pathname === "/admin" || pathname.startsWith("/admin/");
    const slot = document.querySelector<HTMLElement>(management ? ".top-menu-slot" : ".main-menu-slot");
    const menu = slot?.firstElementChild as HTMLElement | undefined;
    if (!slot || !menu) return;
    let previous = window.scrollY;
    let frame = 0;
    const mobile = window.matchMedia(mobileNavigationQuery);
    const measure = () => { slot.style.minHeight = mobile.matches ? "" : `${menu.getBoundingClientRect().height}px`; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const end = slot.getBoundingClientRect().bottom + y;
      const delta = y - previous;
      if (mobile.matches || y <= end || delta > 2) menu.classList.remove("is-floating");
      else if (delta < -2) menu.classList.add("is-floating");
      previous = y;
      setShowTop(y > 350);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = () => { measure(); update(); };
    const cancelScroll = cancelScrollToTop;
    const keyboard = (event: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelScroll(); };
    window.addEventListener("scroll", scroll, { passive: true });
    mobile.addEventListener("change", resize);
    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchstart", cancelScroll, { passive: true });
    window.addEventListener("keydown", keyboard);
    update();
    return () => { window.removeEventListener("scroll", scroll); mobile.removeEventListener("change", resize); window.removeEventListener("wheel", cancelScroll); window.removeEventListener("touchstart", cancelScroll); window.removeEventListener("keydown", keyboard); cancelScroll(); cancelAnimationFrame(frame); observer.disconnect(); menu.classList.remove("is-floating"); slot.style.minHeight = ""; };
  }, [pathname]);
  return <div className="floating-controls">
    <button className={`back-to-top${showTop ? " visible" : ""}`} aria-label="Lên đầu trang" disabled={!showTop} tabIndex={showTop ? 0 : -1} onClick={scrollToTop}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5h14M6 13l6-6 6 6M12 7v14" /></svg>
    </button>
    {guide && <ContextualHelp key={pathname} guide={guide} />}
  </div>;
}
