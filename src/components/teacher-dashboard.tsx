"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import type { Teacher } from "@/lib/auth";
import { adminTitles, type AdminView } from "@/lib/admin-sections";
import { AccountProfile } from "./account-profile";
import { UserEditor, UserList } from "./user-management";
import { ThemeEditor, type ThemeRecord } from "./theme-editor";
import { StoryEditor } from "./story-editor";
import { AIDraftForm } from "./ai-draft-form";
import { EmptyTableRow, Pagination, RowMenu, usePagination } from "./management-controls";
import { useUI } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { FieldLabel } from "./field-label";
import { WebsiteSettings } from "./site-settings";
import { ThemeIcon } from "./theme-icon";
type StoryRecord = { slug: string; title_vi: string; review_status: string; is_visible: boolean; author_id: string | null; author_name: string; theme_slug: string | null; theme_name: string };
async function api(action: string, body: unknown) { const response = await fetch(`/api/teacher/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw Error(result.error); return result; }

export function TeacherDashboard({ teacher, view = "truyen", editSlug = "", editId = "" }: { teacher: Teacher | null; view?: AdminView; editSlug?: string; editId?: string }) {
  const { notify, confirm } = useUI(); const ready = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [catalogReady, setCatalogReady] = useState(false); const [failed, setFailed] = useState(false);
  const [stories, setStories] = useState<StoryRecord[]>([]); const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [filters, setFilters] = useState({ author: "", status: "", name: "", theme: "" });
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const filtered = stories.filter(story => (!filters.author || (story.author_id || "catalog") === filters.author) && (!filters.status || story.review_status === filters.status) && (!filters.theme || story.theme_slug === filters.theme) && normalize(story.title_vi).includes(normalize(filters.name.trim())));
  const storyPaging = usePagination(filtered); const themePaging = usePagination(themes);
  const changeFilter = (key: keyof typeof filters, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); storyPaging.setPage(1); };
  const authors = Array.from(new Map(stories.map(story => [story.author_id || "catalog", story.author_name])).entries());
  useEffect(() => { if (!teacher || ["tai-khoan", "nguoi-dung", "bien-tap-nguoi-dung", "cai-dat"].includes(view)) return; const controller = new AbortController(); fetch("/api/teacher/content", { signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw Error(result.error); setStories(result.stories); setThemes(result.themes); setCatalogReady(true); }).catch(error => { if (error.name !== "AbortError") { setFailed(true); void notify(error.message); } }); return () => controller.abort(); }, [teacher, view, notify]);
  async function action(name: string, data: unknown, success?: string) {
    setBusy(true);
    try { await api(name, data); const response = await fetch("/api/teacher/content"); const result = await response.json(); if (!response.ok) throw Error(result.error); setStories(result.stories); setThemes(result.themes); router.refresh(); if (success) void notify(success); }
    catch (error) { void notify(error instanceof Error ? error.message : "Chưa thực hiện được thao tác."); }
    finally { setBusy(false); }
  }
  async function toggleVisibility(story: StoryRecord, visible: boolean) {
    setBusy(true);
    setStories(previous => previous.map(item => item.slug === story.slug ? { ...item, is_visible: visible } : item));
    try { await api("visibility", { slug: story.slug, is_visible: visible }); router.refresh(); }
    catch (error) {
      setStories(previous => previous.map(item => item.slug === story.slug ? { ...item, is_visible: story.is_visible } : item));
      void notify(error instanceof Error ? error.message : "Chưa thay đổi được hiển thị truyện.");
    }
    finally { setBusy(false); }
  }
  async function deleteTheme(theme: ThemeRecord) {
    const warning = (count: number) => count > 0
      ? `Chủ đề “${theme.name_vi}” đang được dùng cho ${count} truyện. Nếu xóa, các truyện được giữ nguyên và chuyển về “Chưa phân chủ đề”. Bạn muốn tiếp tục?`
      : `Xóa chủ đề “${theme.name_vi}”?`;
    let confirmedUsed = (theme.story_count ?? 0) > 0;
    if (!await confirm(warning(theme.story_count ?? 0), "Xóa chủ đề")) return;
    setBusy(true);
    try {
      const remove = async () => {
        const response = await fetch("/api/teacher/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: theme.slug, mode: "delete", confirm_used: confirmedUsed }) });
        return { response, result: await response.json() };
      };
      let outcome = await remove();
      if (outcome.response.status === 409 && outcome.result.needs_confirmation) {
        if (!await confirm(warning(outcome.result.story_count), "Xóa chủ đề")) return;
        confirmedUsed = true; outcome = await remove();
      }
      if (!outcome.response.ok) throw Error(outcome.result.error);
      const response = await fetch("/api/teacher/content"); const catalog = await response.json();
      if (!response.ok) throw Error(catalog.error);
      setStories(catalog.stories); setThemes(catalog.themes);
      setFilters(previous => previous.theme === theme.slug ? { ...previous, theme: "" } : previous);
      router.refresh(); void notify("Đã xóa chủ đề. Các truyện liên quan vẫn được giữ nguyên.");
    } catch (error) { void notify(error instanceof Error ? error.message : "Chưa xóa được chủ đề."); }
    finally { setBusy(false); }
  }
  if (!teacher) return <section className="panel reading-width login-panel"><h1>Đăng nhập</h1><p>Dùng tài khoản do quản trị viên cấp.</p><form className="form-grid" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); try { await api("login", { username: form.get("username"), password: form.get("password") }); location.reload(); } catch (error) { void notify(error instanceof Error ? error.message : "Chưa đăng nhập được."); setBusy(false); } }}><label><FieldLabel required>Tên đăng nhập</FieldLabel><input name="username" disabled={!ready || busy} required autoComplete="username" maxLength={40} /></label><label><FieldLabel required>Mật khẩu</FieldLabel><input name="password" type="password" disabled={!ready || busy} required autoComplete="current-password" maxLength={200} /></label><button className="button" disabled={!ready || busy}>{(!ready || busy) && <LoadingIndicator inline />}Đăng nhập</button></form></section>;
  const parent = view === "bien-tap" || view === "ai" ? "truyen" : view === "bien-tap-chu-de" ? "chu-de" : view === "bien-tap-nguoi-dung" ? "nguoi-dung" : null;
  const title = view === "bien-tap" ? (editSlug ? "Sửa truyện" : "Tạo truyện mới") : view === "bien-tap-chu-de" ? (editSlug ? "Sửa chủ đề" : "Tạo chủ đề mới") : view === "bien-tap-nguoi-dung" ? (editId ? "Sửa người dùng" : "Tạo người dùng mới") : adminTitles[view];
  const needsCatalog = !["tai-khoan", "nguoi-dung", "bien-tap-nguoi-dung", "cai-dat"].includes(view);
  const isFormPage = ["tai-khoan", "bien-tap", "bien-tap-chu-de", "bien-tap-nguoi-dung", "cai-dat", "ai"].includes(view);
  return <div className={isFormPage ? "management-form-page" : undefined}><h1>{title}</h1><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link><span aria-hidden="true">/</span><Link href="/admin/truyen">Quản lý</Link><span aria-hidden="true">/</span>{parent && <><Link href={`/admin/${parent}`}>{adminTitles[parent]}</Link><span aria-hidden="true">/</span></>}<span aria-current="page">{title}</span></nav>
    {needsCatalog && !catalogReady ? failed ? <p>Chưa tải được dữ liệu. Hãy tải lại trang để thử lại.</p> : <LoadingIndicator /> : <>
      {view === "tai-khoan" && <AccountProfile teacher={teacher} />}{view === "nguoi-dung" && teacher.role === "admin" && <UserList teacher={teacher} />}{view === "bien-tap-nguoi-dung" && teacher.role === "admin" && <UserEditor teacher={teacher} editId={editId} />}
      {view === "cai-dat" && teacher.role === "admin" && <WebsiteSettings />}
      {view === "bien-tap-chu-de" && teacher.role === "admin" && <ThemeEditor themes={themes} catalogReady={catalogReady} editSlug={editSlug} />}
      {view === "bien-tap" && <StoryEditor teacher={teacher} themes={themes} editSlug={editSlug} />}{view === "ai" && <AIDraftForm themes={themes} />}
      {view === "truyen" && <section className="panel"><div className="management-heading"><h2>Danh sách truyện</h2><div className="management-heading-actions"><Link className="button" href="/admin/bien-tap">Tạo truyện mới</Link><Link className="button secondary" href="/admin/ai">Tạo truyện bằng AI</Link></div></div><p>Bản lưu luôn trở về nháp để được rà soát lại. Chỉ truyện đã xuất bản và bật hiển thị mới xuất hiện trong thư viện. Bỏ chọn “Hiển thị” không thay đổi trạng thái duyệt.</p>
        <div className="story-management-filters"><label>Tên truyện<input type="search" value={filters.name} onChange={event => changeFilter("name", event.target.value)} placeholder="Tìm tên truyện" /></label><label>Trạng thái<select aria-label="Trạng thái" value={filters.status} onChange={event => changeFilter("status", event.target.value)}><option value="">Tất cả trạng thái</option><option value="draft">Nháp</option><option value="pending">Chờ duyệt</option><option value="published">Đã xuất bản</option></select></label><label>Chủ đề<select aria-label="Chủ đề" value={filters.theme} onChange={event => changeFilter("theme", event.target.value)}><option value="">Tất cả chủ đề</option>{themes.map(theme => <option value={theme.slug} key={theme.slug}>{theme.name_vi}</option>)}</select></label>{teacher.role === "admin" && <label>Tác giả<select aria-label="Tác giả" value={filters.author} onChange={event => changeFilter("author", event.target.value)}><option value="">Tất cả tác giả</option>{authors.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>}</div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Danh sách học liệu">
          <table className="data-table stories-table management-table">
            <colgroup><col /><col /><col /><col className="visibility-column" /><col className="actions-column" /></colgroup>
            <caption>Danh sách truyện ({filtered.length})</caption>
            <thead><tr><th scope="col">Tên truyện</th><th scope="col">Tác giả</th><th scope="col">Trạng thái</th><th scope="col" className="visibility-column">Hiển thị</th><th scope="col" className="actions-column">Thao tác</th></tr></thead>
            <tbody>{storyPaging.rows.map(story => <tr key={story.slug}>
              <th scope="row">{story.title_vi}<small className="muted">{story.slug}</small></th>
              <td>{story.author_name}</td>
              <td><span className={`status-badge ${story.review_status}`}>{({ draft: "Nháp", pending: "Chờ duyệt", published: "Đã xuất bản" } as Record<string, string>)[story.review_status]}</span></td>
              <td className="visibility-column"><input type="checkbox" checked={story.is_visible} disabled={busy || !ready} aria-label={`Hiển thị truyện ${story.title_vi}`} onChange={event => void toggleVisibility(story, event.target.checked)} /></td>
              <td className="actions-column"><RowMenu label={story.title_vi}>
                <Link className="button secondary" href={`/admin/xem-thu/${story.slug}`}>Đọc thử</Link>
                <Link className="button secondary" href={`/admin/bien-tap?slug=${encodeURIComponent(story.slug)}`}>Sửa</Link>
                {teacher.role === "teacher" && story.review_status !== "published" && <button className="button secondary" disabled={busy} onClick={async () => {
                  const withdraw = story.review_status === "pending";
                  if (withdraw && !await confirm("Rút yêu cầu duyệt và đưa truyện về bản nháp? Nội dung đã lưu sẽ được giữ nguyên.", "Rút yêu cầu duyệt")) return;
                  await action("status", { slug: story.slug, status: withdraw ? "draft" : "pending", expected_status: story.review_status }, withdraw ? "Đã rút yêu cầu duyệt. Truyện đã trở về bản nháp." : "Đã gửi duyệt.");
                }}>{story.review_status === "pending" ? "Rút yêu cầu duyệt" : "Gửi duyệt"}</button>}
                {teacher.role === "admin" && <button className="button" disabled={busy} onClick={async () => {
                  const remove = story.review_status === "published";
                  if (await confirm(remove ? "Gỡ truyện khỏi thư viện và đưa về bản nháp? Nội dung đã lưu sẽ được giữ nguyên." : "Xuất bản truyện sau khi đã rà soát nội dung, bản dịch, đáp án và quyền sử dụng?", remove ? "Gỡ xuất bản" : "Xuất bản"))
                    await action("status", { slug: story.slug, status: remove ? "draft" : "published", reviewed: !remove, expected_status: story.review_status }, remove ? "Đã gỡ xuất bản. Truyện đã trở về bản nháp." : "Đã xuất bản.");
                }}>{story.review_status === "published" ? "Gỡ xuất bản" : "Duyệt và xuất bản"}</button>}
                <button className="button secondary" disabled={busy} onClick={async () => { if (await confirm("Truyện cùng toàn bộ câu, từ vựng và câu hỏi sẽ được xóa. Bạn muốn tiếp tục?", "Xóa truyện")) await action("delete", { slug: story.slug }); }}>Xóa truyện</button>
              </RowMenu></td>
            </tr>)}{!filtered.length && <EmptyTableRow columns={5}>{stories.length ? "Không tìm thấy truyện phù hợp với bộ lọc." : "Chưa có truyện. Hãy tạo bản nháp đầu tiên."}</EmptyTableRow>}</tbody>
          </table>
        </div><Pagination {...storyPaging} />
      </section>}
{view === "chu-de" && teacher.role === "admin" && <section className="panel"><div className="management-heading"><h2>Danh sách chủ đề</h2><Link className="button" href="/admin/bien-tap-chu-de">Tạo chủ đề mới</Link></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Danh sách chủ đề"><table className="data-table management-table"><thead><tr><th scope="col">Tên tiếng Việt</th><th scope="col">English</th><th scope="col">Mã chủ đề</th><th scope="col" className="actions-column">Thao tác</th></tr></thead><tbody>{themePaging.rows.map(theme => <tr key={theme.slug}><th scope="row"><span className="theme-name-cell"><ThemeIcon path={theme.icon_path} />{theme.name_vi}</span></th><td>{theme.name_en}</td><td>{theme.slug}</td><td className="actions-column"><RowMenu label={theme.name_vi}><Link className="button secondary" href={`/admin/bien-tap-chu-de?slug=${encodeURIComponent(theme.slug)}`}>Sửa</Link><button type="button" className="button secondary" disabled={busy} onClick={() => void deleteTheme(theme)}>Xóa</button></RowMenu></td></tr>)}{!themes.length && <EmptyTableRow columns={4}>Chưa có chủ đề. Hãy tạo chủ đề đầu tiên.</EmptyTableRow>}</tbody></table></div><Pagination {...themePaging} /></section>}
    </>}
  </div>;
}
