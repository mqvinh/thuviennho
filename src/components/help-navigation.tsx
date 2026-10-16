"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { helpGuides } from "@/lib/help-guides";
import { ListeningIcon } from "./listening-icon";

export function HelpNavigation({ active, onSelect }: { active: string; onSelect?: (slug: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId(), toggle = useRef<HTMLButtonElement>(null);
  return <aside className={`help-sidebar${expanded ? " is-expanded" : ""}`} onKeyDown={event => {
    if (event.key === "Escape" && expanded) { event.preventDefault(); event.stopPropagation(); setExpanded(false); toggle.current?.focus(); }
  }}>
    <div className="help-sidebar-heading"><h2>Danh sách hướng dẫn</h2><button ref={toggle} type="button" className="help-list-toggle" aria-label="Danh sách hướng dẫn" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}><ListeningIcon name="menu" /></button></div>
    <nav id={id} className="help-topics" aria-label="Danh sách hướng dẫn">
      {helpGuides.map(guide => {
        const content = <><span className="help-topic-icon" aria-hidden="true">{guide.icon}</span><span>{guide.title}</span></>;
        return onSelect ? <button type="button" key={guide.slug} className="help-topic" aria-current={guide.slug === active ? "page" : undefined} data-guide-active={guide.slug === active || undefined} onClick={() => { onSelect(guide.slug); setExpanded(false); }}>{content}</button>
          : <Link key={guide.slug} href={`/ho-tro/${guide.slug}`} className="help-topic" aria-current={guide.slug === active ? "page" : undefined} onNavigate={() => setExpanded(false)}>{content}</Link>;
      })}
    </nav>
    <p className="help-sidebar-note">Chọn nội dung cần xem rồi cùng thực hành nhé!</p>
  </aside>;
}
