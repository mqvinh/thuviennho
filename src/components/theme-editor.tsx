"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { FieldLabel } from "./field-label";
import { MediaField } from "./media-field";
export type ThemeRecord = { slug: string; name_vi: string; name_en: string; icon_path?: string | null; story_count?: number };
export function ThemeEditor({ themes, catalogReady, editSlug = "" }: { themes: ThemeRecord[]; catalogReady: boolean; editSlug?: string }) {
  if (!catalogReady) return <LoadingIndicator label="Đang tải chủ đề" />;
  const theme = themes.find(item => item.slug === editSlug);
  if (editSlug && !theme) return <section className="panel"><p>Không tìm thấy chủ đề.</p><Link className="button secondary" href="/admin/chu-de">← Quay lại</Link></section>;
  return <ThemeForm initial={theme ?? { slug: "", name_vi: "", name_en: "", icon_path: "" }} editing={!!editSlug} />;
}
function ThemeForm({ initial, editing }: { initial: ThemeRecord; editing: boolean }) {
  const router = useRouter(); const { notify } = useUI(); const form = useRef<HTMLFormElement>(null);
  const [theme, setTheme] = useState(initial); const [baseline, setBaseline] = useState(JSON.stringify(initial)); const [busy, setBusy] = useState(false);
  async function save() {
    if (!form.current?.reportValidity()) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/teacher/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: editing ? "update" : "create", ...theme }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setBaseline(JSON.stringify(theme)); return true;
    } catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được chủ đề."); return false; }
    finally { setBusy(false); }
  }
  useUnsavedChanges(JSON.stringify(theme) !== baseline, save, () => setTheme(JSON.parse(baseline)), busy);
  return <section className="panel"><div className="management-heading form-heading"><h2>{editing ? "Sửa chủ đề" : "Tạo chủ đề mới"}</h2><Link className="button secondary" href="/admin/chu-de">← Quay lại</Link></div>
    <form ref={form} className="form-grid" onSubmit={async event => { event.preventDefault(); if (await save()) { router.push("/admin/chu-de?saved=1"); router.refresh(); void notify("Đã lưu chủ đề.", "Đã lưu"); } }}><fieldset disabled={busy} className="editor-fieldset form-grid">
      <label><FieldLabel required>Mã chủ đề</FieldLabel><input name="slug" value={theme.slug} readOnly={editing} required maxLength={100} pattern="[a-z0-9-]+" placeholder="long-tot" onChange={event => setTheme({ ...theme, slug: event.target.value })} /></label>
      <label><FieldLabel required>Tên chủ đề tiếng Việt</FieldLabel><input name="name_vi" value={theme.name_vi} required maxLength={100} onChange={event => setTheme({ ...theme, name_vi: event.target.value })} /></label>
      <label><FieldLabel required>Tên chủ đề English</FieldLabel><input name="name_en" value={theme.name_en} required maxLength={100} onChange={event => setTheme({ ...theme, name_en: event.target.value })} /></label>
      <MediaField label="Icon chủ đề" kind="image" value={theme.icon_path ?? ""} onChange={icon_path => setTheme({ ...theme, icon_path })} />
      <div className="actions"><button className="button">{busy && <LoadingIndicator inline />}Lưu chủ đề</button></div>
    </fieldset></form>
  </section>;
}
