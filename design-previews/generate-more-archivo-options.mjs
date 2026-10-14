import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.join(process.cwd(), "public", "design-options");
const origin = "http://localhost:3000/design-options";
const options = [
  { id: "04-san-ho", name: "San hô & kem", primary: "#BE4B35", dark: "#963B2A", accent: "#FBE8B9", accentInk: "#6F4C17", paper: "#FFF8F2", soft: "#FFE8DF", text: "#542F29", muted: "#79584C", line: "#F0D6C8", covers: ["#FFDACD", "#FAEDBF", "#DCEEDF", "#E8E2F5"], description: "Ấm áp, gần gũi. San hô tạo điểm nhấn trên nền kem nhẹ nhàng." },
  { id: "05-dai-duong", name: "Đại dương & nắng", primary: "#0369A1", dark: "#075985", accent: "#FDE68A", accentInk: "#664B0C", paper: "#F3FAFF", soft: "#E0F2FE", text: "#183D50", muted: "#4C6579", line: "#CFE4EF", covers: ["#CFE9FA", "#FFF0B7", "#D3F0E5", "#FFDCD0"], description: "Xanh biển mát mắt cùng vàng nắng, sáng rõ và giàu sức khám phá." },
  { id: "06-la-non", name: "Lá non & đào", primary: "#3F6212", dark: "#365314", accent: "#FFD7BA", accentInk: "#713D1F", paper: "#F8FBF0", soft: "#EDF4D7", text: "#2E3D22", muted: "#5C6949", line: "#DEE7C9", covers: ["#E4EDBB", "#FFDEC7", "#D9EAF5", "#F6E8BD"], description: "Gợi một khu vườn nhỏ. Xanh lá non dịu, cam đào tạo cảm giác thân thiện." },
  { id: "07-dau-sua", name: "Dâu sữa & bạc hà", primary: "#BE185D", dark: "#9D174D", accent: "#CFF3E0", accentInk: "#255943", paper: "#FFF6F9", soft: "#FCE7F0", text: "#53283A", muted: "#79566A", line: "#F0D6E1", covers: ["#F9D8E5", "#D5F2E2", "#FFEBC0", "#DEE7FB"], description: "Hồng dâu nổi bật, bạc hà cân bằng. Vui tươi với các mảng pastel mềm." },
  { id: "08-cham-mo", name: "Chàm & mơ", primary: "#4338CA", dark: "#3730A3", accent: "#FBCDAF", accentInk: "#6B3F24", paper: "#F7F7FF", soft: "#EAE9FF", text: "#302B60", muted: "#625E80", line: "#DDDDF2", covers: ["#DFDEFB", "#FFDDC8", "#D8EEE6", "#F9E9B8"], description: "Chàm rõ nét kết hợp sắc mơ ấm. Hiện đại, gọn và có chiều sâu." },
  { id: "09-mat-ong", name: "Mật ong & trời xanh", primary: "#92400E", dark: "#78350F", accent: "#D7EBFF", accentInk: "#294E72", paper: "#FFFBF1", soft: "#FCECC3", text: "#553817", muted: "#786344", line: "#EEDDB6", covers: ["#FFE5AB", "#D8EAFE", "#E0ECD0", "#F8D9D4"], description: "Vàng mật ong trên nền kem, cân bằng bằng xanh trời. Hợp cảm giác thư viện." },
  { id: "10-rung-xanh", name: "Rừng xanh & lavender", primary: "#166534", dark: "#14532D", accent: "#E7DBFF", accentInk: "#503775", paper: "#F3FBF5", soft: "#DDF3E1", text: "#244534", muted: "#536C5B", line: "#CFE5D5", covers: ["#D5EBCF", "#E8DDFA", "#FFE9BC", "#F6DBCF"], description: "Xanh rừng dễ đọc, lavender thêm nét vui. Bình yên mà vẫn có cá tính." },
  { id: "11-ngoc-lam", name: "Ngọc lam & hồng đào", primary: "#0E7490", dark: "#155E75", accent: "#FFD5D9", accentInk: "#74394A", paper: "#F2FCFC", soft: "#DDF5F6", text: "#22444D", muted: "#4C6C73", line: "#CDE7E9", covers: ["#CDEDEF", "#FFD9DF", "#F8EABF", "#E2DEF6"], description: "Tươi mát, nhẹ và sáng. Ngọc lam kết hợp hồng đào tạo nét mềm mại." },
  { id: "12-hoa-ca", name: "Hoa cà & chanh", primary: "#A21CAF", dark: "#86198F", accent: "#EDF3BC", accentInk: "#4C5B20", paper: "#FDF7FF", soft: "#F7E4FA", text: "#4E2A57", muted: "#785E7D", line: "#EBD6F0", covers: ["#EED8F5", "#EDF0C2", "#D9EAF7", "#FADCCB"], description: "Tím hoa cà cùng vàng chanh nhạt. Nhiều sắc màu, gợi sáng tạo." },
  { id: "13-nang-cam", name: "Nắng cam & biển", primary: "#C2410C", dark: "#9A3412", accent: "#C7EDE8", accentInk: "#265951", paper: "#FFF8F1", soft: "#FFEBDB", text: "#533428", muted: "#795E4C", line: "#F0DACA", covers: ["#FFDBBD", "#CFECE5", "#FFEABB", "#DEE6F7"], description: "Cam ấm đầy năng lượng, xanh biển nhạt làm dịu. Nút chính dễ nhận ra." },
];

