"use client";
import Link from "next/link";
import Image from "next/image";
import { MenuIcon } from "./menu-icon";
import { adminNavigation } from "@/lib/admin-sections";
import { useEffect, useRef, useState } from "react";
import type { Teacher } from "@/lib/auth";
import { useUI } from "./ui-provider";
import { LoadingIndicator } from "./loading-indicator";
import { HeaderLogin } from "./header-login";

export function AccountMenu({ teacher }: { teacher: Teacher | null }) {
  const { notify, leave } = useUI();
  const [busy, setBusy] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState("");
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  if (!teacher) return <HeaderLogin />;
  return (
    <details className="account-menu" ref={menu}>
      <summary><span className="account-avatar" aria-hidden="true">{teacher.avatar_path && failedAvatar !== teacher.avatar_path ? <Image src={teacher.avatar_path} alt="" width={36} height={36} unoptimized onError={() => setFailedAvatar(teacher.avatar_path!)} /> : (teacher.full_name || teacher.username).slice(0, 1).toUpperCase()}</span><span className="account-label">{teacher.full_name || teacher.username}</span><svg className="account-caret" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg></summary>
      <div className="account-dropdown">
        <p className="muted">{teacher.role === "admin" ? "Quản trị viên" : "Giáo viên"}</p>
        {adminNavigation.filter(item => !item.adminOnly || teacher.role === "admin").map(({ key, title }) => <Link key={key} href={`/admin/${key}`} onClick={() => { if (menu.current) menu.current.open = false; }}><MenuIcon name={key}/><span>{title}</span></Link>)}
        <button disabled={busy} onClick={() => void leave(async () => {
          setBusy(true);
          try {
            const response = await fetch("/api/teacher/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            if (!response.ok) throw Error("Chưa đăng xuất được. Hãy thử lại.");
            window.location.replace("/admin");
          } catch (error) { void notify(error instanceof Error ? error.message : "Chưa đăng xuất được."); setBusy(false); }
        })}>{busy ? <LoadingIndicator inline label="Đang đăng xuất" /> : <MenuIcon name="logout"/>}<span>Đăng xuất</span></button>
      </div>
    </details>
  );
}
