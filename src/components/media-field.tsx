"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { MEDIA_LIMIT_BYTES, MEDIA_LIMIT_MB } from "@/lib/media-limits";

export function MediaField({ label, kind, value, onChange }: { label: string; kind: "image" | "audio"; value: string; onChange: (value: string) => void }) {
  const { notify } = useUI();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const upload = useRef<AbortController | null>(null);
  useUnsavedChanges(busy, async () => { void notify("Tệp đang được tải lên. Hãy chờ hoàn tất trước khi lưu."); return false; }, () => { upload.current?.abort(); setPreview(""); });
  useEffect(() => () => upload.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const source = preview || value;
  return <div className="media-field" aria-busy={busy}>
    <label>{label}<input type="file" accept={kind === "audio" ? "audio/mpeg,audio/wav,audio/ogg" : "image/png,image/jpeg,image/webp"} disabled={busy} onChange={async event => {
      const input = event.currentTarget; const file = input.files?.[0];
      if (!file) return;
      if (file.size > MEDIA_LIMIT_BYTES) { input.value = ""; void notify(`Hãy chọn tệp có dung lượng tối đa ${MEDIA_LIMIT_MB} MB.`); return; }
      setPreview(URL.createObjectURL(file)); setBusy(true);
      const controller = new AbortController(); upload.current = controller;
      try {
        const response = await fetch("/api/teacher/upload", { method: "POST", headers: { "Content-Type": file.type }, body: file, signal: controller.signal });
        const result = await response.json(); if (!response.ok) throw Error(result.error);
        if (!controller.signal.aborted) { onChange(result.path); setPreview(""); }
      } catch (error) { setPreview(""); if (!controller.signal.aborted) void notify(error instanceof Error ? error.message : "Chưa tải được tệp. Hãy thử lại."); }
      finally { input.value = ""; setBusy(false); upload.current = null; }
    }} /></label>
    {source && (kind === "image" ? <div className="cover-upload-preview media-image"><Image src={source} alt={`${label} đã chọn`} fill sizes="(max-width: 600px) 100vw, 800px" style={{ objectFit: "contain", objectPosition: "center" }} unoptimized /></div> : <div className="media-audio"><audio controls preload="metadata" src={source} aria-label={`Nghe thử ${label}`} /></div>)}
    {busy && <LoadingIndicator label={`Đang tải ${label}`} />}
    {source && <button type="button" className="button secondary media-remove" disabled={busy} onClick={() => { setPreview(""); onChange(""); }}>Bỏ tệp</button>}
  </div>;
}
