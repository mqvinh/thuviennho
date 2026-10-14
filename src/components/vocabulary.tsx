"use client";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { Word } from "@/lib/library";
import { ListeningIcon } from "./listening-icon";
import { CatalogPagination } from "./catalog-pagination";

export function VocabularyHeading({
  id,
  title,
  description,
  heading: Heading = "h2",
}: {
  id: string;
  title: string;
  description: string;
  heading?: "h1" | "h2";
}) {
  return (
    <header className="vocabulary-heading">
      <span className="vocabulary-symbol" aria-hidden="true">
        <ListeningIcon name="book" />
        <ListeningIcon name="tip" />
      </span>
      <div>
        <Heading id={id}>{title}</Heading>
        <p>{description}</p>
      </div>
      <div className="vocabulary-heading-art" aria-hidden="true" />
    </header>
  );
}

export function WordCard({
  word,
  allowFavorites = true,
}: {
  word: Word;
  allowFavorites?: boolean;
}) {
  const { data } = useDeviceData();
  const [message, setMessage] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const isFavorite = data.favorites.includes(word.id);
  const illustration =
    word.illustration_path?.startsWith("/") && !word.illustration_path.startsWith("//")
      ? word.illustration_path
      : null;
  return (
    <article className="panel word-card">
      <div className={`word-illustration${illustration ? " has-word-illustration" : ""}`}>
        <Image
          src={illustration || "/images/vocabulary-books.svg"}
          alt={illustration ? `Minh họa từ ${word.word_vi}` : ""}
          fill
          sizes="(max-width: 600px) 100vw, 900px"
          unoptimized
        />
      </div>
      <h3>
        {word.word_vi} · <span lang="en">{word.word_en}</span>
      </h3>
      <div className="word-details">
        <div className="word-detail word-meaning">
          <span className="word-detail-icon" aria-hidden="true"><ListeningIcon name="book" /></span>
          <p><strong>Nghĩa:</strong>{" "}{word.meaning_vi || "Nghĩa của từ đang được chuẩn bị."}</p>
        </div>
        <div className="word-detail word-example">
          <span className="word-detail-icon" aria-hidden="true"><ListeningIcon name="pencil" /></span>
          <p><strong>Ví dụ:</strong>{" "}{word.example_vi || "Ví dụ đang được chuẩn bị."}</p>
        </div>
        <div className="word-detail word-story">
          <span className="word-detail-icon" aria-hidden="true"><ListeningIcon name="book" /></span>
          <p className="muted"><strong>Trong truyện:</strong>{" "}{word.story_title}</p>
        </div>
        <div className="word-detail word-audio">
          <span className="word-detail-icon" aria-hidden="true"><ListeningIcon name="volume" /></span>
          <p><strong>Audio:</strong>{" "}{word.pronunciation_path ? (
            <button
              type="button"
              className="button secondary word-pronunciation"
              onClick={() => {
                setMessage("");
                audio.current?.play().catch(() => setMessage("Chưa phát được âm thanh."));
              }}
            >
              Nghe phát âm
            </button>
          ) : "Chưa có audio phát âm."}</p>
        </div>
      </div>
      {word.pronunciation_path && (
        <audio
          ref={audio}
          src={word.pronunciation_path}
          preload="none"
          onError={() => setMessage("Chưa tải được âm thanh. Em thử lại sau nhé!")}
        />
      )}
      {allowFavorites && (
        <div className="word-card-actions">
          <button
            type="button"
            className="button secondary word-favorite"
            aria-label={isFavorite ? "♥ Đã yêu thích" : "♡ Yêu thích từ"}
            aria-pressed={isFavorite}
            onClick={() => {
              try {
                changeDeviceData((d) => ({
                  ...d,
                  favorites: d.favorites.includes(word.id)
                    ? d.favorites.filter((id) => id !== word.id)
                    : [...d.favorites, word.id],
                }));
                setMessage("Đã lưu lựa chọn trên thiết bị.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Chưa lưu được.");
              }
            }}
          >
            <ListeningIcon name="heart" />
            {isFavorite ? "Đã yêu thích" : "Yêu thích từ"}
          </button>
        </div>
      )}
      {message && <p className="word-feedback" role="status">{message}</p>}
    </article>
  );
}
const vocabularyTabs = [
  { id: "all", label: "Tất cả các từ" },
  { id: "favorites", label: "Từ yêu thích" },
] as const;

