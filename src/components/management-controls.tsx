"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function EmptyTableRow({ columns, children }: { columns: number; children: ReactNode }) {
  return <tr><td colSpan={columns} className="table-empty">{children}</td></tr>;
}
export function usePagination<T>(items: T[], size = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  return { rows: items.slice((current - 1) * size, current * size), page: current, pages, setPage };
}
export function Pagination({ page, pages, setPage }: { page: number; pages: number; setPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Phân trang danh sách">
    <button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button>
    {Array.from({ length: pages }, (_, i) => i + 1).map(n => <button className={`button ${n === page ? "" : "secondary"}`} aria-label={`Trang ${n}`} aria-current={n === page ? "page" : undefined} key={n} onClick={() => setPage(n)}>{n}</button>)}
    <button className="button secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Sau →</button>
  </nav>;
}
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    const close = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setPosition(null); trigger.current?.focus(); } };
    const scroll = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) { setPosition(null); return; }
      if (panel.current) { panel.current.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 340))}px`; panel.current.style.left = `${Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288))}px`; }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", scroll);
    window.addEventListener("scroll", scroll);
    panel.current?.querySelector<HTMLElement>("a, button, summary")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); window.removeEventListener("resize", scroll); window.removeEventListener("scroll", scroll); };
  }, [position]);
  return <>
    <button ref={trigger} type="button" className="row-menu-trigger" aria-label={`Thao tác ${label}`} aria-expanded={!!position} onClick={() => {
      if (position) { setPosition(null); return; }
      const rect = trigger.current!.getBoundingClientRect();
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 340)), left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)) });
    }}><span aria-hidden="true">⋮</span></button>
    {position && createPortal(<div ref={panel} className="row-dropdown" role="group" aria-label={`Thao tác ${label}`} style={position} onClick={event => {
      const target = event.target as HTMLElement;
      if (target.closest("a, button") && !target.closest("form")) setPosition(null);
    }}>{children}</div>, document.body)}
  </>;
}
