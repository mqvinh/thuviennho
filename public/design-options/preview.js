const cards = [...document.querySelectorAll(".story-card")];
const tabs = [...document.querySelectorAll(".shelf-tabs button")];
const search = document.querySelector('input[type="search"]');
const level = document.querySelector(".shelf-filters select");
const status = document.querySelector(".filters + [role=status]");
let activeTheme = "";
const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
function update() {
  let count = 0;
  for (const card of cards) {
    const description = card.querySelector(".eyebrow").textContent;
    const title = `${card.querySelector("h3").textContent} ${card.querySelector(".english").textContent}`;
    const visible = (!activeTheme || normalize(description).includes(normalize(activeTheme)))
      && (!level.value || description.includes(`Mức ${level.value}`))
      && normalize(title).includes(normalize(search.value));
    card.hidden = !visible;
    if (visible) count++;
  }
  status.textContent = count ? `Có ${count} cuốn sách trong mẫu xem trước` : "Em thử chọn chủ đề hoặc tên truyện khác nhé!";
}
tabs.forEach((tab, index) => tab.addEventListener("click", () => {
  activeTheme = index ? tab.textContent.trim() : "";
  tabs.forEach(button => {
    const selected = button === tab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  update();
}));
search.addEventListener("input", update);
level.addEventListener("change", update);
const dialog = document.querySelector(".preview-dialog");
for (const card of cards) {
  card.querySelectorAll("a").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    dialog.querySelector("h2").textContent = card.querySelector("h3").textContent;
    dialog.querySelector("p").textContent = card.querySelector(".english").textContent;
    dialog.querySelector("a").href = link.getAttribute("href").replace("/truyen/", "/doc/");
    dialog.showModal();
  }));
}
dialog.querySelector("button").addEventListener("click", () => dialog.close());
update();
