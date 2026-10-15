"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteSettings } from "@/lib/site-settings";
import type { AdminAISettings } from "@/lib/ai-settings";
import { MediaField } from "./media-field";
import { FieldLabel } from "./field-label";
import { LoadingIndicator } from "./loading-indicator";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { MEDIA_LIMIT_MB } from "@/lib/media-limits";

type SettingsForm = SiteSettings & { ai: AdminAISettings & { api_key: string; clear_key: boolean } };
const asForm = (settings: SiteSettings & { ai: AdminAISettings }): SettingsForm => ({
  ...settings, ai: { ...settings.ai, api_key: "", clear_key: false },
});

export function WebsiteSettings() {
  const router = useRouter(); const { notify } = useUI();
  const form = useRef<HTMLFormElement>(null);
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/settings", { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      const initial = asForm(data);
      setSettings(initial); setBaseline(JSON.stringify(initial));
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
      const response = await fetch("/api/teacher/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, ai: settings.ai.schema_ready ? settings.ai : undefined }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      const saved = asForm({ ...settings, ai: result.ai });
      setSettings(saved); setBaseline(JSON.stringify(saved)); router.refresh(); return true;
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
        <fieldset className="form-grid" disabled={!settings.ai.schema_ready}>
          <legend>Cấu hình AI hỗ trợ</legend>
          <p className="field-hint">Cấu hình dùng chung cho chức năng tạo bản nháp bằng AI. Chỉ quản trị viên được thay đổi.</p>
          {!settings.ai.schema_ready && <p role="status">Cần cập nhật cơ sở dữ liệu bằng migration cấu hình AI trước khi lưu mục này.</p>}
          <label>Địa chỉ API<input name="ai_api_url" type="url" maxLength={1000} value={settings.ai.api_url} onChange={event => setSettings({ ...settings, ai: { ...settings.ai, api_url: event.target.value } })} aria-describedby="ai-api-hint" /></label>
          <p className="field-hint" id="ai-api-hint">Ví dụ: https://api.openai.com/v1/responses. Có thể nhập URL gốc kết thúc bằng /v1; API cần tương thích OpenAI Responses và hỗ trợ Structured Outputs.</p>
          <label>API key<input name="ai_api_key" type="password" autoComplete="new-password" maxLength={2000} disabled={settings.ai.clear_key} value={settings.ai.api_key} placeholder={settings.ai.has_key ? "Đã có key — để trống để giữ nguyên" : "Nhập API key"} onChange={event => setSettings({ ...settings, ai: { ...settings.ai, api_key: event.target.value } })} aria-describedby="ai-key-hint" /></label>
          <p className="field-hint" id="ai-key-hint">{settings.ai.has_key ? "Đã có API key. Nhập key mới để thay thế; để trống để giữ nguyên." : "Chưa có API key."} Key đã lưu không được hiển thị lại.</p>
          {settings.ai.has_key && <label className="check-label"><input type="checkbox" checked={settings.ai.clear_key} onChange={event => setSettings({ ...settings, ai: { ...settings.ai, clear_key: event.target.checked, api_key: "" } })} />Xóa API key hiện tại</label>}
          <label>Model<input name="ai_model" maxLength={150} value={settings.ai.model} placeholder="Tên model do nhà cung cấp API cấp" onChange={event => setSettings({ ...settings, ai: { ...settings.ai, model: event.target.value } })} /></label>
        </fieldset>
        <div className="actions"><button className="button">{busy && <LoadingIndicator inline />}Lưu cài đặt</button></div>
      </fieldset>
    </form>
  </section>;
}
