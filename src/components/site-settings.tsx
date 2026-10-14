"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteSettings } from "@/lib/site-settings";
import { MediaField } from "./media-field";
import { FieldLabel } from "./field-label";
import { LoadingIndicator } from "./loading-indicator";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { MEDIA_LIMIT_MB } from "@/lib/media-limits";

export function WebsiteSettings() {
  const router = useRouter(); const { notify } = useUI();
  const form = useRef<HTMLFormElement>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/settings", { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setSettings(data); setBaseline(JSON.stringify(data));
    }).catch(error => { if (error.name !== "AbortError") { setFailed(true); void notify(error.message); } });
    return () => controller.abort();
  }, [notify]);
  async function save() {
    if (form.current?.querySelector('.media-field[aria-busy="true"]')) {
      void notify("Hãy chờ ảnh tải lên hoàn tất trước khi lưu cài đặt."); return false;
    }
    if (!settings || !form.current?.reportValidity()) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/teacher/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setBaseline(JSON.stringify(settings)); router.refresh(); return true;
    } catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được cài đặt."); return false; }
    finally { setBusy(false); }
  }
  useUnsavedChanges(!!settings && JSON.stringify(settings) !== baseline, save, () => { if (baseline) setSettings(JSON.parse(baseline)); }, busy);
  if (!settings) return failed ? <p>Chưa tải được cài đặt. Hãy tải lại trang để thử lại.</p> : <LoadingIndicator label="Đang tải cài đặt website" />;
  return <section className="panel website-settings">
    <div className="management-heading form-heading"><h2>Thông tin website</h2><Link className="button secondary" href="/admin/truyen">← Quay lại</Link></div>
    <p className="muted">Tên, mô tả và logo xuất hiện trên website. Icon được hiển thị trên tab trình duyệt.</p>
    <form className="form-grid" ref={form} onSubmit={async event => { event.preventDefault(); if (await save()) void notify("Đã cập nhật thông tin website.", "Đã lưu cài đặt"); }}>
      <fieldset className="editor-fieldset form-grid" disabled={busy}>
        <label><FieldLabel required>Tên website</FieldLabel><input name="site_name" required maxLength={100} value={settings.site_name} onChange={event => setSettings({ ...settings, site_name: event.target.value })} /></label>
        <label>Mô tả website<textarea aria-label="Mô tả website" name="site_description" maxLength={300} value={settings.site_description} onChange={event => setSettings({ ...settings, site_description: event.target.value })} /></label>
        <div className="form-row">
          <div><MediaField label="Icon website" kind="image" value={settings.icon_path} onChange={icon_path => setSettings(previous => previous && ({ ...previous, icon_path }))} /><p className="field-hint">Ảnh vuông PNG, JPG hoặc WebP; nên dùng từ 64 × 64 px.</p></div>
          <div><MediaField label="Logo website" kind="image" value={settings.logo_path} onChange={logo_path => setSettings(previous => previous && ({ ...previous, logo_path }))} /><p className="field-hint">PNG, JPG hoặc WebP, tối đa {MEDIA_LIMIT_MB} MB. Ảnh được giữ nguyên tỉ lệ.</p></div>
        </div>
        <div className="actions"><button className="button">{busy && <LoadingIndicator inline />}Lưu cài đặt</button></div>
      </fieldset>
    </form>
  </section>;
}
