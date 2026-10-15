type ListeningIconName = "headphones" | "book" | "type" | "speed" | "voice" | "replay" | "tip" | "heart" | "pencil" | "volume" | "clock" | "sprout" | "arrow-right" | "search" | "check" | "calendar" | "quiz" | "trophy" | "download" | "upload" | "trash" | "info" | "star" | "lock" | "person" | "palette" | "image" | "rabbit" | "chart" | "eraser" | "maximize" | "minimize";

export function ListeningIcon({ name }: { name: ListeningIconName }) {
  return (
    <svg className={`listening-icon listening-icon-${name}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "headphones" && <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="5" height="9" rx="2" /><rect x="16" y="12" width="5" height="9" rx="2" /></>}
      {name === "book" && <><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z" /><path d="M12 5v15M5 8h4M5 12h4M15 8h4M15 12h4" /></>}
      {name === "type" && <><path d="M2 5h12M8 5v15M4 20h8M15 11h7M18.5 11v9M16 20h5" strokeWidth="2.5" /></>}
      {name === "speed" && <><path d="M4.4 19a9 9 0 1 1 15.2 0Z" /><path d="m12 13 4-5M5 12h1M8 6l.5 1M18 12h1" /><circle cx="12" cy="13" r="1.5" /></>}
      {name === "voice" && <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6" /></>}
      {name === "replay" && <><path d="M4 9a8 8 0 1 1 0 6M4 3v6h6" /><path d="m11 9 4 3-4 3Z" fill="currentColor" stroke="none" /></>}
      {name === "tip" && <><path d="M9 17c0-3-3-3-3-7a6 6 0 1 1 12 0c0 4-3 4-3 7M9 17h6M9 20h6M11 23h2M12 1v1M2 10h1M21 10h1" /></>}
      {name === "heart" && <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />}
      {name === "pencil" && <><path d="m15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6M3 15l6 6" /><path d="m3 21 5-1-4-4-1 5Z" fill="currentColor" stroke="none" /></>}
      {name === "volume" && <><path d="M4 9h4l5-5v16l-5-5H4V9Z" fill="currentColor" /><path d="M17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14" /></>}
      {name === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
      {name === "sprout" && <><path d="M12 21v-9M12 13C5 13 3 9 3 4c7 0 9 4 9 9ZM12 16c0-7 3-11 9-11 0 7-3 11-9 11Z" fill="currentColor" /><path d="M8 21h8" /></>}
      {name === "arrow-right" && <path d="M4 12h16m-6-6 6 6-6 6" strokeWidth="2.5" />}
      {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" strokeWidth="2.5" /></>}
      {name === "check" && <path d="m5 12 4 4L19 6" strokeWidth="3" />}
      {name === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6M17 2v6M3 10h18M7 14h1M12 14h1M17 14h1M7 18h1M12 18h1" /></>}
      {name === "quiz" && <><rect x="4" y="3" width="15" height="18" rx="3" /><path d="M8 8h7M8 12h5M8 16h3" /><path d="m18 13 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z" fill="#ffd25e" stroke="#ffd25e" /></>}
      {name === "trophy" && <><path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" fill="currentColor" /><path d="M7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 13v6M8 21h8M9 19h6" /></>}
      {name === "download" && <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" strokeWidth="2.5" /></>}
      {name === "upload" && <><path d="M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5" strokeWidth="2.5" /></>}
      {name === "trash" && <><path d="M3 6h18M9 3h6M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>}
      {name === "eraser" && <><path d="m14 3 7 7a2 2 0 0 1 0 3l-8 8H7l-5-5a2 2 0 0 1 0-3L12 3a1.5 1.5 0 0 1 2 0ZM7 8l9 9M13 21h9" /></>}
      {name === "maximize" && <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />}
      {name === "minimize" && <path d="M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5" />}
      {name === "info" && <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" strokeWidth="2.5" /></>}
      {name === "star" && <path d="m12 2 3 6 7 .9-5 4.9 1.2 7L12 17.5l-6.2 3.3 1.2-7-5-4.9L9 8Z" fill="currentColor" />}
      {name === "lock" && <><rect x="5" y="10" width="14" height="12" rx="3" fill="currentColor" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /><path d="M12 15v3" stroke="white" strokeWidth="2.5" /></>}
      {name === "person" && <><circle cx="12" cy="7" r="4" fill="currentColor" /><path d="M4 22v-3a8 8 0 0 1 16 0v3Z" fill="currentColor" /></>}
      {name === "palette" && <><path d="M12 3a9 9 0 1 0 0 18h1a2.5 2.5 0 0 0 0-5h-1a2 2 0 0 1 0-4h2a7 7 0 0 0 7-3c0-3-4-6-9-6Z" fill="#ffe285" /><circle cx="7" cy="8" r="1.3" fill="#f47473" stroke="none" /><circle cx="12" cy="6" r="1.3" fill="#76bc6e" stroke="none" /><circle cx="17" cy="8" r="1.3" fill="#70bdf0" stroke="none" /><circle cx="6" cy="13" r="1.3" fill="#ad81dc" stroke="none" /></>}
      {name === "image" && <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /><path d="m4 18 5-6 4 4 3-4 5 6" /></>}
      {name === "rabbit" && <><path d="M7 11C3-1 9-1 10 10h4c1-11 7-11 3 1 6 7 1 12-5 12S1 18 7 11Z" fill="#fffdf6" strokeWidth="1.2" /><path d="M9 15h.01M15 15h.01M11 18h2m-1 0v2" strokeWidth="1.6" /></>}
      {name === "chart" && <><path d="M3 21h19" /><rect x="4" y="11" width="4" height="9" rx="1" fill="#67af6e" stroke="none" /><rect x="10" y="4" width="4" height="16" rx="1" fill="#efb43d" stroke="none" /><rect x="16" y="8" width="4" height="12" rx="1" fill="#6ec0de" stroke="none" /></>}
    </svg>
  );
}
