"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { helpGuides, type HelpGuide } from "@/lib/help-guides";
import { HelpArticle } from "./help-article";
import { HelpNavigation } from "./help-navigation";
import { ListeningIcon } from "./listening-icon";

export function ContextualHelp({ guide }: { guide: HelpGuide }) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(guide.slug);
  const dialog = useRef<HTMLDialogElement>(null), content = useRef<HTMLDivElement>(null);
  const titleId = useId(), prefix = useId();
  const active = helpGuides.find(item => item.slug === selected) ?? guide;
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    const frame = requestAnimationFrame(() => {
      // The article is visible on both desktop and mobile, including when the
      // mobile topic list is collapsed. The matching topic is selected as well.
      content.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      if (content.current) content.current.scrollTop = 0;
    });
    return () => { cancelAnimationFrame(frame); element?.close(); document.body.style.overflow = overflow; };
  }, [open]);
  function select(slug: string) {
    setSelected(slug);
    requestAnimationFrame(() => {
      if (content.current) { content.current.scrollTop = 0; content.current.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }); }
    });
  }
  return <>
    <button type="button" className="contextual-help-button" aria-label="Hỗ trợ trang này" title={`Hướng dẫn: ${guide.title}`} aria-haspopup="dialog" onClick={() => { setSelected(guide.slug); setOpen(true); }}><ListeningIcon name="help" /></button>
    <dialog ref={dialog} className="help-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      {open && <div className="help-dialog-shell">
        <header className="help-dialog-heading"><div><ListeningIcon name="help" /><h2 id={titleId}>Hỗ trợ & hướng dẫn</h2></div><button type="button" className="help-close-icon" aria-label="Đóng hướng dẫn" onClick={() => setOpen(false)}>×</button></header>
        <div className="help-dialog-body"><HelpNavigation key={guide.slug} active={active.slug} onSelect={select} /><div ref={content} className="help-dialog-content"><HelpArticle guide={active} prefix={prefix} onNavigate={() => setOpen(false)} /></div></div>
        <footer className="help-dialog-footer"><Link href={`/ho-tro/${active.slug}`} onNavigate={() => setOpen(false)}>Mở hướng dẫn thành trang riêng<ListeningIcon name="arrow-right" /></Link><button type="button" className="button" onClick={() => setOpen(false)}>Đóng</button></footer>
      </div>}
    </dialog>
  </>;
}