export function Vocabulary({
  words,
  storySlug,
}: {
  words: Word[];
  storySlug?: string;
}) {
  const { data } = useDeviceData();
  const id = useId();
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [tab, setTab] = useState<"all" | "favorites">("all");
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const normalize = (text: string) => text.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const stories = Array.from(
    new Map(words.map((w) => [w.story_slug, w.story_title])).entries(),
  );
  const visible = words.filter(
    (w) =>
      (!(storySlug || slug) || w.story_slug === (storySlug || slug)) &&
      (tab === "all" || data.favorites.includes(w.id)) &&
      (storySlug || normalize(`${w.word_vi} ${w.word_en}`).includes(normalize(search.trim()))),
  );
  const pageSize = storySlug ? Math.max(1, visible.length) : 6;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageWords = visible.slice(start, start + pageSize);
  const emptyMessage = !storySlug && search.trim() ? "Chưa tìm thấy từ phù hợp. Em thử tên từ khác nhé!" : tab === "favorites"
    ? `${storySlug ? "Em chưa có từ yêu thích trong truyện này." : "Chưa có từ yêu thích trong danh sách này."} Mở tab “Tất cả các từ” và chạm “Yêu thích từ” để lưu nhé!`
    : storySlug
      ? "Truyện này chưa có từ mới."
      : "Chưa có từ mới trong danh sách này.";
  return (
    <div className="vocabulary">
      <div className="shelf-tabs vocabulary-tabs" role="tablist" aria-label="Danh sách từ vựng">
        {vocabularyTabs.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { tabButtons.current[index] = element; }}
            type="button"
            role="tab"
            id={`${id}-tab-${item.id}`}
            aria-controls={`${id}-panel-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            className={tab === item.id ? "active" : undefined}
            onClick={() => { setTab(item.id); setPage(1); }}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight") next = (index + 1) % vocabularyTabs.length;
              else if (event.key === "ArrowLeft") next = (index + vocabularyTabs.length - 1) % vocabularyTabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = vocabularyTabs.length - 1;
              else return;
              event.preventDefault();
              setTab(vocabularyTabs[next].id);
              setPage(1);
              tabButtons.current[next]?.focus();
            }}
          >
            <ListeningIcon name={item.id === "all" ? "book" : "heart"} />
            {item.label}
          </button>
        ))}
      </div>
      {!storySlug && <div className="vocabulary-filters"><label className="vocabulary-story-filter">
        Chọn truyện
        <select aria-label="Chọn truyện" value={slug} onChange={(e) => { setSlug(e.target.value); setPage(1); }}>
          <option value="">Tất cả truyện</option>
          {stories.map(([id, title]) => (
            <option value={id} key={id}>
              {title}
            </option>
          ))}
        </select>
      </label><label className="vocabulary-name-filter">
        Tìm tên từ vựng
        <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Nhập từ tiếng Việt hoặc English" />
      </label></div>}
      {!storySlug && <p className="vocabulary-results" role="status" aria-live="polite">Tìm thấy {visible.length} từ{visible.length > 0 && ` · Hiển thị ${start + 1}–${Math.min(start + pageSize, visible.length)}`}</p>}
      {vocabularyTabs.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${id}-panel-${item.id}`}
          aria-labelledby={`${id}-tab-${item.id}`}
          tabIndex={0}
          hidden={tab !== item.id}
          className="vocabulary-tab-panel"
        >
          {tab === item.id && (visible.length ? (
            <div className="story-grid">
              {pageWords.map((w) => (
                <WordCard key={w.id} word={w} />
              ))}
            </div>
          ) : (
            <p className="panel empty" role="status">{emptyMessage}</p>
          ))}
        </div>
      ))}
      {!storySlug && <CatalogPagination page={currentPage} pageCount={pageCount} label="Phân trang từ vựng" onChange={number => {
        setPage(number);
        document.getElementById("vocabulary-catalog")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      }} />}
    </div>
  );
}
