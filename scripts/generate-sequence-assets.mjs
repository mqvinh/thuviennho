import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Original code-native vector illustrations in the library's existing style.
// Text stays outside the artwork, so the pictures do not reveal their position.
const person = (x, y, color = "#83adad", scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-12 82v44m24-44v44" stroke="#75624f" stroke-width="15" stroke-linecap="round"/><rect x="-30" y="23" width="60" height="65" rx="20" fill="${color}"/><path d="m-25 40-23 34m73-34 23 34" stroke="#edc6a4" stroke-width="14" stroke-linecap="round"/><circle r="29" fill="#f1ccab"/><path d="M-29-1c-8-51 68-51 58 0L9-21-8-12Z" fill="#79563e"/><circle cx="-10" cy="2" r="3" fill="#5e503f"/><circle cx="10" cy="2" r="3" fill="#5e503f"/><path d="M-8 15q8 7 16 0" stroke="#bb8163" stroke-width="3" fill="none"/></g>`;
const pencil = (x, y, rotate = 0, broken = false) => `<g transform="translate(${x} ${y}) rotate(${rotate})"><path d="M-75-10H${broken ? -9 : 65}v20H-75Z" fill="#e4be61" stroke="#ab8447" stroke-width="2"/>${broken ? '<path d="m-9-10 8 5-8 5 8 5-8 5" stroke="#ab8447" stroke-width="2" fill="#edd5ab"/><g transform="translate(24 17) rotate(18)"><path d="M0-10h42v20H0l8-5-8-5 8-5Z" fill="#e4be61" stroke="#ab8447" stroke-width="2"/><path d="m42-10 22 10-22 10Z" fill="#dcc4a1"/></g>' : '<path d="m65-10 24 10-24 10Z" fill="#dcc4a1"/><path d="m82-3 7 3-7 3Z" fill="#665b4b"/>'}<path d="M-75-10h16v20h-16Z" fill="#dca091"/></g>`;
const pot = (x, y, stage = 0) => `<g transform="translate(${x} ${y})"><path d="m-55 0 14 75h82L55 0Z" fill="#c99273" stroke="#a77353" stroke-width="3"/><rect x="-63" y="-12" width="126" height="26" rx="8" fill="#dfae8b" stroke="#a77353" stroke-width="3"/><ellipse cy="-12" rx="55" ry="12" fill="#806145"/>${stage ? `<path d="M0-15v-${stage === 1 ? 62 : 123}" stroke="#7b9c5c" stroke-width="7" stroke-linecap="round"/><path d="M0-37q-52-53-49-12 5 29 49 23M0-58q50-48 48-11-6 25-48 25" fill="#93b87b"/>${stage === 2 ? '<path d="M0-91q-46-47-44-14 4 27 44 25M0-112q47-48 46-13-3 24-46 27" fill="#a7c68a"/>' : ""}` : '<ellipse cx="-6" cy="-13" rx="9" ry="5" fill="#dbc08c"/>'}</g>`;
const bottle = (x, y, filled = true, cap = true, rotate = 0) => `<g transform="translate(${x} ${y}) rotate(${rotate})"><path d="M-21-75h42v30q17 7 17 29v85q0 13-13 13h-50q-13 0-13-13v-85q0-22 17-29Z" fill="#d6e9e7" stroke="#79a5a9" stroke-width="4"/>${filled ? '<path d="M-31 12q31-13 62 0v53q0 11-11 11h-40q-11 0-11-11Z" fill="#8ec7d6"/>' : ""}${cap ? '<rect x="-26" y="-90" width="52" height="27" rx="7" fill="#80a8aa"/>' : ""}<path d="M-19-23v25" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`;
const bag = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-46-55v-25q0-30 46-30t46 30v25" stroke="#8e7960" stroke-width="12" fill="none"/><rect x="-65" y="-68" width="130" height="150" rx="25" fill="#d4b67d" stroke="#a48a5e" stroke-width="4"/><rect x="-44" y="5" width="88" height="54" rx="14" fill="#b8c39c"/><path d="M-40-35h80" stroke="#a48a5e" stroke-width="4"/></g>`;
const table = '<path d="M90 288h420M118 290v65m364-65v65" fill="none" stroke="#bd9b73" stroke-width="14" stroke-linecap="round"/>';
const sun = '<circle cx="498" cy="72" r="29" fill="#ecd080"/><path d="M498 26V13m0 105v13M452 72h-13m105 0h13M466 40l-10-10m75 75 10 10m-75-10-10 10m75-75 10-10" stroke="#e0c17a" stroke-width="5" stroke-linecap="round"/>';
const scene = body => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" rx="28" fill="#f8f4e8"/><path d="M0 325Q145 285 300 327T600 314v86H0Z" fill="#e9edda"/><circle cx="76" cy="76" r="40" fill="#edf0df"/>${body}</svg>`;
const packs = [
  { slug: "but-chi-cua-lan", cards: [
    [1, "Lan mang hai chiếc bút chì đến lớp.", "Trước khi giúp bạn, Lan đã mang đồ dùng của mình đến lớp.", scene(person(147, 140, "#d5a1a4") + bag(398, 224) + pencil(384, 144, -75) + pencil(425, 151, -78))],
    [2, "Bút chì của Minh bị gãy.", "Minh gặp một vấn đề với bút chì rồi mới được Lan giúp.", scene(person(135, 133) + table + pencil(345, 238, -5, true))],
    [3, "Lan cho Minh mượn một chiếc bút.", "Sau khi thấy bút của bạn bị gãy, Lan chia sẻ đồ dùng.", scene(person(142, 151, "#d5a1a4") + person(460, 151) + '<path d="M184 217h56m120 0h58" stroke="#edc6a4" stroke-width="17" stroke-linecap="round"/>' + pencil(300, 216))],
    [4, "Minh cảm ơn Lan rồi viết bài.", "Có bút để dùng rồi, Minh mới tiếp tục làm bài.", scene(person(156, 149, "#d5a1a4", .85) + person(404, 132) + table + '<path d="m305 240 116-9 25 43-119 5Z" fill="#fffdf5" stroke="#c5ba9d" stroke-width="3"/><path d="m330 252 60-5m-52 15 55-4" stroke="#c7c0ab" stroke-width="3"/>' + pencil(410, 223, -48))],
  ] },
  { slug: "mam-cay-nho", cards: [
    [1, "Bình đặt một hạt đậu vào chậu đất.", "Muốn có cây, trước hết Bình cần gieo hạt vào đất.", scene(person(145, 155) + pot(369, 254) + '<path d="m192 211 77-12 53 26" fill="none" stroke="#edc6a4" stroke-width="17" stroke-linecap="round"/><ellipse cx="337" cy="221" rx="10" ry="7" fill="#d8b776"/>')],
    [2, "Mỗi sáng Bình tưới một chút nước.", "Hạt đã ở trong chậu. Bình chăm sóc để hạt có thể nảy mầm.", scene(person(130, 147) + pot(410, 250) + '<path d="M221 155h75v59h-75Z" fill="#94b6bd" stroke="#6d969c" stroke-width="4"/><path d="m296 170 49 35-12 14-37-26M220 167q-42-22-35 29" fill="none" stroke="#6d969c" stroke-width="10"/><path d="m346 221 9 10m2-4 9 10m-13-2 9 10" stroke="#8fc4d5" stroke-width="5" stroke-linecap="round"/>')],
    [3, "Một mầm xanh nhú lên khỏi đất.", "Sau những ngày tưới nước, điều gì bắt đầu xuất hiện trên mặt đất?", scene(pot(302, 246, 1) + '<path d="m152 159 15 15m-33 3h23m305-18-15 15m33 3h-23" stroke="#d3b764" stroke-width="5" stroke-linecap="round"/>')],
    [5, "Bình vui khi thấy cây lớn lên.", "Từ mầm nhỏ, cây đã lớn hơn và có thêm lá.", scene(person(151, 151) + pot(380, 244, 2) + sun)],
  ] },
  { slug: "binh-nuoc-cua-em", cards: [
    [1, "Trước khi đi học, Tú kiểm tra cặp.", "Tú kiểm tra đồ dùng trước khi nhận ra bình nước đang trống.", scene(person(148, 145) + bag(355, 232) + bottle(489, 251, false))],
    [3, "Tú nhờ mẹ giúp lấy nước uống.", "Khi biết bình còn trống, Tú nhờ người lớn giúp lấy nước.", scene(person(133, 119, "#c6a3b2", 1.2) + person(460, 178, "#83adad", .8) + bottle(329, 261, true, false) + '<path d="m204 141 74-4 18 65-65 10Z" fill="#b9d6d9" stroke="#7ea6ad" stroke-width="4"/><path d="m293 199 34 37" stroke="#8ac3d4" stroke-width="8" stroke-linecap="round"/>')],
    [4, "Tú đóng nắp bình thật chặt.", "Nước đã được lấy vào bình. Tú cần làm gì để nước không đổ ra?", scene(bottle(300, 244) + '<path d="M242 90q60-49 120 0m-17-25 17 25-29 3" fill="none" stroke="#9cb58b" stroke-width="6" stroke-linecap="round"/><path d="M163 192q15-60 99-40m175 40q-15-60-99-40" fill="none" stroke="#edc6a4" stroke-width="23" stroke-linecap="round"/>')],
    [5, "Sau giờ chơi, Tú uống nước.", "Đã chuẩn bị bình xong từ nhà, Tú dùng nước khi cần sau giờ chơi.", scene(person(285, 157) + bottle(358, 171, true, false, -55) + '<path d="M314 198q43 15 49-24" fill="none" stroke="#edc6a4" stroke-width="17" stroke-linecap="round"/>' + sun)],
  ] },
];
await mkdir("content/sequencing/illustrations", { recursive: true });
await mkdir("public/images/sequencing", { recursive: true });
const manifest = [];
for (const pack of packs) {
  const cards = [];
  for (const [sentence_no, text_vi, hint_vi, svg] of pack.cards) {
    const name = `${pack.slug}-${sentence_no}`;
    await writeFile(`content/sequencing/illustrations/${name}.svg`, svg + "\n");
    await sharp(Buffer.from(svg)).png().toFile(`public/images/sequencing/${name}.png`);
    cards.push({ sentence_no, text_vi, hint_vi, image: `/images/sequencing/${name}.png` });
  }
  manifest.push({ slug: pack.slug, cards });
}
await writeFile("content/sequencing/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
const catalog = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="#edf4e6"/><circle cx="510" cy="63" r="31" fill="#f0d18b"/>${[0, 1, 2].map((stage, i) => `<g transform="translate(${36 + i * 188} ${42 + (i === 1 ? 12 : 0)})"><rect width="158" height="259" rx="19" fill="#fffdf5" stroke="#d9cba9" stroke-width="3"/>${pot(79, 151, stage).replace('scale(1)', 'scale(.7)')}<path d="M40 222h78" stroke="#d9cba9" stroke-width="6" stroke-linecap="round"/></g>`).join("")}<path d="M199 194h20m-7-7 7 7-7 7m175-7h20m-7-7 7 7-7 7" fill="none" stroke="#7a9b6d" stroke-width="4" stroke-linecap="round"/></svg>`;
await writeFile("public/images/games-sequencing.svg", catalog + "\n");
console.log(`Prepared ${manifest.length} story games with ${manifest.reduce((sum, p) => sum + p.cards.length, 0)} original scene illustrations.`);
