import { useId, type CSSProperties } from "react";

const leaves = [
  { d: "M232 183c-13-37-8-101 10-120 18 24 18 76-10 120Z", fill: "#86BB80", origin: "232px 183px", angle: "28deg" },
  { d: "M232 175c-31-26-45-77-35-101 29 15 47 60 35 101Z", fill: "#8FBE75", origin: "232px 175px", angle: "38deg" },
  { d: "M237 182c9-30 32-56 46-57 0 27-18 47-46 57Z", fill: "#66A77D", origin: "237px 182px", angle: "-32deg" },
  { d: "M225 183c-34-11-64-43-61-61 29 2 57 28 61 61Z", fill: "#C2DC8C", origin: "225px 183px", angle: "45deg" },
  { d: "M176 185c-13-28-13-50-3-59 14 12 19 35 3 59Z", fill: "#A3CD7D", origin: "176px 185px", angle: "18deg" },
  { d: "M178 184c-25-14-37-33-32-44 22 3 34 21 32 44Z", fill: "#73AD86", origin: "178px 184px", angle: "38deg" },
  { d: "M179 185c3-24 15-41 26-42 3 23-7 36-26 42Z", fill: "#85BB82", origin: "179px 185px", angle: "-30deg" },
];

function GardenSprig() {
  return <svg viewBox="0 0 260 190" fill="none" focusable="false">
    <path d="M103 40c-8-14 6-29 21-23 10-23 43-18 47 4 17-3 26 15 16 24h-84Z" fill="#D8F1FF" />
    {leaves.map((leaf, index) => <path key={leaf.d} className="garden-leaf" d={leaf.d} fill={leaf.fill} style={{ transformOrigin: leaf.origin, "--closed-angle": leaf.angle, "--bloom-delay": `${index * 65}ms` } as CSSProperties} />)}
    <path d="M72 190c46-31 124-36 188-22v22H72Z" fill="#DCE8B5" />
    <path d="M143 190c36-18 85-19 117-11v11H143Z" fill="#B9D58E" />
    <g className="garden-flower" style={{ transformOrigin: "207px 158px", "--bloom-delay": "380ms" } as CSSProperties}>
      <g fill="#FFFEF3"><ellipse cx="207" cy="151" rx="5" ry="9" /><ellipse cx="207" cy="166" rx="5" ry="9" /><ellipse cx="199" cy="158" rx="9" ry="5" /><ellipse cx="215" cy="158" rx="9" ry="5" /></g>
      <circle cx="207" cy="158" r="4" fill="#F3C866" />
    </g>
    <g className="garden-flower" style={{ transformOrigin: "140px 175px", "--bloom-delay": "520ms" } as CSSProperties}>
      <g fill="#FFFEF3"><ellipse cx="140" cy="169" rx="4" ry="7" /><ellipse cx="140" cy="181" rx="4" ry="7" /><ellipse cx="134" cy="175" rx="7" ry="4" /><ellipse cx="146" cy="175" rx="7" ry="4" /></g>
      <circle cx="140" cy="175" r="3" fill="#F3C866" />
    </g>
  </svg>;
}

export function GardenCorners() {
  return <span className="garden-corners" aria-hidden="true">
    <span className="garden-corner garden-corner-left"><GardenSprig /></span>
    <span className="garden-corner garden-corner-right"><GardenSprig /></span>
  </span>;
}

export function BookArtwork() {
  const id = useId();
  const sky = `${id}-sky`, pages = `${id}-pages`;
  return <svg className="opening-book-art" viewBox="0 0 360 240" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={sky} x1="180" y1="25" x2="180" y2="224" gradientUnits="userSpaceOnUse"><stop stopColor="#EAF5FF" /><stop offset="1" stopColor="#F4F8EB" /></linearGradient>
      <linearGradient id={pages} x1="180" y1="122" x2="180" y2="208" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFEF8" /><stop offset="1" stopColor="#FFF1CE" /></linearGradient>
    </defs>
    <path d="M37 152C20 100 62 57 114 54c37-41 112-38 142 5 63 2 96 65 62 115-40 49-235 48-281-22Z" fill={`url(#${sky})`} />
    <g className="banner-sun"><circle cx="270" cy="66" r="25" fill="#FFDD7C" /><path d="M270 31v-6m0 82v-6m35-35h6m-82 0h6m60-25 5-5m-60 60 5-5m50 0 5 5m-60-60 5 5" stroke="#EFC465" strokeWidth="3" strokeLinecap="round" /></g>
    <path d="M63 80c-8-13 5-27 18-21 9-22 40-17 43 3 15-3 23 13 14 21H63Z" fill="white" />
    <path d="M205 100c-6-9 3-18 12-14 6-15 27-11 29 2 10-2 15 9 9 14h-50Z" fill="white" opacity=".9" />
    <ellipse cx="180" cy="215" rx="121" ry="11" fill="#D9DFBB" opacity=".5" />
    <path d="M74 212c1-29-7-52-25-72m25 57c-13-1-28-12-24-25 14-1 24 11 24 25m-6-21c2-13 13-21 24-17 0 13-12 18-24 17" fill="#B2CF9D" />
    <path d="M286 212c-2-31 6-55 25-74m-25 58c14-1 29-13 25-26-15-1-25 11-25 26m6-23c-2-13-13-21-24-17 0 13 12 19 24 17" fill="#A2C7A1" />
    <g className="book-half book-half-left">
      <path d="M180 128c-32-21-66-22-104-5v77c38-14 72-13 104 6Z" fill="#E4AF58" stroke="#AA6827" strokeWidth="3" strokeLinejoin="round" />
      <path d="M180 124c-30-20-61-22-96-9v79c35-12 66-10 96 9Z" fill={`url(#${pages})`} stroke="#BD813E" strokeWidth="3" strokeLinejoin="round" />
      <path d="M101 140c20-4 39 0 61 11m-61 9c20-4 39 0 61 11m-61 9c20-4 39 0 61 11" stroke="#DCBA78" strokeWidth="4" strokeLinecap="round" />
    </g>
    <g className="book-half book-half-right">
      <path d="M180 128c32-21 66-22 104-5v77c-38-14-72-13-104 6Z" fill="#E4AF58" stroke="#AA6827" strokeWidth="3" strokeLinejoin="round" />
      <path d="M180 124c30-20 61-22 96-9v79c-35-12-66-10-96 9Z" fill={`url(#${pages})`} stroke="#BD813E" strokeWidth="3" strokeLinejoin="round" />
      <path d="M199 151c22-11 41-15 61-11m-61 31c22-11 41-15 61-11m-61 31c22-11 41-15 61-11" stroke="#DCBA78" strokeWidth="4" strokeLinecap="round" />
      <path d="m212 120 17-8v43l-9-4-8 13v-44Z" fill="#7DB9DF" />
    </g>
    <path className="banner-star" d="m54 106 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#E7B95E" />
    <path className="banner-star banner-star-late" d="m150 33 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#E7B95E" />
    <circle cx="319" cy="117" r="4" fill="#A2C6E2" /><circle cx="114" cy="85" r="3" fill="#A2C6E2" />
  </svg>;
}
