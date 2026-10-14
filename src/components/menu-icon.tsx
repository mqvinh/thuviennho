export function MenuIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    "tai-khoan": "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    "nguoi-dung": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
    truyen: "M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4z M13 6a3 3 0 0 1 3-3h5v16h-4a4 4 0 0 0-4 2",
    "chu-de": "M3 4h7l2 3h9v13H3z",
    "cai-dat": "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    ai: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
    "bien-tap": "m15 5 4 4 M4 20l4-1L21 6a2.8 2.8 0 0 0-4-4L4 15z",
    logout: "M9 21H3V3h6 M9 12h12 M17 8l4 4-4 4",
    login: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3",
  };
  return <svg className="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.truyen}/></svg>;
}
