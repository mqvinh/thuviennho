"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingIndicator } from "./loading-indicator";

type Choice = "confirm" | "discard" | "cancel";
type ModalOptions = { title?: string; message: string; confirmLabel?: string; discardLabel?: string; cancelLabel?: string };
type ModalRequest = ModalOptions & { resolve: (choice: Choice) => void };
type Guard = { dirty: boolean; save: () => Promise<boolean>; discard: () => void; busy?: boolean };
type UI = { notify: (message: string, title?: string) => Promise<void>; confirm: (message: string, confirmLabel?: string) => Promise<boolean>; leave: (action: () => void | Promise<void>) => Promise<void>; register: (id: string, guard: Guard) => () => void };
const UIContext = createContext<UI | null>(null);
export function useUI() { const context = useContext(UIContext); if (!context) throw Error("UIProvider is required"); return context; }

export function UIProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState<ModalRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const queue = useRef<ModalRequest[]>([]);
  const current = useRef<ModalRequest | null>(null);
  const guards = useRef(new Map<string, Guard>());
  const asking = useRef(false);
  const titleId = useId(); const messageId = useId();
  const show = useCallback((options: ModalOptions) => new Promise<Choice>(resolve => {
    const request = { ...options, resolve };
    if (current.current) queue.current.push(request);
    else { current.current = request; setActive(request); }
  }), []);
  const finish = useCallback((choice: Choice) => {
    if (!current.current) return;
    setClosing(true);
    setTimeout(() => {
      const completed = current.current;
      dialog.current?.close();
      current.current = queue.current.shift() ?? null;
      setClosing(false); setActive(current.current);
      completed?.resolve(choice);
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
  }, []);
  useEffect(() => { if (active && !dialog.current?.open) dialog.current?.showModal(); }, [active]);
  const notify = useCallback(async (message: string, title = "Thông báo") => { await show({ title, message, confirmLabel: "Đã hiểu" }); }, [show]);
  const confirm = useCallback(async (message: string, confirmLabel = "Tiếp tục") => (await show({ title: "Xác nhận", message, confirmLabel, cancelLabel: "Hủy" })) === "confirm", [show]);
  const register = useCallback((id: string, guard: Guard) => { guards.current.set(id, guard); return () => { guards.current.delete(id); }; }, []);
  const leave = useCallback(async (action: () => void | Promise<void>) => {
    const changed = [...guards.current.values()].filter(guard => guard.dirty);
    if (!changed.length) { await action(); return; }
    if (asking.current || changed.some(guard => guard.busy)) return;
    asking.current = true;
    try {
      const choice = await show({ title: "Bạn có thay đổi chưa lưu", message: "Lưu các thay đổi trước khi tiếp tục để giữ lại nội dung vừa chỉnh sửa.", confirmLabel: "Lưu và tiếp tục", discardLabel: "Rời trang không lưu", cancelLabel: "Ở lại" });
      if (choice === "cancel") return;
      if (choice === "confirm") {
        setSaving(true);
        for (const guard of changed) if (!await guard.save()) return;
      }
      for (const guard of changed) { guard.dirty = false; if (choice === "discard") guard.discard(); }
      await action();
    } finally { setSaving(false); asking.current = false; }
  }, [show]);
  useEffect(() => {
    const dirty = () => [...guards.current.values()].some(guard => guard.dirty);
    const click = (event: MouseEvent) => {
      if (!dirty() || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
      if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
      event.preventDefault(); event.stopPropagation();
      void leave(() => { const menu = anchor.closest<HTMLDetailsElement>("details.account-menu"); if (menu) menu.open = false; if (destination.origin === location.origin) router.push(destination.pathname + destination.search + destination.hash); else location.assign(destination.href); });
    };
    const unload = (event: BeforeUnloadEvent) => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } };
    const reload = (event: KeyboardEvent) => { if (dirty() && (event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r"))) { event.preventDefault(); void leave(() => location.reload()); } };
    type NavigationEvent = Event & { navigationType: string; canIntercept: boolean; destination: { key: string } };
    type Navigation = { addEventListener: (name: string, callback: (event: NavigationEvent) => void) => void; removeEventListener: (name: string, callback: (event: NavigationEvent) => void) => void; traverseTo: (key: string) => { committed: Promise<unknown>; finished: Promise<unknown> } };
    const navigation = (window as Window & { navigation?: Navigation }).navigation;
    let approvedKey: string | null = null;
    const traverse = (event: NavigationEvent) => {
      if (event.navigationType !== "traverse") return;
      if (event.destination.key === approvedKey) { approvedKey = null; return; }
      if (event.canIntercept && event.cancelable && dirty()) {
        event.preventDefault();
        void leave(() => {
          const key = event.destination.key; approvedKey = key;
          const result = navigation?.traverseTo(key);
          void result?.committed.catch(() => {});
          void result?.finished.catch(() => {}).finally(() => { if (approvedKey === key) approvedKey = null; });
        });
      }
    };
    document.addEventListener("click", click, true); window.addEventListener("beforeunload", unload); window.addEventListener("keydown", reload); navigation?.addEventListener("navigate", traverse);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("beforeunload", unload); window.removeEventListener("keydown", reload); navigation?.removeEventListener("navigate", traverse); };
  }, [leave, router]);
  return <UIContext.Provider value={{ notify, confirm, leave, register }}>{children}
    <dialog ref={dialog} className={`app-modal${closing ? " is-closing" : ""}`} aria-labelledby={titleId} aria-describedby={messageId} onCancel={event => { event.preventDefault(); if (!closing) finish("cancel"); }} onClick={event => { if (event.target === event.currentTarget && !closing) finish("cancel"); }}>
      {active && <><h2 id={titleId}>{active.title || "Thông báo"}</h2><p id={messageId}>{active.message}</p><div className="modal-actions">{active.cancelLabel && <button type="button" className="button secondary" onClick={() => finish("cancel")} disabled={closing}>{active.cancelLabel}</button>}{active.discardLabel && <button type="button" className="button secondary" onClick={() => finish("discard")} disabled={closing}>{active.discardLabel}</button>}<button type="button" className="button" autoFocus onClick={() => finish("confirm")} disabled={closing}>{active.confirmLabel || "Đã hiểu"}</button></div></>}
    </dialog>{saving && <div className="save-overlay"><LoadingIndicator label="Đang lưu thay đổi" /></div>}
  </UIContext.Provider>;
}

export function Feedback({ message, title }: { message?: string; title?: string }) {
  const { notify } = useUI();
  const shown = useRef("");
  useEffect(() => {
    const key = JSON.stringify([message, title]);
    if (!message) { shown.current = ""; return; }
    if (shown.current !== key) { shown.current = key; void notify(message, title); }
  }, [message, title, notify]);
  return null;
}
export function useUnsavedChanges(dirty: boolean, save: () => Promise<boolean>, discard: () => void, busy = false) {
  const { register } = useUI(); const id = useId();
  useEffect(() => register(id, { dirty, save, discard, busy }), [register, id, dirty, save, discard, busy]);
}
