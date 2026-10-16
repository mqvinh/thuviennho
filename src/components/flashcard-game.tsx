"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/library";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import { dueWords, flashcardKey, flashcardReady, learningDeck, pictureOptions, reviewWord } from "@/lib/flashcards";
import { useHydrated } from "@/lib/use-hydrated";
import { ListeningIcon } from "./listening-icon";
import { GameImage } from "./game-image";
import { recordDailyWord } from "@/lib/daily-learning";

type Session = {
  phase: "study" | "quiz" | "result";
  deck: Word[];
  index: number;
  flipped: boolean;
  queue: { word: Word; retry: boolean }[];
  options: Word[];
  choice: string | null;
  results: Record<string, boolean>;
};

export function FlashcardGame({ words }: { words: Word[] }) {
  const ready = useHydrated();
  const { data, available } = useDeviceData();
  const [now, setNow] = useState(() => Date.now());
  const [theme, setTheme] = useState("");
  const [story, setStory] = useState("");
  const [source, setSource] = useState("all");
  const [size, setSize] = useState(10);
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const answerLock = useRef(false);
  const pool = words.filter(flashcardReady);
  const themes = [...new Map(words.filter(word => word.theme_slug).map(word => [word.theme_slug!, word.theme_title!])).entries()];
  const stories = [...new Map(words.filter(word => !theme || word.theme_slug === theme).map(word => [word.story_slug, word.story_title])).entries()];
  const scoped = pool.filter(word => (!theme || word.theme_slug === theme) && (!story || word.story_slug === story));
  const due = dueWords(scoped, data.flashcards, now);
  const selected = source === "favorites" ? scoped.filter(word => data.favorites.includes(word.id)) : source === "due" ? due : scoped;
  const current = session?.phase === "study" ? session.deck[session.index] : session?.queue[session.index]?.word;
  const correctCount = Object.values(session?.results ?? {}).filter(Boolean).length;
  const missed = session?.deck.filter(word => session.results[flashcardKey(word)] === false) ?? [];
  const phase = session?.phase, questionIndex = session?.index;
  const studyOnly = session?.phase === "result" && !Object.keys(session.results).length;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const player = audio.current;
    return () => { player?.pause(); };
  }, [current?.id, session?.phase]);
  useEffect(() => {
    if (!phase) return;
    title.current?.focus({ preventScroll: true });
    document.getElementById("flashcard-game")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [phase, questionIndex]);

  function start(candidates = selected) {
    const time = now;
    const deck = learningDeck(candidates, data.flashcards, size, time);
    if (!deck.length) return;
    answerLock.current = false;
    setMessage(""); setSaveFailed(false);
    setSession({ phase: "study", deck, index: 0, flipped: false, queue: deck.map(word => ({ word, retry: false })), options: [], choice: null, results: {} });
  }
  function quiz() {
    if (!session) return;
    answerLock.current = false;
    setSession({ ...session, phase: "quiz", index: 0, options: pictureOptions(session.deck[0], pool), choice: null });
  }
  function answer(word: Word) {
    if (!session || !current || session.choice || answerLock.current) return;
    answerLock.current = true;
    const correct = word.id === current.id;
    const retry = session.queue[session.index].retry;
    setMessage("");
    if (!retry) {
      try {
        changeDeviceData(previous => recordDailyWord({ ...previous, flashcards: { ...previous.flashcards, [flashcardKey(current)]: reviewWord(previous.flashcards[flashcardKey(current)], correct) } }, flashcardKey(current)));
      } catch { setSaveFailed(true); setMessage("Lượt chơi vẫn tiếp tục, nhưng chưa lưu được lịch ôn. Em kiểm tra quyền lưu dữ liệu của trình duyệt nhé."); }
    }
    setSession({ ...session, choice: word.id, results: retry ? session.results : { ...session.results, [flashcardKey(current)]: correct }, queue: !correct && !retry ? [...session.queue, { word: current, retry: true }] : session.queue });
    requestAnimationFrame(() => nextButton.current?.focus({ preventScroll: true }));
  }
  function nextQuestion() {
    if (!session || !session.choice) return;
    answerLock.current = false;
    const index = session.index + 1;
    setSession(index === session.queue.length ? { ...session, phase: "result" } : { ...session, index, choice: null, options: pictureOptions(session.queue[index].word, pool) });
  }
  function listen() {
    setMessage("");
    void audio.current?.play().catch(() => setMessage("Chưa phát được âm thanh. Em bấm nghe lại hoặc thử tải lại trang nhé!"));
  }
  const listenButton = <button type="button" className="button secondary flashcard-listen" onClick={listen}><ListeningIcon name="volume" />Nghe phát âm</button>;

  return <section id="flashcard-game" className="flashcard-game" aria-labelledby="flashcard-section-title">
    <div className="flashcard-breadcrumb"><Link href="/tro-choi">← Khu trò chơi</Link><span>Flashcard từ vựng</span></div>
    {!available && <p className="flashcard-notice" role="status">Trình duyệt chưa cho phép lưu dữ liệu. Em vẫn có thể chơi; lịch ôn chưa được lưu trên thiết bị.</p>}
    {!session ? <>
      <div className="flashcard-overview"><article><ListeningIcon name="sprout" /><strong>{pool.length}</strong><span>Từ có hình và audio</span></article><article><ListeningIcon name="calendar" /><strong>{dueWords(pool, data.flashcards, now).length}</strong><span>Từ đến lịch ôn hôm nay</span></article><article><ListeningIcon name="check" /><strong>{pool.filter(word => data.flashcards[flashcardKey(word)]?.streak > 0).length}</strong><span>Từ đã trả lời đúng</span></article></div>
      <div className="flashcard-setup game-panel"><h2 id="flashcard-section-title">Hôm nay, em muốn học bộ từ nào?</h2><p>Từ đến lịch ôn được ưu tiên. Mỗi lượt tối đa {size} từ, vừa sức để nhớ lâu hơn.</p>
        <div className="flashcard-filters">
          <label>Chủ đề<select value={theme} disabled={!ready} onChange={event => { setTheme(event.target.value); setStory(""); }}><option value="">Tất cả chủ đề</option>{themes.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></label>
          <label>Truyện<select value={story} disabled={!ready} onChange={event => setStory(event.target.value)}><option value="">Tất cả truyện</option>{stories.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></label>
          <label>Bộ từ<select value={source} disabled={!ready} onChange={event => setSource(event.target.value)}><option value="all">Tất cả các từ</option><option value="favorites">Từ yêu thích</option><option value="due">Đến lịch ôn</option></select></label>
          <label>Số từ mỗi lượt<select value={size} disabled={!ready} onChange={event => setSize(Number(event.target.value))}>{[5, 10, 20].map(value => <option value={value} key={value}>{value} từ</option>)}</select></label>
        </div>
        <p className="flashcard-selection" role="status">Có {selected.length} từ phù hợp{selected.length > 0 && ` · Lượt này học ${Math.min(size, selected.length)} từ`}.</p>
        {!selected.length && <p className="flashcard-empty">{source === "favorites" ? <>Em chưa có từ yêu thích phù hợp. Ghé <Link href="/tu-vung">Góc từ vựng</Link> để lưu từ, hoặc chọn bộ “Tất cả các từ” nhé!</> : source === "due" ? "Chưa có từ đến lịch ôn trong bộ này. Em có thể khám phá thêm từ mới hoặc quay lại vào ngày hẹn." : "Bộ từ này chưa có đủ hình và audio. Em chọn truyện khác hoặc quay lại sau nhé!"}</p>}
        <button type="button" className="button flashcard-start" disabled={!ready || !selected.length} onClick={() => start()}><ListeningIcon name="star" />Bắt đầu học</button>
        <div className="flashcard-howto"><h3>Chơi như thế nào?</h3><ol><li>Lật thẻ và nghe phát âm.</li><li>Chọn hình đúng với từ tiếng Anh.</li><li>Ôn lại từ khó và xem lịch hẹn lần sau.</li></ol></div>
      </div>
    </> : session.phase === "result" ? <div className="flashcard-results game-panel">
      <span className="flashcard-result-art" aria-hidden="true">🌟</span><h2 ref={title} tabIndex={-1} id="flashcard-section-title">Một lượt khám phá thật đáng quý!</h2>{studyOnly ? <p>Em đã xem {session.deck.length} thẻ. Kho từ cần ít nhất ba hình khác nhau để mở phần chọn hình đúng; lịch ôn sẽ bắt đầu sau lượt thử tài.</p> : <p>Em trả lời đúng <strong>{correctCount}/{session.deck.length}</strong> từ ở lần đầu. Những câu luyện lại giúp em nhớ thêm một chút.</p>}
      {available && !saveFailed && !studyOnly && <p className="flashcard-saved"><ListeningIcon name="check" />Lịch ôn đã được lưu trên thiết bị này.</p>}
      {saveFailed && <p role="status">Lịch ôn chưa được lưu đầy đủ. Em kiểm tra bộ nhớ trình duyệt rồi thử lại nhé.</p>}
      <div className="flashcard-review-list">{session.deck.map(word => {
        const progress = data.flashcards[flashcardKey(word)];
        return <div className="flashcard-review-row" key={word.id}><GameImage src={word.illustration_path!} alt="" width={56} height={56} /><div><strong>{word.word_vi} · <span lang="en">{word.word_en}</span></strong><span>{studyOnly ? "Đã xem thẻ" : session.results[flashcardKey(word)] ? "Đã trả lời đúng" : "Cần luyện thêm"}{progress && ` · Ôn ngày ${new Date(progress.dueAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`}</span></div><ListeningIcon name={session.results[flashcardKey(word)] ? "check" : "replay"} /></div>;
      })}</div>
      <div className="flashcard-actions">{missed.length > 0 && <button type="button" className="button" onClick={() => start(missed)}><ListeningIcon name="replay" />Ôn từ cần luyện thêm</button>}<button type="button" className="button secondary" onClick={() => { setSession(null); setMessage(""); }}>Chọn bộ từ khác</button><Link className="button secondary" href="/tro-choi">Về Khu trò chơi</Link></div>
    </div> : current && <div className="flashcard-play game-panel">
      <div className="flashcard-play-heading"><div><span className="game-category">{session.phase === "study" ? "BƯỚC 1 · LẬT THẺ" : session.queue[session.index].retry ? "CÙNG LUYỆN LẠI TỪ KHÓ" : "BƯỚC 2 · CHỌN HÌNH ĐÚNG"}</span><h2 ref={title} tabIndex={-1} id="flashcard-section-title">{session.phase === "study" ? "Cùng khám phá từ mới!" : "Hình nào đúng với từ này?"}</h2></div><button type="button" className="flashcard-end" onClick={() => { setSession(null); setMessage(""); }}>Chọn bộ khác</button></div>
      <div className="flashcard-progress-label"><span>{session.phase === "study" ? `Thẻ ${session.index + 1}/${session.deck.length}` : `Câu ${session.index + 1}/${session.queue.length}`}</span><span>{session.phase === "study" ? current.story_title : "Em có thể bấm nghe nhiều lần"}</span></div>
      <progress aria-label={session.phase === "study" ? "Tiến độ xem thẻ" : "Tiến độ thử tài"} max={session.phase === "study" ? session.deck.length : session.queue.length} value={session.index + 1} />
      {session.phase === "study" ? <>
        <button type="button" className={`flashcard-flip${session.flipped ? " is-flipped" : ""}`} aria-label={session.flipped ? "Xem mặt trước thẻ" : "Lật thẻ xem tiếng Anh"} aria-pressed={session.flipped} onClick={() => setSession({ ...session, flipped: !session.flipped })}>
          <span className="flashcard-flip-inner"><span className="flashcard-face flashcard-front" aria-hidden={session.flipped}><GameImage src={current.illustration_path!} alt={`Minh họa từ ${current.word_vi}`} width={600} height={400} loading="eager" /><strong>{current.word_vi}</strong><span>Chạm để lật thẻ ↻</span></span><span className="flashcard-face flashcard-back" aria-hidden={!session.flipped}><span className="flashcard-back-icon" aria-hidden="true">🌱</span><strong lang="en">{current.word_en}</strong><span className="flashcard-back-vi">{current.word_vi}</span><span>{current.meaning_vi}</span><em>{current.example_vi}</em><span>Chạm để xem lại hình ↻</span></span></span>
        </button>
        <div className="flashcard-actions">{listenButton}<button type="button" className="button" onClick={() => {
          if (session.index + 1 < session.deck.length) setSession({ ...session, index: session.index + 1, flipped: false });
          else if (pictureOptions(session.deck[0], pool).length >= 3) quiz();
          else setSession({ ...session, phase: "result" });
        }}>{session.index + 1 < session.deck.length ? "Thẻ tiếp theo" : "Bắt đầu thử tài"}<ListeningIcon name="arrow-right" /></button></div>
      </> : <>
        <div className="flashcard-prompt"><strong lang="en">{current.word_en}</strong>{listenButton}</div>
        <div className="flashcard-options" role="group" aria-label="Chọn hình đúng">{session.options.map((word, index) => <button type="button" className="flashcard-option" key={word.id} disabled={!!session.choice} aria-label={`Hình ${index + 1}`} aria-pressed={session.choice === word.id} data-result={session.choice ? word.id === current.id ? "correct" : word.id === session.choice ? "wrong" : undefined : undefined} onClick={() => answer(word)}><GameImage src={word.illustration_path!} alt={`Hình lựa chọn ${index + 1}`} width={360} height={240} loading="eager" /><span className="flashcard-option-number">{index + 1}</span>{session.choice && word.id === current.id && <span className="flashcard-answer-label"><ListeningIcon name="check" />{word.word_vi}</span>}</button>)}</div>
        {session.choice && <div className="flashcard-feedback" role="status"><strong>{session.choice === current.id ? "Đúng rồi, em giỏi lắm!" : `Cùng nhớ nhé: ${current.word_en} nghĩa là ${current.word_vi}.`}</strong><p>{current.meaning_vi} {session.choice !== current.id && "Từ này sẽ được luyện lại trong lượt chơi."}</p><button ref={nextButton} type="button" className="button" onClick={nextQuestion}>{session.index + 1 === session.queue.length ? "Xem kết quả" : "Câu tiếp theo"}<ListeningIcon name="arrow-right" /></button></div>}
      </>}
    </div>}
    <audio ref={audio} src={current?.pronunciation_path || undefined} preload="none" onError={() => setMessage("Chưa tải được phát âm. Em vẫn có thể chơi bằng cách đọc từ nhé!")} />
    <p className="flashcard-message" role="status">{message}</p>
    <p className="games-device-note"><ListeningIcon name="lock" />Lịch ôn lưu trên trình duyệt này. <Link href="/hanh-trinh">Tải hoặc khôi phục bản sao</Link> để mang tiến độ sang thiết bị khác.</p>
  </section>;
}
