"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAccount } from "@/lib/account-client";
import type { Teacher } from "@/lib/auth";
import { useUI, useUnsavedChanges } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { MediaField } from "./media-field";
import { FieldLabel } from "./field-label";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_PATTERN, PASSWORD_HELP } from "@/lib/password-policy";

export function AccountProfile({ teacher }: { teacher: Teacher }) {
  const router = useRouter(); const { notify } = useUI(); const form = useRef<HTMLFormElement>(null);
  const [profile, setProfile] = useState({ full_name: teacher.full_name, email: teacher.email, avatar_path: teacher.avatar_path ?? "", changePassword: false, currentPassword: "", password: "", confirm: "" });
  const [baseline, setBaseline] = useState(JSON.stringify(profile)); const [busy, setBusy] = useState(false);
  async function save() {
    if (form.current?.querySelector('.media-field[aria-busy="true"]')) { void notify("Hãy chờ ảnh đại diện tải lên hoàn tất trước khi lưu."); return false; }
    if (!form.current?.reportValidity()) return false;
    if (profile.changePassword && profile.password !== profile.confirm) { void notify("Mật khẩu mới và phần nhập lại chưa khớp. Hãy kiểm tra lại."); return false; }
    setBusy(true);
    try {
      await saveAccount({ action: "profile", full_name: profile.full_name, email: profile.email, avatar_path: profile.avatar_path, changePassword: profile.changePassword, ...(profile.changePassword ? { currentPassword: profile.currentPassword, password: profile.password } : {}) });
      const next = { ...profile, changePassword: false, currentPassword: "", password: "", confirm: "" }; setProfile(next); setBaseline(JSON.stringify(next)); router.refresh(); return true;
    } catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được thông tin tài khoản."); return false; }
    finally { setBusy(false); }
  }
  useUnsavedChanges(JSON.stringify(profile) !== baseline, save, () => setProfile(JSON.parse(baseline)), busy);
  return <section className="panel account-profile"><h2>Thông tin cá nhân</h2>
    <form ref={form} className="form-grid" onSubmit={async event => { event.preventDefault(); const passwordChanged = profile.changePassword; if (await save()) void notify(passwordChanged ? "Đã lưu thông tin và đổi mật khẩu. Các phiên đăng nhập cũ đã được kết thúc." : "Đã cập nhật thông tin cá nhân.", "Đã lưu tài khoản"); }}>
      <fieldset disabled={busy} className="editor-fieldset form-grid">
        <label>Tên đăng nhập<input value={teacher.username} readOnly autoComplete="username" /></label>
        <label>Họ và tên<input name="full_name" value={profile.full_name} maxLength={100} autoComplete="name" onChange={event => setProfile({ ...profile, full_name: event.target.value })} /></label>
        <label>Email<input name="email" type="email" value={profile.email} maxLength={254} autoComplete="email" onChange={event => setProfile({ ...profile, email: event.target.value })} /></label>
        <div className="avatar-field"><MediaField label="Ảnh đại diện" kind="image" value={profile.avatar_path} onChange={value => setProfile(previous => ({ ...previous, avatar_path: value }))} /></div>
        <p className="muted">Vai trò: {teacher.role === "admin" ? "Quản trị viên" : "Giáo viên"}</p>
        <label className="choice password-toggle"><input type="checkbox" checked={profile.changePassword} onChange={event => setProfile({ ...profile, changePassword: event.target.checked, currentPassword: "", password: "", confirm: "" })} />Đổi mật khẩu</label>
        {profile.changePassword && <div className="password-fields form-grid"><label><FieldLabel required>Mật khẩu hiện tại</FieldLabel><input type="password" required maxLength={200} autoComplete="current-password" value={profile.currentPassword} onChange={event => setProfile({ ...profile, currentPassword: event.target.value })} /></label><div className="form-row"><label><FieldLabel required>Mật khẩu mới</FieldLabel><input type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} pattern={PASSWORD_PATTERN} title={PASSWORD_HELP} aria-describedby="profile-password-help" autoComplete="new-password" value={profile.password} onChange={event => setProfile({ ...profile, password: event.target.value })} /></label><label><FieldLabel required>Nhập lại mật khẩu mới</FieldLabel><input type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} pattern={PASSWORD_PATTERN} title={PASSWORD_HELP} aria-describedby="profile-password-help" autoComplete="new-password" value={profile.confirm} onChange={event => setProfile({ ...profile, confirm: event.target.value })} /></label></div><p id="profile-password-help" className="muted form-hint">{PASSWORD_HELP}</p></div>}
        <div className="actions"><button className="button">{busy && <LoadingIndicator inline />}Lưu thông tin cá nhân</button></div>
      </fieldset>
    </form>
  </section>;
}
