import Image from "next/image";
import type { ReactNode } from "react";
const symbols = ["☂", "♧", "☀", "✦", "☁"];
function JacketArtwork({ title, fallback }: { title: string; fallback: ReactNode }) {
  const subject = title.toLocaleLowerCase("vi");
  let artwork;
  if (subject.includes("thỏ")) {
    artwork = <>
      <ellipse cx="39" cy="26" rx="9" ry="21" fill="#fffdf8" transform="rotate(-12 39 26)" />
      <ellipse cx="60" cy="26" rx="9" ry="21" fill="#fffdf8" transform="rotate(12 60 26)" />
      <ellipse cx="49" cy="60" rx="29" ry="26" fill="#fffdf8" />
      <circle cx="40" cy="56" r="2" fill="currentColor" stroke="none" /><circle cx="57" cy="56" r="2" fill="currentColor" stroke="none" />
      <path d="m46 64 3 3 3-3m-3 3v6m-7-2q7 8 14 0" /><path d="m76 66 13 9-23 14Z" fill="#f8b363" /><path d="m79 69 5-10m-4 10 12-3" />
    </>;
  } else if (subject.includes("cơm")) {
    artwork = <>
      <path d="M23 49q2-22 27-22t27 22" fill="#fffdf8" /><path d="M15 49h70q-4 33-35 33T15 49Z" fill="#fffdf8" />
      <path d="M40 83h20m-23-28 8-4m7-11 8-4m-27 5 5-5m15 22 7-3m6-43 22 30m-12-31 18 30" />
      <path d="M30 18q-5-6 0-12M47 17q-5-6 0-12" opacity=".55" />
    </>;
  } else if (subject.includes("bình nước")) {
    artwork = <>
      <rect x="39" y="9" width="23" height="12" rx="4" fill="#fffdf8" />
      <path d="M39 21v11q-12 4-12 15v30q0 13 13 13h21q13 0 13-13V47q0-11-12-15V21" fill="#fffdf8" />
      <path d="M28 55h45v23q0 11-13 11H41q-13 0-13-11Z" fill="currentColor" opacity=".18" /><path d="M51 45q-9 10-9 16a9 9 0 0 0 18 0q0-6-9-16Z" />
      <path d="m79 18 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" opacity=".55" />
    </>;
  } else if (subject.includes("cây")) {
    artwork = <>
      <path d="M50 87V35m0 30L29 48m21 5 21-20" /><path d="M49 45Q18 48 18 20q31-2 31 25Z" fill="#fffdf8" />
      <path d="M52 54q0-34 31-34 0 34-31 34Z" fill="#fffdf8" /><path d="M48 71Q20 75 16 53q27-8 32 18Z" fill="#fffdf8" />
      <path d="M35 88h31m-37-5h4m41 0h4" /><circle cx="15" cy="9" r="5" fill="currentColor" opacity=".18" /><path d="m82 65 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" opacity=".5" />
    </>;
  } else {
    return fallback;
  }
  return <svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">{artwork}</svg>;
}
export function Cover({ path, title, eager = false, shelf = false, hero = false }: {
  path: string | null;
  title: string;
  eager?: boolean;
  shelf?: boolean;
  hero?: boolean;
}) {
  const custom = path?.startsWith("/") && !path.startsWith("//") && path !== "/images/book-cover.svg";
  if (hero || (shelf && !custom)) {
    const index = Array.from(title).reduce((sum, char) => sum + char.codePointAt(0)!, 0) % symbols.length;
    return (
      <div className={`cover book-jacket${hero ? " story-cover-artwork" : ""}${hero && custom ? " has-cover-background" : ""}`} role="img" aria-label={`Bìa truyện ${title}`}>
        {hero && custom && <><Image className="story-banner-background" src={path!} alt="" fill sizes="(max-width: 800px) 100vw, 800px" loading={eager ? "eager" : "lazy"} unoptimized /><span className="story-banner-shade" aria-hidden="true" /></>}
        <span className="jacket-imprint">Little Readers</span>
        <span className="jacket-symbol" aria-hidden="true"><JacketArtwork title={title} fallback={shelf ? <span className="jacket-generic-art" /> : symbols[index]} /></span>
        <span className="jacket-title">{title}</span>
        <span className="jacket-languages">Tiếng Việt · English</span>
      </div>
    );
  }
  const source = custom ? path! : "/images/book-cover.svg";
  return (
    <div className={`cover${shelf ? " book-jacket custom-jacket" : ""}${hero ? " story-cover-image" : ""}`}>
      <Image src={source} alt={`Bìa truyện ${title}`} width={640} height={shelf ? 850 : 360} loading={eager ? "eager" : "lazy"} unoptimized />
    </div>
  );
}
