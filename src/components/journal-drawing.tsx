"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { ListeningIcon } from "./listening-icon";

const drawingColors = [
  { name: "Xanh lá", value: "#276653" },
  { name: "Xanh dương", value: "#287bc1" },
  { name: "Đỏ", value: "#e34242" },
  { name: "Vàng", value: "#f2b629" },
  { name: "Cam", value: "#e97c22" },
  { name: "Tím", value: "#8652c7" },
  { name: "Hồng", value: "#e15b97" },
  { name: "Nâu", value: "#8b522e" },
  { name: "Đen", value: "#263238" },
];

type DrawingProps = {
  canvas: RefObject<HTMLCanvasElement | null>;
  ready: boolean;
  hasDrawing: boolean;
  canClear: boolean;
  onDrawingChange: (hasDrawing: boolean) => void;
  onClear: () => void;
};

function lockBackground(board: HTMLElement) {
  const previousOverflow = document.body.style.overflow;
  const background: { element: HTMLElement; inert: boolean }[] = [];
  let branch = board;
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        background.push({ element: sibling, inert: sibling.inert });
        sibling.inert = true;
      }
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = previousOverflow;
    background.forEach(({ element, inert }) => { element.inert = inert; });
  };
}

export function JournalDrawing({ canvas, ready, hasDrawing, canClear, onDrawingChange, onClear }: DrawingProps) {
  const board = useRef<HTMLElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const nativeFullscreen = useRef(false);
  const stroke = useRef<{ pointerId: number; x: number; y: number; erasing: boolean } | null>(null);
  const [drawingColor, setDrawingColor] = useState(drawingColors[0].value);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    function changed() {
      if (document.fullscreenElement === board.current) nativeFullscreen.current = true;
      else if (nativeFullscreen.current) {
        nativeFullscreen.current = false;
        setFullscreen(false);
      }
    }
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  useEffect(() => {
    if (!fullscreen || !board.current) return;
    // Keep the same canvas mounted, including on mobile browsers without the
    // Fullscreen API. Only siblings outside the drawing board become inert.
    const unlock = lockBackground(board.current);
    fullscreenButton.current?.focus({ preventScroll: true });
    const trigger = fullscreenButton.current;
    return () => {
      unlock();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [fullscreen]);

  function toggleFullscreen() {
    if (fullscreen) {
      if (document.fullscreenElement === board.current) void document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    } else {
      setFullscreen(true);
      // The CSS fullscreen layout also works when native fullscreen is denied
      // or unavailable (for example, in an embedded page or on an iPhone).
      void board.current?.requestFullscreen?.().catch(() => {});
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!fullscreen) return;
    if (event.key === "Escape") { event.preventDefault(); toggleFullscreen(); return; }
    if (event.key !== "Tab") return;
    const targets = board.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    const first = targets?.[0], last = targets?.[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  function position(event: PointerEvent<HTMLCanvasElement>) {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left - target.clientLeft) * target.width) / target.clientWidth,
      y: ((event.clientY - rect.top - target.clientTop) * target.height) / target.clientHeight,
    };
  }

  function finishStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (stroke.current?.pointerId !== event.pointerId) return;
    const erasing = stroke.current.erasing;
    stroke.current = null;
    const target = event.currentTarget;
    const ctx = target.getContext("2d");
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
      if (erasing) {
        const pixels = ctx.getImageData(0, 0, target.width, target.height).data;
        let visible = false;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] !== 0) { visible = true; break; }
        }
        onDrawingChange(visible);
      }
    }
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  function selectColor(color: string) { setDrawingColor(color); setTool("pen"); }

  return <section ref={board} className={`journal-artwork${fullscreen ? " is-fullscreen" : ""}`} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen ? true : undefined} aria-labelledby="journal-artwork-title" onKeyDown={onKeyDown}>
    <div className="journal-artwork-heading"><ListeningIcon name="palette" /><div>
      <h3 id="journal-artwork-title">Vẽ hoặc viết điều em thích</h3>
      <p>Em có thể vẽ tranh hoặc viết bằng nét bút. Phần này không bắt buộc.</p>
    </div><button ref={fullscreenButton} type="button" className="journal-fullscreen-toggle" disabled={!ready} aria-label={fullscreen ? "Thoát toàn màn hình" : "Phóng to khung vẽ"} title={fullscreen ? "Thoát toàn màn hình" : "Phóng to khung vẽ"} aria-pressed={fullscreen} onClick={toggleFullscreen}>
      <ListeningIcon name={fullscreen ? "minimize" : "maximize"} />
    </button></div>
    <div className="journal-drawing-controls">
      <div className="journal-drawing-tools" role="group" aria-label="Công cụ vẽ">
        <button type="button" className="journal-drawing-tool" disabled={!ready} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}><ListeningIcon name="pencil" />Bút vẽ</button>
        <button type="button" className="journal-drawing-tool" disabled={!ready} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}><ListeningIcon name="eraser" />Tẩy</button>
        <button type="button" className="journal-drawing-tool journal-clear-drawing" disabled={!ready || !canClear} aria-label="Xóa toàn bộ hình vẽ" title="Xóa toàn bộ hình vẽ" onClick={onClear}><ListeningIcon name="trash" />Xóa tất cả</button>
      </div>
      <fieldset className="drawing-palette">
        <legend>Chọn màu vẽ</legend>
        <div className="drawing-colors">
          {drawingColors.map(color => <button key={color.value} type="button" disabled={!ready} className="drawing-swatch" aria-label={`Màu ${color.name.toLowerCase()}`} title={color.name} aria-pressed={tool === "pen" && drawingColor === color.value} style={{ "--drawing-color": color.value } as CSSProperties} onClick={() => selectColor(color.value)}><span aria-hidden="true">{tool === "pen" && drawingColor === color.value ? "✓" : ""}</span></button>)}
          <label className="drawing-custom-color">Màu khác<input type="color" disabled={!ready} aria-label="Chọn màu vẽ khác" value={drawingColor} onChange={event => selectColor(event.target.value)} /></label>
        </div>
      </fieldset>
    </div>
    <div className="journal-drawing-stage">
      <canvas ref={canvas} width={800} height={450} aria-label="Bảng vẽ bằng chuột hoặc cảm ứng; em cũng có thể tải ảnh bên dưới" className={`drawing-canvas${tool === "eraser" ? " is-erasing" : ""}`}
        onPointerDown={event => {
          if (!ready || !event.isPrimary || event.button !== 0 || stroke.current || (tool === "eraser" && !hasDrawing)) return;
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const { x, y } = position(event);
          stroke.current = { pointerId: event.pointerId, x, y, erasing: tool === "eraser" };
          ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
          ctx.lineWidth = tool === "eraser" ? 28 : 6;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = drawingColor;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + .01, y + .01);
          ctx.stroke();
          if (tool === "pen") onDrawingChange(true);
        }}
        onPointerMove={event => {
          const active = stroke.current;
          if (!active || active.pointerId !== event.pointerId) return;
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          const { x, y } = position(event);
          ctx.beginPath();
          ctx.moveTo(active.x, active.y);
          ctx.lineTo(x, y);
          ctx.stroke();
          active.x = x;
          active.y = y;
        }}
        onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke}
      />
      {!hasDrawing && <div className="journal-drawing-placeholder" aria-hidden="true"><ListeningIcon name="pencil" /><p>Thỏa sức sáng tạo nào!</p></div>}
    </div>
  </section>;
}
