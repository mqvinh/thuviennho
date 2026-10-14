"use client";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

export function EditorGroup({ title, addLabel, disabled, onAdd, children }: { title: string; addLabel: string; disabled: boolean; onAdd: () => void; children: ReactNode }) {
  return <section className="panel editor-section"><div className="management-heading form-heading"><h2>{title}</h2><button type="button" className="icon-button add-item" aria-label={addLabel} title={addLabel} disabled={disabled} onClick={onAdd}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button></div>{children}</section>;
}
export function EditorItem({ itemKey, group, title, subtitle, index, count, expanded, onToggle, onMove, onDelete, children }: { itemKey: string; group: string; title: string; subtitle: string; index: number; count: number; expanded: boolean; onToggle: (open: boolean) => void; onMove: (fromKey: string, toIndex: number) => void; onDelete: () => void; children: ReactNode }) {
  const article = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; active: boolean } | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const clearTarget = () => { target.current?.classList.remove("drag-over"); target.current = null; };
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    target.current?.classList.remove("drag-over");
  }, []);

  function updateTarget() {
    const current = pointer.current;
    if (!current?.active) return;
    const hit = document.elementFromPoint(current.x, current.y)?.closest<HTMLElement>(".editor-item");
    const next = hit?.dataset.itemGroup === group && hit.parentElement === article.current?.parentElement && hit !== article.current ? hit : null;
    if (next !== target.current) { clearTarget(); target.current = next; next?.classList.add("drag-over"); }
  }
  function autoScroll() {
    const current = pointer.current;
    if (!current?.active) return;
    const distance = current.y < 80 ? -12 : current.y > innerHeight - 80 ? 12 : 0;
    if (distance) { window.scrollBy({ top: distance, behavior: "instant" }); updateTarget(); }
    frame.current = requestAnimationFrame(autoScroll);
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const destination = target.current;
    if (commit && current.active && destination) {
      const position = [...article.current!.parentElement!.querySelectorAll<HTMLElement>(".editor-item")].indexOf(destination);
      if (position >= 0 && position !== index) { onMove(itemKey, position); setAnnouncement(`Đã chuyển ${title.toLowerCase()} đến vị trí ${position + 1}.`); }
    }
    pointer.current = null; clearTarget(); setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const fieldsId = `editor-fields-${itemKey}`;
  return <article ref={article} id={`editor-${itemKey}`} className={`editor-item${dragging ? " is-dragging" : ""}`} data-item-key={itemKey} data-item-group={group} data-expanded={expanded} aria-label={title}>
    <div className="editor-item-heading">
      <button type="button" className="drag-handle" aria-label={`Kéo để sắp xếp ${title}`} title="Kéo để sắp xếp" onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={event => {
        const current = pointer.current; if (!current || current.id !== event.pointerId) return;
        current.x = event.clientX; current.y = event.clientY;
        if (!current.active && Math.hypot(current.x - current.startX, current.y - current.startY) >= 6) { current.active = true; setDragging(true); frame.current = requestAnimationFrame(autoScroll); }
        updateTarget();
      }} onPointerUp={event => finishDrag(event, true)} onPointerCancel={event => finishDrag(event, false)} onLostPointerCapture={event => finishDrag(event, false)} onKeyDown={event => {
        if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); onMove(itemKey, index - 1); }
        if (event.key === "ArrowDown" && index < count - 1) { event.preventDefault(); onMove(itemKey, index + 1); }
      }}>⠿</button>
      <button type="button" className="editor-item-toggle" aria-expanded={expanded} aria-controls={fieldsId} onClick={() => onToggle(!expanded)}>
        <span className="editor-item-title"><strong>{title}</strong><span>{subtitle || "Chưa có nội dung"}</span></span>
      </button>
      <div className="item-order-actions">
        <button type="button" className="icon-button" aria-label={`Đưa ${title.toLowerCase()} lên`} disabled={index === 0} onClick={() => onMove(itemKey, index - 1)}>↑</button>
        <button type="button" className="icon-button" aria-label={`Đưa ${title.toLowerCase()} xuống`} disabled={index === count - 1} onClick={() => onMove(itemKey, index + 1)}>↓</button>
        <button type="button" className="icon-button delete-item" aria-label={`Xóa ${title.toLowerCase()}`} title={`Xóa ${title.toLowerCase()}`} onClick={onDelete}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
      </div>
    </div>
    <div id={fieldsId} className="form-grid editor-item-fields" hidden={!expanded}>{children}</div>
    <span className="sr-only" role="status">{announcement}</span>
  </article>;
}
