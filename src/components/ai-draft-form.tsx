"use client";
import { useRef, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter } from "next/navigation";
import type { ThemeRecord } from "./theme-editor";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { FieldLabel } from "./field-label";
const blank = { topic: "", keywords: "", lesson: "", slug: "", theme_slug: "", noStudentData: false };
export function AIDraftForm({ themes }: { themes: ThemeRecord[] }) {
  const ready = useHydrated();
  return ready ? <AIFields themes={themes} /> : <LoadingIndicator />;
}
function AIFields({ themes }: { themes: ThemeRecord[] }) {
  const router = useRouter(); const { notify } = useUI(); const form = useRef<HTMLFormElement>(null);
  const [data, setData] = useState(() => { try { const saved = sessionStorage.getItem("little-readers-ai-form"); return saved ? { ...blank, ...JSON.parse(saved) } as typeof blank : blank; } catch { return blank; } }); const [baseline, setBaseline] = useState(JSON.stringify(data)); const [busy, setBusy] = useState(false);
  async function saveInputs() { try { sessionStorage.setItem("little-readers-ai-form", JSON.stringify(data)); setBaseline(JSON.stringify(data)); return true; } catch { void notify("Trình duyệt chưa lưu được nội dung nhập. Bạn có thể ở lại để tiếp tục."); return false; } }
  useUnsavedChanges(JSON.stringify(data) !== baseline, saveInputs, () => setData(JSON.parse(baseline)), busy);
  return <section className="panel"><h2>AI hỗ trợ bản nháp</h2><p>Chỉ nhập chủ đề và mục tiêu bài học, không nhập dữ liệu học sinh. Kết quả cần giáo viên rà soát; giới hạn 5 lượt/24 giờ.</p><form ref={form} className="form-grid" onSubmit={async event => {
    event.preventDefault(); setBusy(true);
    try { const response = await fetch("/api/teacher/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setBaseline(JSON.stringify(data)); sessionStorage.removeItem("little-readers-ai-form"); router.push(`/admin/bien-tap?slug=${encodeURIComponent(result.draft.slug)}`); }
    catch (error) { void notify(error instanceof Error ? error.message : "Chưa tạo được bản nháp."); } finally { setBusy(false); }
  }}><fieldset disabled={busy} className="editor-fieldset form-grid">{([["topic", "Chủ đề", 150], ["keywords", "Từ khóa", 300], ["lesson", "Bài học mong muốn", 300], ["slug", "Mã truyện mới", 100]] as const).map(([key, label, length]) => <label key={key}><FieldLabel required>{label}</FieldLabel><input required maxLength={length} pattern={key === "slug" ? "[a-z0-9-]+" : undefined} value={data[key]} onChange={event => setData({ ...data, [key]: event.target.value })} /></label>)}<label><FieldLabel required>Chủ đề thư viện</FieldLabel><select required aria-label="Chủ đề thư viện" value={data.theme_slug} onChange={event => setData({ ...data, theme_slug: event.target.value })}><option value="">Chọn chủ đề</option>{themes.map(theme => <option value={theme.slug} key={theme.slug}>{theme.name_vi}</option>)}</select></label><label className="choice"><input type="checkbox" required checked={data.noStudentData} onChange={event => setData({ ...data, noStudentData: event.target.checked })} /><FieldLabel required>Nội dung nhập không chứa thông tin cá nhân học sinh.</FieldLabel></label><button className="button">{busy && <LoadingIndicator inline />}Tạo bản nháp AI</button></fieldset></form></section>;
}
