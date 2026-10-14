"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccounts, saveAccount, type AccountRecord } from "@/lib/account-client";
import type { Teacher } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_PATTERN, PASSWORD_HELP } from "@/lib/password-policy";
import { EmptyTableRow, Pagination, RowMenu, usePagination } from "./management-controls";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { FieldLabel } from "./field-label";
import { MediaField } from "./media-field";

export function UserList({ teacher }: { teacher: Teacher }) {
  const { notify, confirm } = useUI();
  const [users, setUsers] = useState<AccountRecord[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const paging = usePagination(users);
  useEffect(() => { const controller = new AbortController(); getAccounts(controller.signal).then(setUsers).catch(error => { if (error.name !== "AbortError") void notify(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [notify]);
  return <section className="panel"><div className="management-heading"><h2>Quản lý người dùng</h2><Link href="/admin/bien-tap-nguoi-dung" className="button">Tạo người dùng mới</Link></div>
    {loading ? <LoadingIndicator label="Đang tải người dùng" /> : <><div className="table-scroll" tabIndex={0} role="region" aria-label="Danh sách người dùng"><table className="data-table management-table"><caption>Người dùng ({users.length})</caption><thead><tr><th scope="col">Tên đăng nhập</th><th scope="col">Họ và tên</th><th scope="col">Email</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col" className="actions-column">Thao tác</th></tr></thead><tbody>{paging.rows.map(user => <tr key={user.id}><th scope="row">{user.username}</th><td>{user.full_name || "—"}</td><td>{user.email || "—"}</td><td>{user.role === "admin" ? "Quản trị viên" : "Giáo viên"}</td><td><span className={`status-badge ${user.is_active ? "published" : "draft"}`}>{user.is_active ? "Đang hoạt động" : "Đã khóa"}</span></td><td className="actions-column"><RowMenu label={user.username}><Link className="button secondary" href={`/admin/bien-tap-nguoi-dung?id=${encodeURIComponent(user.id)}`}>Sửa người dùng</Link>{user.id === teacher.id ? <Link className="button secondary" href="/admin/tai-khoan">Thông tin cá nhân và mật khẩu</Link> : <button type="button" className="button secondary" disabled={busy} onClick={async () => {
      if (!await confirm(user.is_active ? "Khóa tài khoản này và kết thúc các phiên đăng nhập hiện tại?" : "Cho phép tài khoản này đăng nhập trở lại?", user.is_active ? "Khóa tài khoản" : "Mở tài khoản")) return;
      setBusy(true); try { await saveAccount({ action: "active", id: user.id, active: !user.is_active }); setUsers(await getAccounts()); void notify("Đã cập nhật trạng thái người dùng."); } catch (error) { void notify(error instanceof Error ? error.message : "Chưa cập nhật được người dùng."); } finally { setBusy(false); }
    }}>{user.is_active ? "Khóa tài khoản" : "Mở tài khoản"}</button>}</RowMenu></td></tr>)}{!users.length && <EmptyTableRow columns={6}>Chưa có người dùng.</EmptyTableRow>}</tbody></table></div><Pagination {...paging} /></>}
  </section>;
}
const blankUser = { username: "", full_name: "", email: "", avatar_path: "", role: "teacher" as Teacher["role"], is_active: true, password: "" };
export function UserEditor({ teacher, editId = "" }: { teacher: Teacher; editId?: string }) {
  const router = useRouter(); const { notify } = useUI(); const form = useRef<HTMLFormElement>(null);
  const [user, setUser] = useState(blankUser); const [baseline, setBaseline] = useState(JSON.stringify(blankUser)); const [loadedId, setLoadedId] = useState(""); const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editId) return; const controller = new AbortController(); getAccounts(controller.signal).then(users => { const account = users.find(item => item.id === editId); if (!account) throw Error("Không tìm thấy người dùng."); const next = { username: account.username, full_name: account.full_name, email: account.email, avatar_path: account.avatar_path ?? "", role: account.role, is_active: account.is_active, password: "" }; setUser(next); setBaseline(JSON.stringify(next)); setLoadedId(editId); }).catch(error => { if (error.name !== "AbortError") { setFailed(true); void notify(error.message); } }); return () => controller.abort(); }, [editId, notify]);
  const loaded = !editId || loadedId === editId; const own = editId === teacher.id;
  async function save() {
    if (form.current?.querySelector('.media-field[aria-busy="true"]')) { void notify("Hãy chờ ảnh đại diện tải lên hoàn tất trước khi lưu."); return false; }
    if (!loaded || !form.current?.reportValidity()) return false;
    setBusy(true);
    try { await saveAccount({ action: editId ? "update" : "create", id: editId, username: user.username, full_name: user.full_name, email: user.email, avatar_path: user.avatar_path, role: user.role, active: user.is_active, password: user.password }); const next = { ...user, password: "" }; setUser(next); setBaseline(JSON.stringify(next)); return true; }
    catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được người dùng."); return false; }
    finally { setBusy(false); }
  }
  useUnsavedChanges(loaded && JSON.stringify(user) !== baseline, save, () => setUser(JSON.parse(baseline)), busy);
  return <section className="panel"><div className="management-heading form-heading"><h2>{editId ? "Sửa người dùng" : "Tạo người dùng mới"}</h2><Link className="button secondary" href="/admin/nguoi-dung">← Quay lại</Link></div>
    {!loaded ? failed ? <p>Không thể mở thông tin người dùng này.</p> : <LoadingIndicator label="Đang tải thông tin người dùng" /> : <form ref={form} className="form-grid" onSubmit={async event => { event.preventDefault(); if (await save()) { router.push("/admin/nguoi-dung?saved=1"); router.refresh(); void notify("Đã lưu người dùng.", "Đã lưu"); } }}><fieldset disabled={busy} className="editor-fieldset form-grid">
      <label><FieldLabel required>Tên đăng nhập</FieldLabel><input name="username" required pattern="[a-z0-9_-]{3,40}" minLength={3} maxLength={40} autoComplete="off" value={user.username} onChange={event => setUser({ ...user, username: event.target.value })} /></label>
      <label><FieldLabel required={!editId}>{editId ? "Mật khẩu mới" : "Mật khẩu cấp mới"}</FieldLabel><input name="password" type="password" disabled={own} required={!editId} minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} pattern={PASSWORD_PATTERN} title={PASSWORD_HELP} aria-describedby="user-password-help" autoComplete="new-password" value={user.password} placeholder={editId ? "Để trống để giữ mật khẩu hiện tại" : "Tối thiểu 6 ký tự"} onChange={event => setUser({ ...user, password: event.target.value })} /></label>
      <p id="user-password-help" className="muted form-hint">{PASSWORD_HELP}</p>
      {own && <p className="muted">Đổi mật khẩu tại <Link href="/admin/tai-khoan">Tài khoản</Link>.</p>}
      <label>Họ và tên<input maxLength={100} autoComplete="off" value={user.full_name} onChange={event => setUser({ ...user, full_name: event.target.value })} /></label>
      <div className="form-row"><label>Email<input type="email" maxLength={254} autoComplete="off" value={user.email} onChange={event => setUser({ ...user, email: event.target.value })} /></label><label><FieldLabel required>Vai trò</FieldLabel><select required aria-label="Vai trò" disabled={own} value={user.role} onChange={event => setUser({ ...user, role: event.target.value as Teacher["role"] })}><option value="teacher">Giáo viên</option><option value="admin">Quản trị viên</option></select></label></div>
      {editId && <label>Trạng thái<select aria-label="Trạng thái" disabled={own} value={String(user.is_active)} onChange={event => setUser({ ...user, is_active: event.target.value === "true" })}><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></select></label>}
      <div className="avatar-field"><MediaField label="Ảnh đại diện" kind="image" value={user.avatar_path} onChange={value => setUser(previous => ({ ...previous, avatar_path: value }))} /></div>
      <div className="actions"><button className="button">{busy && <LoadingIndicator inline />}Lưu người dùng</button></div>
    </fieldset></form>}
  </section>;
}
