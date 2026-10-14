import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const output = path.join(process.cwd(), "public", "design-options");
const origin = "http://localhost:3000";
const options = [
  { id: "01-vuon-doc", theme: "mint", name: "Vườn đọc xanh", color: "#0F766E", accent: "#FFE4A1", description: "Xanh ngọc dịu mắt, vàng bơ ấm áp. Nút nổi nhẹ, nhấn xuống rõ ràng.", recommendation: "Đề xuất ưu tiên" },
  { id: "02-bau-troi", theme: "sky", name: "Bầu trời khám phá", color: "#2563EB", accent: "#FFDDC5", description: "Xanh dương sáng, điểm nhấn cam đào. Nút bo tròn, sáng nhẹ khi rê chuột.", recommendation: "Rõ ràng · Năng động" },
  { id: "03-vu-tru", theme: "violet", name: "Vũ trụ sắc màu", color: "#7C3AED", accent: "#FFDEC2", description: "Tím sáng tạo cùng các bìa pastel. Nút có đế nổi và phản hồi khi bấm.", recommendation: "Vui tươi · Sáng tạo" },
];
const illustrations = [
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="39" cy="26" rx="9" ry="21" fill="#fffdf8" transform="rotate(-12 39 26)"/><ellipse cx="60" cy="26" rx="9" ry="21" fill="#fffdf8" transform="rotate(12 60 26)"/><ellipse cx="49" cy="60" rx="29" ry="26" fill="#fffdf8"/><circle cx="40" cy="56" r="2" fill="currentColor" stroke="none"/><circle cx="57" cy="56" r="2" fill="currentColor" stroke="none"/><path d="m46 64 3 3 3-3m-3 3v6m-7-2q7 8 14 0"/><path d="m76 66 13 9-23 14Z" fill="#f8b363"/><path d="m79 69 5-10m-4 10 12-3"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 49q2-22 27-22t27 22" fill="#fffdf8"/><path d="M15 49h70q-4 33-35 33T15 49Z" fill="#fffdf8"/><path d="M40 83h20m-23-28 8-4m7-11 8-4m-27 5 5-5m15 22 7-3"/><path d="m66 13 22 30m-12-31 18 30"/><path d="M30 18q-5-6 0-12M47 17q-5-6 0-12" opacity=".55"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><rect x="39" y="9" width="23" height="12" rx="4" fill="#fffdf8"/><path d="M39 21v11q-12 4-12 15v30q0 13 13 13h21q13 0 13-13V47q0-11-12-15V21" fill="#fffdf8"/><path d="M28 55h45v23q0 11-13 11H41q-13 0-13-11Z" fill="currentColor" opacity=".18"/><path d="M51 45q-9 10-9 16a9 9 0 0 0 18 0q0-6-9-16Z"/><path d="m79 18 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" opacity=".55"/></svg>',
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M50 87V35m0 30L29 48m21 5 21-20"/><path d="M49 45Q18 48 18 20q31-2 31 25Z" fill="#fffdf8"/><path d="M52 54q0-34 31-34 0 34-31 34Z" fill="#fffdf8"/><path d="M48 71Q20 75 16 53q27-8 32 18Z" fill="#fffdf8"/><path d="M35 88h31m-37-5h4m41 0h4"/><circle cx="15" cy="9" r="5" fill="currentColor" opacity=".18"/><path d="m82 65 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" opacity=".5"/></svg>',
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1320 } });
  const source = await readFile(".data/project-check/preview-markup.html", "utf8");
  await page.setContent(`<html><body>${source}</body></html>`);
  const markup = await page.evaluate((artwork) => {
    document.querySelectorAll(".story-card").forEach((card, index) => {
      if (index >= 4) { card.remove(); return; }
      const symbol = card.querySelector(".jacket-symbol");
      if (symbol) symbol.innerHTML = artwork[index];
    });
    document.querySelectorAll(".pagination").forEach(element => element.remove());
    document.querySelector(".shelf-tabs button").textContent = "Tất cả sách / 4";
    document.querySelector(".shelf-heading").id = "books";
    document.querySelector(".hero").insertAdjacentHTML("beforeend", '<div class="hero-actions"><a href="#books" class="button">Chọn sách để đọc <span aria-hidden="true">→</span></a><a href="/nghe-sach" class="button secondary">🎧 Nghe sách</a></div>');
    document.querySelectorAll(".brand, .site-footer .teacher-link").forEach(link => { link.href = "/"; });
    return document.body.innerHTML;
  }, illustrations);
  for (const option of options) {
    const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${option.name} · Thư Viện Nhỏ</title><meta name="robots" content="noindex"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="themes.css"><script src="preview.js" defer></script></head>
<body data-theme="${option.theme}"><div class="preview-ribbon"><span><strong>${option.id.slice(0, 2)} · ${option.name}</strong> &nbsp; / &nbsp; ${option.recommendation} &nbsp; / &nbsp; Archivo</span><a href="index.html">← So sánh 3 mẫu</a></div>${markup}<dialog class="preview-dialog"><h2></h2><p></p><div class="actions"><a class="button" href="/">Đọc truyện này →</a><button type="button" class="button secondary">Để em chọn thêm</button></div></dialog></body></html>`;
    await writeFile(path.join(output, `${option.id}.html`), html);
    await page.goto(`${origin}/design-options/${option.id}.html`, { timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".story-card:visible")).toHaveCount(4);
    await page.locator('input[type="search"]').fill("tho");
    await expect(page.locator(".story-card:visible")).toHaveCount(1);
    await page.locator('input[type="search"]').fill("");
    await page.locator(".shelf-tabs button").nth(1).click();
    await expect(page.locator(".story-card:visible")).toHaveCount(1);
    await page.locator(".shelf-tabs button").first().click();
    await page.locator(".card-body .button").first().click();
    await expect(page.locator("dialog")).toBeVisible();
    await page.locator("dialog button").click();
    const action = page.locator(".hero-actions .button").first();
    const initialBackground = await action.evaluate(element => getComputedStyle(element).backgroundColor);
    await action.hover();
    await expect.poll(() => action.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(initialBackground);
    const box = await action.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = await action.evaluate(element => getComputedStyle(element).transform);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await action.hover();
    await expect.poll(() => action.evaluate(element => getComputedStyle(element).transform)).toBe("none");
    await page.mouse.move(0, 0);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1320 });
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      if (!fits) throw Error(`${option.id} overflows at ${width}px`);
      if (width === 390) await page.screenshot({ path: path.join(output, `${option.id}-mobile.png`), fullPage: true, caret: "initial" });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `${option.id}.png`), fullPage: true, caret: "initial" });
    console.log(JSON.stringify({ option: option.id, screenshot: `${option.id}.png`, interactions: "search, theme, dialog, hover, press", pressed, responsive: "390/768/1440", reducedMotion: "passed" }));
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  const index = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>3 mẫu màu Archivo · Thư Viện Nhỏ</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/design-options/base.css"><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f8fb;color:#22334b;font-family:"Archivo",system-ui,sans-serif;line-height:1.6}main{width:min(1360px,100%);margin:auto;padding:48px 28px}h1{font-size:clamp(28px,4vw,46px);font-weight:800;line-height:1.15;margin:14px 0}h2{font-size:23px;font-weight:800;margin:0}p{margin:12px 0;color:#55667a}.intro{max-width:800px}.tag{display:inline-block;padding:6px 13px;background:#deefe8;color:#155e52;border-radius:999px;font-size:13px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:32px}.option{border:1px solid #dce4ed;border-radius:22px;background:white;overflow:hidden;box-shadow:0 12px 30px #22334b08}.option img{width:100%;height:auto;display:block;border-bottom:1px solid #e8edf4}.info{padding:23px}.swatches{display:flex;gap:9px;align-items:center;margin:14px 0;font-size:13px;color:#536478}.swatch{width:22px;height:22px;border-radius:50%;display:inline-block}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:10px 14px;border-radius:12px;text-decoration:none;background:var(--color);color:white;font-weight:700;font-size:14px}.links a.secondary{background:#f1f4f8;color:#3c4f67}.links a:hover{filter:brightness(.95);transform:translateY(-1px)}:focus-visible{outline:3px solid #2563eb;outline-offset:4px}.note{margin-top:30px;padding:20px 24px;background:white;border:1px solid #dce4ed;border-radius:18px}@media(max-width:1000px){.grid{grid-template-columns:1fr}.option{display:grid;grid-template-columns:1fr 1fr}.info{align-self:center}}@media(max-width:600px){main{padding:28px 18px}.option{display:block}}@media(prefers-reduced-motion:reduce){.links a:hover{transform:none}}
  </style></head><body><main><div class="intro"><span class="tag">Thư Viện Nhỏ · Đề xuất giao diện lớp 2</span><h1>Cùng một tủ sách.<br>Ba cách thêm sắc màu.</h1><p>Cả ba mẫu dùng Archivo, nút lớn từ 48px, chữ rõ và hiệu ứng nhẹ. Mở mẫu để thử rê chuột, nhấn nút, lọc chủ đề và tìm truyện.</p></div><div class="grid">${options.map(option => `<article class="option" style="--color:${option.color}"><a href="${option.id}.html"><img src="${option.id}.png" alt="Ảnh minh họa mẫu ${option.name}" width="1440" height="1320"></a><div class="info"><span class="tag">${option.recommendation}</span><h2>${option.id.slice(0,2)} · ${option.name}</h2><p>${option.description}</p><div class="swatches"><span class="swatch" style="background:${option.color}"></span>${option.color}<span class="swatch" style="background:${option.accent}"></span>${option.accent}</div><div class="links"><a href="${option.id}.html">Thử giao diện →</a><a class="secondary" href="${option.id}-mobile.png">Ảnh điện thoại</a></div></div></article>`).join("")}</div><p class="note">Ưu tiên mẫu 01 nếu muốn các em tập trung vào việc đọc; mẫu 02 rõ và năng động hơn; mẫu 03 tạo cảm giác vui chơi và khám phá. Đây là các bản xem trước màu sắc dựa trên giao diện hiện tại.</p></main></body></html>`;
  await writeFile(path.join(output, "index.html"), index);
  await page.goto(`${origin}/design-options/index.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, "so-sanh-3-mau.png"), fullPage: true, caret: "initial" });
} finally {
  await browser.close();
}
