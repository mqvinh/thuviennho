import type { Landmark } from "@/lib/journey-map";

export function LandmarkArtwork({ kind, className = "" }: { kind: Landmark; className?: string }) {
  return <svg className={`journey-landmark-art ${className}`} width="160" height="130" viewBox="0 0 160 130" fill="none" aria-hidden="true">
    <ellipse cx="80" cy="113" rx="67" ry="13" fill="#91ad71" opacity=".22" />
    <path d="M19 110c23-14 99-15 122 0-14 17-101 19-122 0Z" fill="#c9de9c" />
    {kind === "tree" && <><path d="M74 102V60h13v42m-7-21L61 66m23 9 17-17" stroke="#a07a50" strokeWidth="9" strokeLinecap="round" /><path d="M39 58c-17-20 0-41 22-40 12-20 44-15 48 5 30-1 39 30 20 45-15 18-34 9-44 10-21 9-47 1-46-20Z" fill="#8eb46b" /><path d="M48 39c6-13 19-14 27-12m20-7c11 2 17 10 17 18" stroke="#bfd39a" strokeWidth="7" strokeLinecap="round" /><circle cx="55" cy="56" r="5" fill="#edbd79" /><circle cx="108" cy="53" r="5" fill="#edbd79" /></>}
    {kind === "cottage" && <><path d="M40 65h80v44H40Z" fill="#fff1ce" stroke="#bf946a" strokeWidth="2" /><path d="m28 67 52-43 52 43Z" fill="#d28c76" stroke="#b87562" strokeWidth="2" /><path d="M101 39V24h11v25" fill="#b58c75" /><path d="M69 109V79c0-15 23-15 23 0v30" fill="#b68d66" /><path d="M49 77h13v15H49Zm50 0h13v15H99Z" fill="#a1d0d7" stroke="#c0a17b" strokeWidth="2" /><path d="M48 102h16m32 0h17" stroke="#9db574" strokeWidth="5" strokeLinecap="round" /><circle cx="86" cy="91" r="2" fill="#f8deb0" /></>}
    {kind === "flowers" && <><path d="M31 109V89m98 20V89M30 98h100" stroke="#c7a778" strokeWidth="6" strokeLinecap="round" />{[49, 79, 108].map((x, i) => <g key={x}><path d={`M${x} 104V${57 + i * 5}m0 38q-20-2-19-15 17-2 19 15m0-12q17 0 18-13-16-1-18 13`} stroke="#8da965" strokeWidth="3" fill="#a6bf7f" />{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx={x} cy={43 + i * 5} rx="8" ry="13" fill={i === 1 ? "#edbd6c" : "#d99ba3"} transform={`rotate(${angle} ${x} ${55 + i * 5})`} />)}<circle cx={x} cy={55 + i * 5} r="7" fill="#fff1b7" /></g>)}</>}
    {kind === "bridge" && <><path d="M14 108c21-19 32 14 53-1s34 14 53 0 25-1 28 2" stroke="#a3d3dc" strokeWidth="11" strokeLinecap="round" /><path d="M25 97q55-58 110 0l-6 14q-49-46-98 0Z" fill="#bc9367" stroke="#9e784e" strokeWidth="2" /><path d="M26 78q54-57 108 0M28 78v20m19-35v21m23-28v20m22-20v21m24-13v22m18-8v21" stroke="#bd966a" strokeWidth="5" strokeLinecap="round" /><path d="M31 34q48-42 96 0" stroke="#dfb2a4" strokeWidth="8" strokeLinecap="round" /><path d="M38 38q41-34 82 0" stroke="#efcc8b" strokeWidth="6" strokeLinecap="round" /></>}
    {kind === "windmill" && <><path d="m61 54-8 56h54l-9-56Z" fill="#f4e4bd" stroke="#b99b70" strokeWidth="2" /><path d="m57 54 23-22 23 22Z" fill="#cc9479" /><path d="M73 110V92c0-10 15-10 15 0v18" fill="#b58e64" /><g stroke="#c0a47c" strokeWidth="3" strokeLinejoin="round"><path d="m79 57-4-41 17 2-7 39Zm2 4 41-4-2 17-39-7Zm-4 2 4 41-17-2 7-39Zm-1-3-41 4 2-17 39 7Z" fill="#fff9e5" /></g><circle cx="80" cy="61" r="6" fill="#b58c63" /></>}
    {kind === "lighthouse" && <><path d="m62 51-9 58h54l-9-58Z" fill="#fff7df" stroke="#b6a080" strokeWidth="2" /><path d="m59 73-3 14h48l-3-14Z" fill="#dbad95" /><path d="M59 51V31h42v20" fill="#9ecbd2" stroke="#aa9574" strokeWidth="3" /><path d="m54 31 26-17 26 17Zm0 21h52v7H54Z" fill="#a08f78" /><path d="M73 109V96c0-9 14-9 14 0v13" fill="#b7a17d" /><path d="m46 33-23-7m23 17-25 5m93-15 23-7m-23 17 25 5" stroke="#e4c477" strokeWidth="4" strokeLinecap="round" /><circle cx="80" cy="40" r="6" fill="#fff0ab" /></>}
    <path d="m24 111-3-9m4 9 6-7m98 7 5-9m-5 9-3-7" stroke="#8ba66a" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