function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
const audit = options.map(option => {
  const ratios = { button: contrast(option.primary, "#FFFFFF"), text: contrast(option.text, option.paper), secondaryText: contrast(option.muted, option.paper), ticket: contrast(option.accentInk, option.accent) };
  for (const [role, ratio] of Object.entries(ratios)) if (ratio < 4.5) throw Error(`${option.id} ${role}: ${ratio.toFixed(2)}`);
  return { id: option.id, ...Object.fromEntries(Object.entries(ratios).map(([role, ratio]) => [role, +ratio.toFixed(2)])) };
});

const css = options.map(option => `body[data-theme="${option.id}"] {
  --primary: ${option.primary}; --primary-dark: ${option.dark}; --accent: ${option.accent}; --accent-ink: ${option.accentInk};
  --paper: ${option.paper}; --soft: ${option.soft}; --text: ${option.text}; --muted: ${option.muted}; --line: ${option.line};
  ${option.covers.map((color, index) => `--cover-${index + 1}: ${color};`).join(" ")}
  --shadow: 0 12px 28px ${option.primary}12;
}`).join("\n\n");
await writeFile(path.join(output, "more-themes.css"), `/* Ten additional Archivo color palettes, 04–13. */\n${css}\n`);
const source = await readFile(path.join(output, "01-vuon-doc.html"), "utf8");
for (const option of options) {
  const html = source
    .replace(/<title>.*?<\/title>/, `<title>${option.name} · Thư Viện Nhỏ</title>`)
    .replace('data-theme="mint"', `data-theme="${option.id}"`)
    .replace('<link rel="stylesheet" href="themes.css">', '<link rel="stylesheet" href="themes.css"><link rel="stylesheet" href="more-themes.css">')
    .replace(/<div class="preview-ribbon">.*?<\/div>/, `<div class="preview-ribbon"><span><strong>${option.id.slice(0, 2)} · ${option.name}</strong> &nbsp; / &nbsp; Archivo</span><a href="more.html">← So sánh 10 mẫu mới</a></div>`);
  await writeFile(path.join(output, `${option.id}.html`), html);
}

