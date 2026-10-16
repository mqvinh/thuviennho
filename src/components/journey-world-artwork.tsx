import { useId } from "react";

// A shared coordinate system keeps the interactive destinations on the terrain.
export const destinationPositions = [
  { x: 25, y: 34, mobileX: 30, mobileY: 21 },
  { x: 49, y: 25, mobileX: 71, mobileY: 34 },
  { x: 75, y: 32, mobileX: 29, mobileY: 47 },
  { x: 78, y: 59, mobileX: 70, mobileY: 60 },
  { x: 51, y: 67, mobileX: 30, mobileY: 73 },
  { x: 25, y: 63, mobileX: 70, mobileY: 86 },
];

function Pine({ x, y, size = 1, snow = false }: { x: number; y: number; size?: number; snow?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="5" rx="24" ry="9" fill="#205f6240" />
    <path d="M-4 0v-24h8V0" fill="#886943" />
    <path d="m0-87-26 43h11l-20 28h22l-22 15h69L13-17h21L15-44h11Z" fill={snow ? "#96bdb6" : "#327b64"} />
    <path d="m0-87-26 43h11l-20 28H0Z" fill={snow ? "#e4f2e9" : "#5caa6e"} />
    <path d="m0-71-14 25H0Zm0 31-20 22H0Z" fill={snow ? "#fcfff2" : "#86c67e"} />
  </g>;
}

function RoundTree({ x, y, size = 1, autumn = false }: { x: number; y: number; size?: number; autumn?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="5" rx="27" ry="10" fill="#387d5d30" />
    <path d="M-3 1v-38h7V1m-3-21L-15-34m16 6 16-15" stroke="#99794b" strokeWidth="5" />
    <path d="M0-92c30 0 35 25 28 35 26 29-2 49-27 38-27 13-53-10-33-32-8-22 9-41 32-41Z" fill={autumn ? "#e0a845" : "#5aa76d"} />
    <path d="M0-92c-20-1-36 18-30 39-14 20-2 32 13 35 0-27 22-36 17-74Z" fill={autumn ? "#f9cf66" : "#99cb79"} />
    <path d="M-19-65q-1-14 12-17" stroke={autumn ? "#ffe797" : "#c0df99"} strokeWidth="6" strokeLinecap="round" />
  </g>;
}

function Mountain({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="-1" rx="84" ry="20" fill="#47797a25" />
    <path d="m-90 0 82-157L98 0Z" fill="#8babb1" />
    <path d="m-90 0 82-157L3-48-10-15Z" fill="#b2cdcd" />
    <path d="m-8-157 38 57-22-6-15 22-19-17-26 28Z" fill="#fffef2" />
    <path d="m-8-157 38 57-22-6-15 22Z" fill="#dceeed" />
    <path d="m12-57 20 17L52-9M-38-28l-9 20" stroke="#6d969d" strokeWidth="4" strokeLinecap="round" />
  </g>;
}

function Cottage({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="4" rx="48" ry="14" fill="#47826030" />
    <path d="m-38-52 40-20 38 20V0L0 17-38 0Z" fill="#fff0cc" />
    <path d="m0-34 40-18V0L0 17Z" fill="#e1c99b" />
    <path d="m-49-53 28-39 34 6 38 32-43 21-29-38-18 25Z" fill="#c46955" />
    <path d="m-49-53 28-39 34 6-29 40Z" fill="#f0976c" />
    <path d="M18-75v-21l10-4v31" fill="#c48e68" />
    <path d="m-25-34 13 5v17l-13-5Zm41 3 12-6v16l-12 6Z" fill="#81c3ca" stroke="#fff8dc" strokeWidth="3" />
    <path d="M-4 14V-9q0-13-12-13v29" fill="#b28856" />
  </g>;
}

function Windmill({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <ellipse cy="3" rx="38" ry="11" fill="#7d915031" />
    <path d="m-18-76-9 76 29 10 24-12-10-76Z" fill="#ffedc7" />
    <path d="m2-71 14-7 10 76L2 10Z" fill="#d9be87" />
    <path d="m-25-77 26-25 21 25-20 9Z" fill="#be6b50" />
    <g className="journey-windmill-sails" style={{ transformOrigin: "0px -68px" }} stroke="#b58a56" strokeWidth="3" fill="#fffbe5">
      <path d="m-3-70-13-49 15-3 7 51Zm6 0 49-13 3 15-51 7Zm0 6 13 49-15 3-7-51Zm-6 0-49 13-3-15 51-7Z" />
    </g>
    <circle cy="-67" r="6" fill="#af7d49" />
  </g>;
}

function Cloud({ x, y, size = 1, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><g className="journey-art-cloud" style={{ animationDelay: `${delay}s` }}>
    <ellipse cy="25" rx="79" ry="16" fill="#328f9720" />
    <path d="M-70 14c-31-8-27-43 1-45-8-35 39-56 62-27 20-42 76-27 73 9 41-1 50 44 15 57-39 9-111 10-151 6Z" fill="#fffdf1" />
    <path d="M-79 5c40 10 118 12 171-3-13 24-138 30-171 3Z" fill="#e3f2e9" />
  </g></g>;
}

function Bridge({ x, y, angle = -20 }: { x: number; y: number; angle?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle})`}>
    <path d="M-51 9q51-37 102 0v13q-51-32-102 0Z" fill="#8c7048" />
    <path d="M-51 0q51-37 102 0v12q-51-32-102 0Z" fill="#e6c28a" />
    {[-44, -29, -14, 1, 16, 31, 46].map(x => <path key={x} d={`M${x} ${-11 + x * x / 180}v13`} stroke="#b88f5c" strokeWidth="3" />)}
    <path d="M-54-13q54-39 108 0M-51-13V6m22-29V-6M0-30v18m29-11v17m22-7V6" stroke="#bd9158" strokeWidth="5" strokeLinecap="round" />
  </g>;
}

const coast = "M160 357 184 287 257 260 286 204 382 186 422 213 496 177 581 193 645 153 726 173 770 216 854 211 932 253 964 314 1019 355 1048 424 1011 483 1040 526 978 588 892 598 828 643 736 623 669 668 581 646 510 680 434 642 359 650 313 613 234 609 203 556 151 521 174 456 146 414Z";
const portraitCoast = "M101 191 170 152 222 164 272 125 352 148 414 187 490 194 516 262 490 327 520 393 488 454 510 530 483 590 509 656 478 718 499 789 474 851 497 921 459 1014 367 1046 300 1026 225 1052 156 1020 107 970 122 894 90 836 116 773 88 705 113 641 88 574 110 503 88 443 112 380 83 312 108 253Z";

export function AdventureTerrain({ portrait = false, showRoute = true }: { portrait?: boolean; showRoute?: boolean }) {
  const uid = useId().replace(/:/g, ""), id = (name: string) => `${uid}-${name}`;
  const shape = portrait ? portraitCoast : coast;
  return <svg className={`journey-terrain-art ${portrait ? "is-portrait" : "is-landscape"}`} width={portrait ? 600 : 1200} height={portrait ? 1120 : 820} viewBox={portrait ? "0 0 600 1120" : "0 0 1200 820"} preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id("sea")} x2=".8" y2="1"><stop stopColor="#c8eddf" /><stop offset=".42" stopColor="#84d5d3" /><stop offset="1" stopColor="#56bfc9" /></linearGradient>
      <linearGradient id={id("grass")} x2=".7" y2="1"><stop stopColor="#c4dc8c" /><stop offset=".5" stopColor="#a3cb76" /><stop offset="1" stopColor="#77b578" /></linearGradient>
      <linearGradient id={id("cliff")} x2="0" y2="1"><stop stopColor="#cfbb84" /><stop offset="1" stopColor="#a28e6a" /></linearGradient>
      <linearGradient id={id("river")} x2="1" y2="1"><stop stopColor="#bce9e8" /><stop offset=".5" stopColor="#5cbfc9" /><stop offset="1" stopColor="#89d9d7" /></linearGradient>
      <clipPath id={id("land")}><path d={shape} /></clipPath>
      <pattern id={id("waves")} width="160" height="120" patternUnits="userSpaceOnUse"><path d="M13 30q10 7 20 0m48 59q14 8 28 0" stroke="#e3fff1" strokeWidth="3" strokeLinecap="round" opacity=".4" /></pattern>
    </defs>
    <path d={portrait ? "M0 0h600v1120H0Z" : "M0 0h1200v820H0Z"} fill={`url(#${id("sea")})`} />
    <path d={portrait ? "M0 0h600v1120H0Z" : "M0 0h1200v820H0Z"} fill={`url(#${id("waves")})`} />
    <path d={shape} transform="translate(0 45)" fill="#2c9da7" stroke="#b5ebe1" strokeWidth="67" strokeLinejoin="round" opacity=".36" />
    <path d={shape} transform="translate(0 37)" fill={`url(#${id("cliff")})`} stroke="#9c946e" strokeWidth="3" strokeLinejoin="round" />
    <path d={shape} fill={`url(#${id("grass")})`} stroke="#f9e9b2" strokeWidth="14" strokeLinejoin="round" />
    {portrait ? <>
      <g stroke="#8f8863" strokeWidth="3" opacity=".5"><path d="M108 970v32m48 18v25m69 7v23m142-29v25m92-57v27m38-120v27m-14-351v28M92 705v28m18-230v26" /></g>
      <g clipPath={`url(#${id("land")})`}>
        <path d="M42 138h500v260q-149-103-278-32T42 402Z" fill="#dbe5c4" />
        <path d="M37 478q204-132 497 28v199q-131-97-255 0T37 720Z" fill="#dfd18b" />
        <path d="M35 802q229-81 499 43v257H35Z" fill="#c1c99a" />
        <path d="M348 218c-107 53 19 111-55 176s69 124 9 195 53 121 1 187 21 149-64 280" stroke="#ebedb9" strokeWidth="57" />
        <path d="M348 218c-107 53 19 111-55 176s69 124 9 195 53 121 1 187 21 149-64 280" stroke={`url(#${id("river")})`} strokeWidth="40" />
        <path className="journey-river-glint" d="M323 260q-29 36-9 65m-14 94q25 38 24 67m-25 131q23 27 18 54m-33 152q20 51-4 88" stroke="#e1fff2" strokeWidth="4" strokeLinecap="round" />
        {showRoute && <path d="M180 261Q310 257 426 407T174 553T420 698T180 844T420 984" stroke="#fff2bd" strokeWidth="10" strokeLinecap="round" strokeDasharray="3 20" />}
      </g>
      <Mountain x={328} y={255} size={.68} /><Mountain x={404} y={281} size={.86} /><Mountain x={468} y={304} size={.62} />
      <Pine x={130} y={269} size={.6} snow /><Pine x={169} y={232} size={.5} snow /><Pine x={464} y={338} size={.5} snow />
      <RoundTree x={132} y={398} size={.62} /><RoundTree x={159} y={430} size={.8} /><Pine x={120} y={480} size={.6} />
      <Cottage x={440} y={494} size={.65} /><Cottage x={390} y={463} size={.45} />
      <Bridge x={302} y={532} angle={-10} /><Windmill x={161} y={669} size={.7} />
      <RoundTree x={454} y={654} size={.6} autumn /><RoundTree x={420} y={688} size={.5} autumn />
      <Pine x={133} y={843} size={.65} /><Pine x={162} y={877} size={.75} /><RoundTree x={465} y={843} size={.7} />
      <Bridge x={286} y={910} angle={20} /><Cottage x={189} y={999} size={.7} />
      <Cloud x={81} y={161} size={.66} /><Cloud x={529} y={459} size={.58} delay={-3} /><Cloud x={61} y={757} size={.5} delay={-6} />
    </> : <>
      <g stroke="#8c8260" strokeWidth="3" opacity=".55"><path d="M151 521v26m52 9v30m31 23v28m79-24v31m46 6v28m75-36v29m76 9v28m71-34v29m88-7v27m67-72v27m92-7v25m64-70v29m86-39v25m33-130v29" /></g>
      <g clipPath={`url(#${id("land")})`}>
        <path d="M651 100h428v300q-173-20-310-58t-209-47Z" fill="#d8e7d6" />
        <path d="M702 357q196-85 385 74v251H629q111-77 73-325Z" fill="#e9ce83" />
        <path d="M105 290q167-96 330 37t-15 319H112Z" fill="#78b27d" />
        <path d="M431 462q167-30 223 58t125 72l-120 131H352Z" fill="#b3ce81" />
        <path d="M478 178q9 137 158 140t65 112q-67 46-91 84t-21 143" stroke="#e5e4b2" strokeWidth="63" />
        <path d="M478 178q9 137 158 140t65 112q-67 46-91 84t-21 143" stroke={`url(#${id("river")})`} strokeWidth="46" />
        <path className="journey-river-glint" d="M493 226q13 39 53 58m58 35q51-2 75 20m13 106q-41 31-54 57m-42 56q-10 34-4 72" stroke="#e3fff0" strokeWidth="4" strokeLinecap="round" />
        {showRoute && <path d="M300 332Q366 235 588 258T900 323Q1046 471 936 540T612 610Q383 703 300 572" stroke="#fff3c2" strokeWidth="10" strokeLinecap="round" strokeDasharray="3 20" />}
        <g fill="#f4e6a4">{[[833, 395], [873, 402], [911, 388], [888, 424], [931, 445], [798, 484], [823, 501]].map(([x, y]) => <path key={`${x}-${y}`} d={`M${x} ${y}l-6-9 2 13m9-3 4-10`} stroke="#c6ad60" strokeWidth="3" />)}</g>
      </g>
      <Mountain x={720} y={284} size={.79} /><Mountain x={800} y={285} size={1.12} /><Mountain x={880} y={325} size={.78} />
      <Pine x={707} y={286} size={.55} snow /><Pine x={930} y={334} size={.65} snow /><Pine x={902} y={355} size={.48} snow />
      <RoundTree x={350} y={230} size={.56} /><RoundTree x={403} y={256} size={.7} />
      <Pine x={226} y={345} size={.8} /><Pine x={267} y={380} size={.93} /><RoundTree x={191} y={408} size={.75} />
      <Pine x={220} y={456} size={1.1} /><Pine x={283} y={464} size={.85} /><RoundTree x={319} y={433} size={.6} />
      <Pine x={352} y={496} size={.75} /><Pine x={183} y={492} size={.64} /><RoundTree x={248} y={534} size={.68} />
      <Bridge x={540} y={300} /><Bridge x={653} y={483} angle={23} />
      <Cottage x={442} y={377} size={.76} /><Cottage x={505} y={389} size={.52} />
      <path d="M388 389v19m-19-14v19m-19-13v19m0-11 38-12" stroke="#e9ddb0" strokeWidth="4" />
      <Windmill x={889} y={477} size={.82} />
      <RoundTree x={973} y={461} size={.72} autumn /><RoundTree x={1001} y={491} size={.52} autumn /><RoundTree x={915} y={545} size={.53} autumn />
      <Cottage x={727} y={572} size={.68} /><RoundTree x={791} y={586} size={.66} />
      <g transform="translate(393 580)"><ellipse cy="5" rx="40" ry="12" fill="#37785120" /><path d="m-35 0 35-16L35 0 0 16Z" fill="#dfc489" /><path d="m-35-8 35-16L35-8 0 8Z" fill="#fff1c7" /><path d="M-27-9v-24L0-44l27 11v24L0 3Z" fill="#f3e1b7" /><path d="m-35-34 35-25 35 25L0-19Z" fill="#ac92ad" /><path d="M-7-4v-16H6v17" fill="#a9805d" /></g>
      <g transform="translate(586 660)"><path d="M-20 0v38q20 18 40 0V0" fill="#bdece0" opacity=".8" /><path className="journey-waterfall" d="M-11 2v31M1 4v40M12 0v29" stroke="#f3ffed" strokeWidth="4" strokeDasharray="13 9" strokeLinecap="round" /><ellipse cy="43" rx="34" ry="9" fill="#d1f6e7" /></g>
      <g transform="translate(1060 608) rotate(-9)"><path d="M-4-52V7" stroke="#967746" strokeWidth="4" /><path d="M-10-47-39 0h29Zm11 9V1h32Z" fill="#fff8df" /><path d="M-43 8h84L21 28h-43Z" fill="#b48054" /><path d="M-39 9h76" stroke="#f3d4a0" strokeWidth="5" /><path d="M-36 40q36 9 69-1" stroke="#d8f4e5" strokeWidth="3" strokeLinecap="round" /></g>
      <g transform="translate(111 620)"><path d="m0-51 13 38 38 13-38 13L0 51-13 13-51 0l38-13Z" fill="#e5f2d5" opacity=".85" /><path d="m0-31 8 31L0 31-8 0Z" fill="#649c94" /><path d="m-31 0 31-8 31 8-31 8Z" fill="#fff9da" /><circle r="6" fill="#72b3a6" /><text y="-60" textAnchor="middle" fill="#4b8c88" fontSize="15" fontWeight="700">N</text></g>
      <Cloud x={147} y={202} size={.82} /><Cloud x={1056} y={305} size={.72} delay={-4} /><Cloud x={157} y={570} size={.64} delay={-7} /><Cloud x={967} y={680} size={.93} delay={-2} />
      <path d="M128 337q-10-10-20 0m20 0q10-10 20 0m873-157q-10-10-20 0m20 0q10-10 20 0" stroke="#5eaaa0" strokeWidth="3" strokeLinecap="round" />
    </>}
    <g fill="#fcf2bd" opacity=".9">{(portrait ? [[138, 548], [424, 555], [183, 713], [430, 770], [147, 923], [396, 1000]] : [[339, 291], [391, 319], [469, 465], [763, 470], [829, 554], [488, 589], [336, 576], [963, 380]]).map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="4" /><circle cx={x + 9} cy={y + 3} r="3" /><circle cx={x + 1} cy={y - 8} r="3" /></g>)}</g>
  </svg>;
}

export function DestinationBalloon({ index, state = "new" }: { index: number; state?: "new" | "started" | "finished" }) {
  const uid = useId().replace(/:/g, ""), colors = ["#de8c8a", "#7ab8ba", "#a493c1", "#dca752", "#76af8e", "#7ca6c9"];
  const color = state === "finished" ? "#d3a449" : state === "started" ? "#db9670" : colors[index % colors.length];
  return <svg className="journey-balloon-art" width="100" height="130" viewBox="0 0 100 130" fill="none" aria-hidden="true">
    <defs><linearGradient id={uid} x2=".8" y2="1"><stop stopColor="#fff8df" /><stop offset=".35" stopColor={color} /><stop offset="1" stopColor={color} /></linearGradient></defs>
    <ellipse cx="50" cy="123" rx="24" ry="5" fill="#346b592c" />
    <g className="journey-balloon-envelope">
      <path d="M12 41a38 38 0 0 1 76 0c0 21-22 39-27 52H39C34 80 12 62 12 41Z" fill={`url(#${uid})`} stroke="#fff9e5" strokeWidth="3" />
      <path d="M50 4C20 13 28 65 43 93m7-89c30 9 22 61 7 89" stroke="#ffefd8" strokeWidth="10" opacity=".55" />
      <path d="M39 93h22" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="42" r="17" fill="#fff9e9" stroke="#fffdf1" strokeWidth="2" />
      {state === "finished" ? <path d="m50 29 4 8 9 2-6 6 1 9-8-4-8 4 1-9-6-6 9-2Z" fill="#d6a23e" /> : <text x="50" y="48" textAnchor="middle" fontSize="19" fontWeight="800" fill={color}>{index + 1}</text>}
      <path d="m40 96 3 12m17-12-3 12" stroke="#9e8055" strokeWidth="2" />
      <path d="M40 106h20l-3 13H43Z" fill="#bb8d59" stroke="#ffedc3" strokeWidth="2" />
      <path d="M43 110h14" stroke="#e5bc80" strokeWidth="2" />
    </g>
  </svg>;
}
