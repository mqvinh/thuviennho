"use client";
import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Story, Theme, LibraryActivity } from "@/lib/library";
import { Cover } from "./cover";
import { ListeningIcon } from "./listening-icon";
import { ThemeIcon } from "./theme-icon";
import { CatalogPagination } from "./catalog-pagination";
export function Library({
  stories,
  themes,
  activity,
  initialTheme = "",
}: {
  stories: Story[];
  themes: Theme[];
  activity?: LibraryActivity;
  initialTheme?: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [theme, setTheme] = useState(initialTheme);
  const searchId = useId();
  const storyHref = (story: Story) => activity ? `/doc/${story.slug}#${activity}` : `/truyen/${story.slug}`;
  const actionLabel = activity === "audio" ? "Nghe truyện" : activity === "quiz" ? "Bắt đầu thử tài" : "Khám phá truyện";
  const activeTheme = themes.some(item => item.slug === theme) ? theme : "";
  const [search, setSearch] = useState("");
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const visible = stories.filter(
    (s) =>
      (!activeTheme || s.theme_slug === activeTheme) &&
      normalize(`${s.title_vi} ${s.title_en}`).includes(
        normalize(search.trim()),
      ),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageStories = visible.slice(start, start + pageSize);
  const suggestion = stories[0];
  function goToPage(number: number) {
    setPage(number);
    document.getElementById("books")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }
  return (
    <section className="library-catalog" aria-label="Danh sách truyện song ngữ">
      <div className="shelf-tabs" role="group" aria-label="Chọn chủ đề">
        <button className={!activeTheme ? "active" : ""} aria-pressed={!activeTheme} onClick={() => { setTheme(""); setPage(1); }}>
          <ListeningIcon name="book" />Tất cả sách ({stories.length})
        </button>
        {themes.map(t => (
          <button key={t.slug} className={activeTheme === t.slug ? "active" : ""} aria-pressed={activeTheme === t.slug} onClick={() => { setTheme(t.slug); setPage(1); }}>
            <span className="theme-icon" aria-hidden="true"><ThemeIcon path={t.icon_path} /></span>{t.name_vi}
          </button>
        ))}
      </div>
      <div className="filters shelf-filters">
        <div className="shelf-search">
          <label htmlFor={searchId} className="shelf-search-label">Tìm tên truyện</label>
          <ListeningIcon name="search" />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm truyện song ngữ… (Tên tiếng Việt hoặc English)"
          />
        </div>
        <div className="shelf-search-art" aria-hidden="true" />
      </div>
      <p className="shelf-results" role="status" aria-live="polite">
        Tìm thấy {visible.length} truyện{visible.length > 0 && ` · Hiển thị ${start + 1}–${Math.min(start + pageSize, visible.length)}`}
      </p>
      {visible.length ? (
        <div className="story-grid bookshelf">
          {pageStories.map((s, index) => (
            <article key={s.slug} className="story-card">
              <Link className="book-cover-link" href={storyHref(s)} aria-label={`Mở truyện ${s.title_vi}`}>
                <Cover shelf eager={index === 0} path={s.cover_image_path} title={s.title_vi} />
                <span className="eyebrow story-cover-badge">
                  {s.theme_vi} · Mức {s.reading_level}
                </span>
              </Link>
              <div className="card-body">
                <h3>{s.title_vi}</h3>
                <p lang="en" className="english">
                  {s.title_en}
                </p>
                <p className="story-card-summary">{s.summary_vi}</p>
                <p className="muted story-card-meta">
                  <ListeningIcon name="clock" /><span>{s.sentence_count} câu · {s.estimated_minutes} phút</span>
                </p>
                <Link className="button" href={storyHref(s)}>
                  {actionLabel}<ListeningIcon name="arrow-right" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <h3>
            {stories.length
              ? "Chưa tìm thấy truyện phù hợp"
              : activity === "audio" ? "Chưa có truyện để nghe" : activity === "quiz" ? "Chưa có truyện để thử tài" : "Tủ sách đang chờ những câu chuyện mới"}
          </h3>
          <p>
            {stories.length
              ? "Em thử chọn chủ đề hoặc tên truyện khác nhé!"
              : "Em quay lại sau để khám phá truyện nhé!"}
          </p>
          {stories.length > 0 && (
            <button
              className="button"
              onClick={() => {
                setTheme("");
                setSearch("");
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      <CatalogPagination page={currentPage} pageCount={pageCount} onChange={goToPage} label="Phân trang tủ sách" />
      <section className="shelf-extras" aria-label="Gợi ý đọc sách">
        {suggestion && (
          <article className="reading-suggestion">
            <Image src="/images/reading-corner.jpg" alt="Một góc thư viện với những kệ sách" width={160} height={130} unoptimized />
            <div className="reading-suggestion-copy">
              <p className="eyebrow"><ListeningIcon name="tip" />Gợi ý cho buổi đọc hôm nay</p>
              <h2>{suggestion.title_vi}</h2>
              <p>{suggestion.theme_vi} · {suggestion.estimated_minutes} phút đọc</p>
              <Link className="button" href={storyHref(suggestion)}>{activity ? actionLabel : "Mở sách"}<ListeningIcon name="arrow-right" /></Link>
            </div>
            <div className="reading-suggestion-note">
              <ListeningIcon name="heart" />
              <p>“Một câu chuyện nhỏ<br />có thể làm nên<br />một trái tim lớn!”</p>
            </div>
          </article>
        )}
        <blockquote className="reading-quote">
          <span className="reading-quote-mark" aria-hidden="true">“</span>
          <p>“Mỗi trang sách là một cánh cửa.<br />Em có thể mở bất cứ lúc nào.”</p>
          <cite>Góc đọc Thư Viện Nhỏ</cite>
        </blockquote>
      </section>
    </section>
  );
}
