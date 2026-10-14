"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cancelScrollToTop, scrollToTop } from "@/lib/scroll-to-top";
export function ScrollControls() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const management = pathname === "/admin" || pathname.startsWith("/admin/");
    const slot = document.querySelector<HTMLElement>(management ? ".top-menu-slot" : ".main-menu-slot");
    const menu = slot?.firstElementChild as HTMLElement | undefined;
    if (!slot || !menu) return;
    let previous = window.scrollY;
    let frame = 0;
    const measure = () => { slot.style.minHeight = `${menu.getBoundingClientRect().height}px`; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const end = slot.getBoundingClientRect().bottom + y;
      const delta = y - previous;
      if (y <= end || delta > 2) menu.classList.remove("is-floating");
      else if (delta < -2) menu.classList.add("is-floating");
      previous = y;
      setShowTop(y > 350);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const cancelScroll = cancelScrollToTop;
    const keyboard = (event: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelScroll(); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchstart", cancelScroll, { passive: true });
    window.addEventListener("keydown", keyboard);
    update();
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("wheel", cancelScroll); window.removeEventListener("touchstart", cancelScroll); window.removeEventListener("keydown", keyboard); cancelScroll(); cancelAnimationFrame(frame); observer.disconnect(); menu.classList.remove("is-floating"); slot.style.minHeight = ""; };
  }, [pathname]);
  return <button className={`back-to-top${showTop ? " visible" : ""}`} aria-label="Lên đầu trang" disabled={!showTop} tabIndex={showTop ? 0 : -1} onClick={scrollToTop}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 5h14M6 13l6-6 6 6M12 7v14" /></svg>
  </button>;
}