export function MapIsland({ x, y, land, edge, kind }: { x: number; y: number; land: string; edge: string; kind: Landmark }) {
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cy="46" rx="162" ry="89" fill="#b5dce0" opacity=".35" />
    <path d="M-157 23c-19-45 13-66 43-80 32-16 44-3 69-18 38-22 58-8 87 0 30 7 68-6 91 30 16 24 40 31 25 66-10 30-56 45-91 43-40-3-44 21-91 7-42-13-80-8-114-20-14-6-20-18-19-28Z" fill={edge} transform="translate(0 12)" />
    <path d="M-157 23c-19-45 13-66 43-80 32-16 44-3 69-18 38-22 58-8 87 0 30 7 68-6 91 30 16 24 40 31 25 66-10 30-56 45-91 43-40-3-44 21-91 7-42-13-80-8-114-20-14-6-20-18-19-28Z" fill={land} stroke="#fff5d3" strokeWidth="10" />
    <path d="m-128-22 27-44 25 42Zm37-3 32-56 36 58Z" fill={edge} opacity=".8" /><path d="m-69-65 10-17 11 19-11-4Z" fill="#fff9e9" />
    <g transform="translate(-52 -85) scale(.68)"><LandmarkArtwork kind={kind} /></g>
    <g fill={edge}><ellipse cx="104" cy="-23" rx="11" ry="25" /><ellipse cx="122" cy="-12" rx="9" ry="21" /><ellipse cx="-117" cy="10" rx="8" ry="19" /></g>
    <path d="M104-10v18m18-8v13m-239 3v9" stroke="#ae956c" strokeWidth="4" strokeLinecap="round" />
    <g fill="#fff9df"><circle cx="-82" cy="26" r="4" /><circle cx="86" cy="17" r="4" /><circle cx="98" cy="32" r="3" /></g>
  </g>;
}

export function SeaDecorations() {
  return <>
    <path d="M65 315c160 150 276-103 430-22s205 119 306 34 201-37 335 27" stroke="#fffdf1" strokeWidth="3" strokeDasharray="6 12" fill="none" opacity=".9" />
    {[70, 320, 560, 810, 1080].map((x, index) => <g key={x} transform={`translate(${x} ${index % 2 ? 40 : 650})`} fill="none" stroke="#9ac7cc" strokeWidth="3" strokeLinecap="round"><path d="M0 0q9 9 18 0t18 0m10 9q9 9 18 0" /></g>)}
    <g transform="translate(520 325)"><path d="m0 17 44 0-9 14H10Z" fill="#b59872" /><path d="M23-17v34H3Zm4-5v36h22Z" fill="#fffcdf" /><path d="M23-25v42" stroke="#a18c6c" strokeWidth="2" /></g>
    <g transform="translate(1114 70)" stroke="#a3bdad" strokeWidth="2" fill="none"><circle r="28" /><path d="m0-23 6 23-6 23-6-23Z" fill="#fff8df" /><path d="M-21 0h42" /><text y="-36" textAnchor="middle" fill="#789c98" stroke="none" fontSize="12">N</text></g>
    <g fill="#fffdf5" opacity=".85"><path d="M59 81c-20-22 16-48 32-22 19-37 55-11 46 11 25-7 36 21 11 24H54c-13-1-11-16 5-13Z" /><path d="M810 405c-16-18 13-38 26-18 15-29 44-8 37 9 20-5 29 17 9 19h-75c-10-1-9-13 3-10Z" /></g>
  </>;
}