const card = option => `<article class="option" style="--color:${option.primary};--paper:${option.paper}"><a class="thumb" href="${option.id}.html"><img src="${option.id}.png" alt="Mẫu ${option.id.slice(0, 2)} – ${option.name}" width="1440" height="1872"></a><div class="info"><h2>${option.id.slice(0, 2)} · ${option.name}</h2><p>${option.description}</p><div class="swatches"><span><i class="swatch" style="background:${option.primary}"></i>${option.primary}</span><span><i class="swatch" style="background:${option.accent}"></i>${option.accent}</span><span><i class="swatch" style="background:${option.paper}"></i>${option.paper}</span></div><div class="links"><a href="${option.id}.html">Thử giao diện →</a><a class="secondary" href="${option.id}.png">Ảnh đầy đủ</a><a class="secondary" href="${option.id}-mobile.png">Điện thoại</a></div></div></article>`;
const gallery = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>10 mẫu phối màu mới · Thư Viện Nhỏ</title><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="gallery-more.css"></head><body><main><div class="intro"><span class="tag">Thư Viện Nhỏ · Archivo · Mẫu 04–13</span><h1>Thêm 10 cách phối màu<br>cho góc đọc của em.</h1><p>Cùng bố cục và kiểu nút để dễ so sánh màu sắc. Mỗi mẫu có nền dịu, bìa pastel, chữ rõ và nút nhấn phản hồi nhẹ. Mở từng mẫu để thử tìm kiếm và lọc sách.</p></div><nav class="top-links" aria-label="Các bộ mẫu"><a href="index.html">← Ba mẫu đầu tiên</a><a href="so-sanh-04-08.png">Ảnh so sánh 04–08</a><a href="so-sanh-09-13.png">Ảnh so sánh 09–13</a></nav><div class="grid">${options.map(card).join("\n")}</div><p class="note">Gợi ý cho lớp 2: mẫu 06 có cảm giác thiên nhiên; mẫu 05 sáng rõ, dễ làm quen; mẫu 11 tươi mát và hiện đại. Đây là các bản xem thử phối màu trên giao diện hiện tại.</p></main></body></html>`;
await writeFile(path.join(output, "more.html"), gallery);

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1320 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const option of options) {
    await page.goto(`${origin}/${option.id}.html`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".story-card:visible")).toHaveCount(4);
    const theme = await page.evaluate(() => ({ color: getComputedStyle(document.body).getPropertyValue("--primary").trim(), font: getComputedStyle(document.body).fontFamily }));
    if (theme.color !== option.primary || !theme.font.startsWith("Archivo")) throw Error(`${option.id} theme did not load`);
    await page.locator('input[type="search"]').fill("tho");
    await expect(page.locator(".story-card:visible")).toHaveCount(1);
    await page.locator('input[type="search"]').fill("");
    await page.locator(".shelf-tabs button").nth(1).click();
    await expect(page.locator(".story-card:visible")).toHaveCount(1);
    await page.locator(".shelf-tabs button").first().click();
    const action = page.locator(".hero-actions .button").first();
    const initial = await action.evaluate(element => getComputedStyle(element).backgroundColor);
    await action.hover();
    await expect.poll(() => action.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(initial);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => action.evaluate(element => getComputedStyle(element).transform)).toBe("none");
    await page.mouse.move(0, 0);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1320 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`${option.id} overflows at ${width}px`);
      if (width === 390) await page.screenshot({ path: path.join(output, `${option.id}-mobile.png`), fullPage: true });
    }
    await page.screenshot({ path: path.join(output, `${option.id}.png`), fullPage: true });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    console.log(`${option.id}: desktop/mobile, font, responsive, search, filter, hover verified`);
  }
  await page.goto(`${origin}/more.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".option")).toHaveCount(10);
  if (!(await page.locator(".thumb img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)))) throw Error("Gallery image missing");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1320 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Gallery overflows at ${width}px`);
  }
  for (const [offset, filename, title] of [[0, "so-sanh-04-08.png", "04–08 · San hô, biển, lá non, dâu sữa, chàm"], [5, "so-sanh-09-13.png", "09–13 · Mật ong, rừng xanh, ngọc lam, hoa cà, cam"]]) {
    await page.goto(`${origin}/more.html`);
    await page.setViewportSize({ width: 2000, height: 800 });
    await page.evaluate(({ start, heading }) => {
      document.body.dataset.sheet = "true";
      document.querySelector("h1").textContent = heading;
      document.querySelectorAll(".option").forEach((element, index) => { if (index < start || index >= start + 5) element.remove(); });
    }, { start: offset, heading: title });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, filename), fullPage: true });
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await writeFile(".data/project-check/more-palettes-verification.json", JSON.stringify({ palettes: audit, responsive: [390, 768, 1440], browserErrors: errors }, null, 2));
  console.log("10 previews and 22 images complete; gallery verified.");
} finally {
  await browser.close();
}

// Add a permanent link from the original three-option gallery.
const indexPath = path.join(output, "index.html");
let index = await readFile(indexPath, "utf8");
if (!index.includes('href="more.html"')) {
  index = index.replace('<div class="grid">', '<p><a href="more.html" style="display:inline-flex;align-items:center;min-height:48px;padding:10px 18px;border-radius:12px;background:#22334b;color:white;text-decoration:none;font-weight:700">Xem thêm 10 mẫu mới · 04–13 →</a></p><div class="grid">');
  await writeFile(indexPath, index);
}
