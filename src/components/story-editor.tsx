"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Teacher } from "@/lib/auth";
import type { ContentDraft } from "@/lib/teacher-content";
import type { ThemeRecord } from "./theme-editor";
import { MediaField } from "./media-field";
import { EditorGroup, EditorItem } from "./editor-items";
import { QuestionOptions } from "./question-options";
import { FieldLabel } from "./field-label";
import { LoadingIndicator } from "./loading-indicator";
import { useUI, useUnsavedChanges } from "./ui-provider";

type Group = "sentences" | "vocabulary" | "questions";
type Keyed<T> = T & { editorKey: string };
type EditorDraft = Omit<ContentDraft, Group | "estimated_minutes"> & { estimated_minutes: number | "" } & { [K in Group]: Keyed<ContentDraft[K][number]>[] };
const sentence = () => ({ text_vi: "", text_en: "", audio_vi_path: "", audio_en_path: "" });
const word = () => ({ word_vi: "", word_en: "", meaning_vi: "", example_vi: "", pronunciation_path: "", illustration_path: "" });
const question = () => ({ question_vi: "", question_en: "", kind: "choice" as const, options: ["", "", ""], correct_option: 0, correct_order: [0, 1, 2], explanation_vi: "" });
const blank: ContentDraft = { slug: "", theme_slug: "", title_vi: "", title_en: "", summary_vi: "", summary_en: "", reading_level: 1, estimated_minutes: 5, source_note: "", license_note: "", cover_image_path: "", sentences: [sentence()], vocabulary: [], questions: [] };
const keyed = (data: ContentDraft): EditorDraft => ({ ...data, sentences: data.sentences.map(item => ({ ...item, editorKey: crypto.randomUUID() })), vocabulary: data.vocabulary.map(item => ({ ...item, editorKey: crypto.randomUUID() })), questions: data.questions.map(item => ({ ...item, editorKey: crypto.randomUUID() })) });
const content = (data: EditorDraft): ContentDraft => {
  const strip = <T extends { editorKey: string }>(items: T[]) => items.map(item => { const { editorKey, ...rest } = item; void editorKey; return rest; });
  return { ...data, estimated_minutes: data.estimated_minutes === "" ? 5 : data.estimated_minutes, sentences: strip(data.sentences), vocabulary: strip(data.vocabulary), questions: strip(data.questions) };
};
async function api(action: string, data: unknown) { const response = await fetch(`/api/teacher/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok) throw Error(result.error); return result; }

export function StoryEditor({ teacher, themes, editSlug = "" }: { teacher: Teacher; themes: ThemeRecord[]; editSlug?: string }) {
  const router = useRouter(); const { notify, confirm } = useUI();
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [baseline, setBaseline] = useState(""); const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(new Set<string>());
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let data = structuredClone(blank);
      if (editSlug) { const response = await fetch(`/api/teacher/content?slug=${encodeURIComponent(editSlug)}`, { signal: controller.signal }); data = await response.json(); if (!response.ok) throw Error((data as unknown as { error: string }).error); }
      if (controller.signal.aborted) return;
      const next = keyed(data); setDraft(next); setBaseline(JSON.stringify(content(next))); setExpanded(new Set(editSlug ? [] : [next.sentences[0].editorKey]));
    }
    load().catch(error => { if (error.name !== "AbortError") { setFailed(true); void notify(error.message); } });
    return () => controller.abort();
  }, [editSlug, notify]);
  const save = async () => {
    if (form.current?.querySelector('.media-field[aria-busy="true"]')) { void notify("Hãy chờ tệp tải lên hoàn tất trước khi lưu truyện."); return false; }
    if (!draft || !form.current?.reportValidity()) return false;
    setBusy(true);
    try { await api("save", content(draft)); setBaseline(JSON.stringify(content(draft))); return true; }
    catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được truyện."); return false; }
    finally { setBusy(false); }
  };
  useUnsavedChanges(!!draft && JSON.stringify(content(draft)) !== baseline, save, () => { if (baseline) { setDraft(keyed(JSON.parse(baseline))); setExpanded(new Set()); } }, busy);
  if (!draft) return failed ? <Link className="button secondary" href="/admin/truyen">Quay lại danh sách</Link> : <LoadingIndicator label="Đang mở biên tập truyện" />;
  const field = (key: keyof Omit<ContentDraft, Group>, label: string, multiline = false) => {
    const required = ["slug", "title_vi", "title_en"].includes(key);
    return <label><FieldLabel required={required}>{label}</FieldLabel>{multiline ? <textarea aria-label={label} value={String(draft[key])} onChange={event => setDraft(previous => previous && ({ ...previous, [key]: event.target.value }))} /> : <input required={required} maxLength={key === "slug" ? 100 : 200} pattern={key === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined} value={String(draft[key])} onChange={event => setDraft(previous => previous && ({ ...previous, [key]: event.target.value }))} />}</label>;
  };
  const update = <K extends Group>(group: K, key: string, value: Partial<EditorDraft[K][number]>) => setDraft(previous => previous && ({ ...previous, [group]: previous[group].map(item => item.editorKey === key ? { ...item, ...value } : item) }));
  const move = (group: Group, key: string, to: number) => setDraft(previous => { if (!previous) return previous; const items = [...previous[group]]; const from = items.findIndex(item => item.editorKey === key); if (from < 0 || to < 0 || to >= items.length) return previous; const [item] = items.splice(from, 1); items.splice(to, 0, item); return { ...previous, [group]: items }; });
  const add = (group: Group) => {
    const item = { ...(group === "sentences" ? sentence() : group === "vocabulary" ? word() : question()), editorKey: crypto.randomUUID() };
    setDraft(previous => previous && ({ ...previous, [group]: [...previous[group], item] })); setExpanded(previous => new Set(previous).add(item.editorKey));
    requestAnimationFrame(() => document.getElementById(`editor-${item.editorKey}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }));
  };
  const itemProps = (group: Group, key: string, index: number, title: string, subtitle: string) => ({ itemKey: key, group, index, title, subtitle, count: draft[group].length, expanded: expanded.has(key), onToggle: (open: boolean) => setExpanded(previous => { const next = new Set(previous); if (open) next.add(key); else next.delete(key); return next; }), onMove: (from: string, to: number) => move(group, from, to), onDelete: () => {
    setDraft(previous => previous && ({ ...previous, [group]: previous[group].filter(item => item.editorKey !== key) }));
    setExpanded(previous => { const next = new Set(previous); next.delete(key); return next; });
  } });
  return <form ref={form} className="story-editor" onInvalidCapture={event => {
    const item = (event.target as Element).closest<HTMLElement>(".editor-item"); if (item) { item.querySelector(".editor-item-fields")?.removeAttribute("hidden"); setExpanded(previous => new Set(previous).add(item.dataset.itemKey!)); }
  }} onSubmit={async event => {
    event.preventDefault(); const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-action") === "publish";
    if (publish && !await confirm(teacher.role === "admin" ? "Xuất bản truyện sau khi đã kiểm tra nội dung, bản dịch, đáp án và quyền sử dụng?" : "Gửi bản nháp cho quản trị viên rà soát?", teacher.role === "admin" ? "Xuất bản" : "Gửi duyệt")) return;
    if (!await save()) return;
    if (publish) { try { await api("status", { slug: draft.slug, status: teacher.role === "admin" ? "published" : "pending", reviewed: teacher.role === "admin" }); router.push("/admin/truyen"); } catch (error) { void notify("Bản nháp đã được lưu. Chưa thể xuất bản/gửi duyệt: " + (error instanceof Error ? error.message : "Hãy thử lại.")); } }
    else { router.replace(`/admin/bien-tap?slug=${encodeURIComponent(draft.slug)}&saved=1`); void notify("Đã lưu bản nháp thành công.", "Đã lưu"); }
  }}>
    <fieldset disabled={busy} className="editor-fieldset">
      <section className="panel form-grid"><div className="management-heading form-heading"><h2>Biên tập truyện</h2><Link className="button secondary" href="/admin/truyen">← Quay lại</Link></div>
        <div className="form-row">{field("slug", "Mã truyện (chữ thường, số, dấu -)")}<label>Chủ đề<select aria-label="Chủ đề" value={draft.theme_slug ?? ""} onChange={event => setDraft({ ...draft, theme_slug: event.target.value || null })}><option value="">Chưa phân chủ đề</option>{themes.map(theme => <option value={theme.slug} key={theme.slug}>{theme.name_vi}</option>)}</select></label></div>
        {field("title_vi", "Tên tiếng Việt")}{field("title_en", "Tên English")}{field("summary_vi", "Giới thiệu tiếng Việt", true)}{field("summary_en", "Giới thiệu English", true)}
        <div className="form-row"><label>Mức đọc<select aria-label="Mức đọc" value={draft.reading_level} onChange={event => setDraft({ ...draft, reading_level: Number(event.target.value) })}><option value={1}>Mức 1</option><option value={2}>Mức 2</option></select></label><label>Thời lượng (phút)<input type="number" min={1} max={60} value={draft.estimated_minutes} placeholder="Mặc định 5 phút" onChange={event => setDraft({ ...draft, estimated_minutes: event.target.value === "" ? "" : Number(event.target.value) })} /></label></div>
        {field("source_note", "Nguồn truyện và tài nguyên", true)}{field("license_note", "Quyền sử dụng", true)}
        <MediaField label="Ảnh bìa" kind="image" value={draft.cover_image_path} onChange={value => setDraft(previous => previous && ({ ...previous, cover_image_path: value }))} />
      </section>
      <EditorGroup title="Câu song ngữ" addLabel="Thêm câu" disabled={draft.sentences.length >= 80} onAdd={() => add("sentences")}>{draft.sentences.map((item, index) => <EditorItem key={item.editorKey} {...itemProps("sentences", item.editorKey, index, `Câu ${index + 1}`, item.text_vi || item.text_en)}>
        <label>Tiếng Việt<textarea value={item.text_vi} onChange={event => update("sentences", item.editorKey, { text_vi: event.target.value })} /></label><label>English<textarea value={item.text_en} onChange={event => update("sentences", item.editorKey, { text_en: event.target.value })} /></label>
        <div className="form-row"><MediaField kind="audio" label="Audio tiếng Việt" value={item.audio_vi_path} onChange={value => update("sentences", item.editorKey, { audio_vi_path: value })} /><MediaField kind="audio" label="Audio English" value={item.audio_en_path} onChange={value => update("sentences", item.editorKey, { audio_en_path: value })} /></div>
      </EditorItem>)}</EditorGroup>
      <EditorGroup title="Từ vựng" addLabel="Thêm từ" disabled={draft.vocabulary.length >= 50} onAdd={() => add("vocabulary")}>{draft.vocabulary.map((item, index) => <EditorItem key={item.editorKey} {...itemProps("vocabulary", item.editorKey, index, `Từ ${index + 1}`, item.word_vi || item.word_en)}>
        {([["word_vi", "Từ tiếng Việt"], ["word_en", "Từ English"], ["meaning_vi", "Nghĩa"], ["example_vi", "Ví dụ"]] as const).map(([key, label]) => <label key={key}>{label}<input value={item[key]} onChange={event => update("vocabulary", item.editorKey, { [key]: event.target.value })} /></label>)}
        <div className="form-row"><MediaField kind="audio" label="Phát âm" value={item.pronunciation_path} onChange={value => update("vocabulary", item.editorKey, { pronunciation_path: value })} /><MediaField kind="image" label="Hình minh họa" value={item.illustration_path} onChange={value => update("vocabulary", item.editorKey, { illustration_path: value })} /></div>
        <p className={`editor-flashcard-status${item.word_vi.trim() && item.word_en.trim() && item.pronunciation_path && item.illustration_path ? " is-ready" : ""}`}>{item.word_vi.trim() && item.word_en.trim() && item.pronunciation_path && item.illustration_path ? "✓ Đủ học liệu cho Flashcard khi truyện được xuất bản." : `Flashcard còn thiếu: ${[!item.word_vi.trim() && "từ tiếng Việt", !item.word_en.trim() && "từ tiếng Anh", !item.illustration_path && "hình minh họa", !item.pronunciation_path && "audio phát âm"].filter(Boolean).join(", ")}.`} Dùng hình rõ nghĩa và phát âm tiếng Anh cho trò chơi.</p>
      </EditorItem>)}</EditorGroup>
      <EditorGroup title="Câu hỏi" addLabel="Thêm câu hỏi" disabled={draft.questions.length >= 5} onAdd={() => add("questions")}>{draft.questions.map((item, index) => <EditorItem key={item.editorKey} {...itemProps("questions", item.editorKey, index, `Câu hỏi ${index + 1}`, item.question_vi || item.question_en)}>
        <label>Câu hỏi tiếng Việt<input value={item.question_vi} onChange={event => update("questions", item.editorKey, { question_vi: event.target.value })} /></label><label>Câu hỏi English<input value={item.question_en} onChange={event => update("questions", item.editorKey, { question_en: event.target.value })} /></label>
        <QuestionOptions question={item} onChange={value => update("questions", item.editorKey, value)} />
        <label>Giải thích<textarea value={item.explanation_vi} onChange={event => update("questions", item.editorKey, { explanation_vi: event.target.value })} /></label>
      </EditorItem>)}</EditorGroup>
      <div className="actions editor-save-actions"><button type="submit" className="button secondary">{busy && <LoadingIndicator inline label="Đang lưu" />}Lưu bản nháp</button><button type="submit" className="button" data-action="publish">{teacher.role === "admin" ? "Xuất bản" : "Gửi duyệt"}</button></div>
    </fieldset>
  </form>;
}
