"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/library";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import { flashcardKey, shuffled } from "@/lib/flashcards";
import { matchingReady, matchingRounds, recordMatchingWord, uniqueMatchingWords, type MatchingLanguage } from "@/lib/matching";
import { useHydrated } from "@/lib/use-hydrated";
import { ListeningIcon } from "./listening-icon";
import { GameImage } from "./game-image";

type Game = {
  phase: "play" | "result";
  rounds: Word[][];
  round: number;
  bank: Word[];
  matched: string[];
  mistakes: Record<string, number>;
  selected: string | null;
  language: MatchingLanguage;
  practice: boolean;
  startedAt: number;
  finishedAt: number | null;
};
type Feedback = { kind: "correct" | "wrong" | "info"; text: string; target?: string };
const historyKey = (word: Word, language: MatchingLanguage) => `${language}:${flashcardKey(word)}`;
const label = (word: Word, language: MatchingLanguage) => language === "en" ? word.word_en : word.word_vi;
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function MatchingGame({ words }: { words: Word[] }) {
  const ready = useHydrated();
  const { data, available } = useDeviceData();
  const [theme, setTheme] = useState("");
  const [story, setStory] = useState("");
  const [source, setSource] = useState("all");
  const [language, setLanguage] = useState<MatchingLanguage>("en");
  const [game, setGame] = useState<Game | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const gameRef = useRef<Game | null>(null);
  const dragged = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const candidates = words.filter(word => matchingReady(word) && (!theme || word.theme_slug === theme) && (!story || word.story_slug === story) && (source !== "favorites" || data.favorites.includes(word.id)));
  const selectedWords = uniqueMatchingWords(candidates);
  const preview = matchingRounds(selectedWords);
  const themes = [...new Map(words.filter(word => word.theme_slug).map(word => [word.theme_slug!, word.theme_title!])).entries()];
  const stories = [...new Map(words.filter(word => !theme || word.theme_slug === theme).map(word => [word.story_slug, word.story_title])).entries()];
  const round = game?.rounds[game.round] ?? [];
  const deck = game?.rounds.flat() ?? [];
  const selectedWord = game?.bank.find(word => word.id === game.selected);
  const missed = deck.filter(word => (game?.mistakes[word.id] ?? 0) > 0);
  const roundDone = !!game && round.every(word => game.matched.includes(word.id));
  const elapsed = game ? Math.max(0, Math.floor(((game.finishedAt ?? clock) - game.startedAt) / 1000)) : 0;
  const phase = game?.phase, roundIndex = game?.round;

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const player = audio.current;
    return () => { player?.pause(); };
  }, [phase, roundIndex]);
  useEffect(() => {
    if (!phase) return;
    heading.current?.focus({ preventScroll: true });
    document.getElementById("matching-game")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [phase, roundIndex]);

  function update(next: Game | null) { gameRef.current = next; setGame(next); }
  function start(pool = candidates, practice = false) {
    const rounds = matchingRounds(shuffled(pool), practice);
    if (!rounds.length) return;
    audio.current?.pause(); dragged.current = null;
    setFeedback(null); setMessage(""); setSaveFailed(false); setHovered(null);
    update({ phase: "play", rounds, round: 0, bank: shuffled(rounds[0]), matched: [], mistakes: {}, selected: null, language, practice, startedAt: clock, finishedAt: null });
  }
  function choose(id: string) {
    const current = gameRef.current;
    if (!current || current.phase !== "play" || current.matched.includes(id) || !current.bank.some(word => word.id === id)) return;
    update({ ...current, selected: current.selected === id ? null : id });
    setFeedback(null);
  }
  function match(wordId: string | null, imageId: string) {
    const current = gameRef.current;
    if (!current || current.phase !== "play") return;
    const word = current.bank.find(word => word.id === wordId);
    if (!word) { setFeedback({ kind: "info", text: "Em chọn một từ ở khay bên dưới, rồi chạm vào hình nhé." }); return; }
    if (!current.rounds[current.round].some(word => word.id === imageId) || current.matched.includes(imageId) || current.matched.includes(word.id)) return;
    if (word.id !== imageId) {
      update({ ...current, selected: word.id, mistakes: { ...current.mistakes, [word.id]: (current.mistakes[word.id] ?? 0) + 1 } });
      setFeedback({ kind: "wrong", target: imageId, text: "Chưa khớp rồi. Em thử ghép từ này với một hình khác nhé!" });
      return;
    }
    const matched = [...current.matched, word.id];
    update({ ...current, matched, selected: null, finishedAt: matched.length === current.rounds.flat().length ? clock : null });
    setFeedback({ kind: "correct", target: imageId, text: `Ghép đúng rồi! ${word.word_en} nghĩa là ${word.word_vi}.` });
    if (!current.practice) {
      try {
        const key = historyKey(word, current.language);
        changeDeviceData(previous => ({ ...previous, matching: { ...previous.matching, [key]: recordMatchingWord(previous.matching[key], current.mistakes[word.id] ?? 0) } }));
      } catch { setSaveFailed(true); setMessage("Em vẫn có thể chơi tiếp. Kết quả chưa được lưu đầy đủ; em kiểm tra quyền lưu dữ liệu hoặc bộ nhớ trình duyệt nhé."); }
    }
    if (current.rounds[current.round].every(word => matched.includes(word.id))) requestAnimationFrame(() => nextButton.current?.focus({ preventScroll: true }));
  }
  function nextRound() {
    const current = gameRef.current;
    if (!current || !current.rounds[current.round].every(word => current.matched.includes(word.id))) return;
    const next = current.round + 1;
    update(next === current.rounds.length ? { ...current, phase: "result" } : { ...current, round: next, bank: shuffled(current.rounds[next]), selected: null });
    setFeedback(null); setHovered(null); dragged.current = null;
  }
  function listen(word: Word) {
    const player = audio.current;
    if (!player || !word.pronunciation_path?.startsWith("/") || word.pronunciation_path.startsWith("//")) return;
    player.pause(); player.src = word.pronunciation_path;
    void player.play().catch(() => setMessage("Chưa phát được âm thanh. Em thử bấm nghe lại nhé."));
  }
  function exit() { audio.current?.pause(); update(null); setFeedback(null); setMessage(""); dragged.current = null; }

  return <section id="matching-game" className="matching-game" aria-labelledby="matching-section-title" onKeyDown={event => {
    if (event.key === "Escape" && gameRef.current) { update({ ...gameRef.current, selected: null }); setFeedback(null); dragged.current = null; setHovered(null); }
  }}>
    <div className="flashcard-breadcrumb"><Link href="/tro-choi">← Khu trò chơi</Link><span>Ghép từ với hình</span></div>
    {!available && <p className="flashcard-notice" role="status">Chưa đọc được dữ liệu thiết bị. Em vẫn có thể chơi; kết quả chưa được lưu trên trình duyệt này.</p>}
    {!game ? <>
      <div className="matching-intro"><span aria-hidden="true">🧩</span><div><h2 id="matching-section-title">Tìm đúng cặp, nhớ thêm từ!</h2><p>Chạm một từ rồi chạm vào hình, hoặc kéo từ vào hình phù hợp.</p></div></div>
      <div className="game-panel matching-setup">
        <div className="matching-setup-heading"><h3>Chọn bộ từ để cùng chơi</h3><span className="matching-duration"><ListeningIcon name="clock" />2–4 phút / lượt</span></div>
        <div className="flashcard-filters">
          <label>Chủ đề<select value={theme} disabled={!ready} onChange={event => { setTheme(event.target.value); setStory(""); }}><option value="">Tất cả chủ đề</option>{themes.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></label>
          <label>Truyện<select value={story} disabled={!ready} onChange={event => setStory(event.target.value)}><option value="">Tất cả truyện</option>{stories.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></label>
          <label>Bộ từ<select value={source} disabled={!ready} onChange={event => setSource(event.target.value)}><option value="all">Tất cả các từ</option><option value="favorites">Từ yêu thích</option></select></label>
          <label>Ngôn ngữ ghép<select value={language} disabled={!ready} onChange={event => setLanguage(event.target.value as MatchingLanguage)}><option value="en">Tiếng Anh với hình</option><option value="vi">Tiếng Việt với hình</option></select></label>
        </div>
        <p className="matching-selection" role="status">Có {selectedWords.length} từ khác nhau phù hợp.{preview.length > 0 && ` Lượt này ghép ${preview.flat().length} cặp trong ${preview.length} vòng.`}</p>
        {selectedWords.length < 2 && <p className="flashcard-empty">{source === "favorites" ? <>Cần ít nhất hai từ khác nhau để ghép. Em có thể lưu thêm từ tại <Link href="/tu-vung">Góc từ vựng</Link> hoặc chọn bộ rộng hơn nhé!</> : "Cần ít nhất hai từ có hình khác nhau. Em chọn thêm chủ đề hoặc chọn tất cả truyện nhé!"}</p>}
        <button type="button" className="button matching-start" disabled={!ready || !preview.length} onClick={() => start()}><ListeningIcon name="image" />Bắt đầu chơi<ListeningIcon name="arrow-right" /></button>
        <div className="flashcard-howto"><h3>Cùng chơi từng bước</h3><ol><li>Chọn một từ ở khay.</li><li>Tìm hình phù hợp để ghép.</li><li>Ghép hết các cặp rồi sang vòng mới.</li></ol><p>Em có thể nghe phát âm tiếng Anh ở mỗi từ. Cứ chơi theo nhịp của mình nhé!</p></div>
      </div>
    </> : game.phase === "result" ? <div className="game-panel matching-results">
      <span className="flashcard-result-art" aria-hidden="true">🌻</span><h2 ref={heading} tabIndex={-1} id="matching-section-title">Em đã tìm được những cặp từ!</h2>
      <p>{game.practice ? `Em đã luyện lại ${deck.length} từ. Cùng gặp thêm những từ mới nhé!` : <>Hoàn thành <strong>{deck.length} cặp</strong>, có <strong>{deck.length - missed.length}/{deck.length}</strong> cặp đúng ngay lần đầu.</>}</p>
      <div className="matching-result-stats"><span><ListeningIcon name="check" />{game.rounds.length} vòng hoàn thành</span><span><ListeningIcon name="clock" />{duration(elapsed)}</span><span>{game.language === "en" ? "Tiếng Anh với hình" : "Tiếng Việt với hình"}</span></div>
      {available && !saveFailed && !game.practice && <p className="flashcard-saved"><ListeningIcon name="check" />Đã lưu kết quả ghép từ trên thiết bị này.</p>}
      <div className="flashcard-review-list">{deck.map(word => <div className="flashcard-review-row" key={word.id}><GameImage src={word.illustration_path!} alt="" width={56} height={56} /><div><strong>{word.word_vi} · <span lang="en">{word.word_en}</span></strong><span>{(game.mistakes[word.id] ?? 0) > 0 ? "Đã ghép được · Cùng luyện thêm nhé" : "Ghép đúng ngay lần đầu"}</span></div><ListeningIcon name={(game.mistakes[word.id] ?? 0) > 0 ? "replay" : "check"} /></div>)}</div>
      <div className="matching-actions">{missed.length > 0 && <button type="button" className="button" onClick={() => start(missed, true)}><ListeningIcon name="replay" />Luyện lại từ sai</button>}<button type="button" className="button secondary" onClick={() => start()}>Chơi lượt mới</button><Link href="/tro-choi" className="button secondary">Về Khu trò chơi</Link></div>
      <button type="button" className="matching-change-set" onClick={exit}>Chọn bộ từ khác</button>
    </div> : <div className="game-panel matching-play">
      <div className="matching-play-heading"><div><span className="game-category">{game.practice ? "CÙNG LUYỆN LẠI TỪ KHÓ" : "MỖI TỪ ĐỀU CÓ MỘT NGƯỜI BẠN"}</span><h2 ref={heading} tabIndex={-1} id="matching-section-title">Cùng ghép từ với hình!</h2></div><button type="button" className="flashcard-end" onClick={exit}>Chọn bộ khác</button></div>
      <div className="matching-progress"><span>Vòng {game.round + 1}/{game.rounds.length}</span><span>Đã ghép {game.matched.length}/{deck.length} cặp</span><span aria-label="Thời gian đã chơi"><ListeningIcon name="clock" />{duration(elapsed)}</span></div>
      <progress aria-label="Tiến độ ghép cặp" max={deck.length} value={game.matched.length} />
      <p id="matching-instructions" className="matching-instructions">Chọn từ ở khay bên dưới, rồi chạm hoặc kéo vào hình phù hợp.</p>
      <div className="matching-board" role="group" aria-label="Các hình để ghép" aria-describedby="matching-instructions">{round.map((word, index) => {
        const matched = game.matched.includes(word.id);
        return <button type="button" key={word.id} className={`matching-tile${matched ? " is-matched" : ""}${hovered === word.id && !matched ? " is-over" : ""}${feedback?.kind === "wrong" && feedback.target === word.id ? " is-wrong" : ""}`} aria-label={`Hình ${index + 1}${matched ? `, đã ghép ${label(word, game.language)}` : ""}`} disabled={matched} onClick={() => match(gameRef.current?.selected ?? null, word.id)} onDragOver={event => { if (dragged.current && !matched) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setHovered(word.id); } }} onDragLeave={() => setHovered(null)} onDrop={event => {
          event.preventDefault(); const id = dragged.current; dragged.current = null; setHovered(null);
          if (id && event.dataTransfer.getData("text/plain") === id) match(id, word.id);
        }}>
          <span className="matching-tile-number" aria-hidden="true">{index + 1}</span><GameImage src={word.illustration_path!} alt={`Hình để ghép số ${index + 1}`} width={420} height={280} loading="eager" onError={() => setMessage("Một hình chưa tải được. Em thử tải lại trang để chơi với đủ hình nhé.")} />
          <span className="matching-slot">{matched ? <><ListeningIcon name="check" /><span lang={game.language}>{label(word, game.language)}</span></> : "Ghép từ vào đây"}</span>
        </button>;
      })}</div>
      <div className="matching-bank-heading"><h3>Khay từ của em</h3><span>{game.language === "en" ? "Tiếng Anh" : "Tiếng Việt"}</span></div>
      <div className="matching-bank" role="group" aria-label="Các từ để ghép">{game.bank.map(word => {
        const matched = game.matched.includes(word.id), playable = !!word.pronunciation_path?.startsWith("/") && !word.pronunciation_path.startsWith("//");
        return <div className={`matching-word${matched ? " is-matched" : ""}${game.selected === word.id ? " is-selected" : ""}`} key={word.id}>
          <button type="button" className="matching-word-select" aria-pressed={game.selected === word.id} disabled={matched} draggable={!matched} onClick={() => choose(word.id)} onDragStart={event => {
            const current = gameRef.current;
            if (!current || current.matched.includes(word.id)) { event.preventDefault(); return; }
            event.dataTransfer.setData("text/plain", word.id); event.dataTransfer.effectAllowed = "move"; dragged.current = word.id;
            update({ ...current, selected: word.id }); setFeedback(null);
          }} onDragEnd={() => { dragged.current = null; setHovered(null); }}><span lang={game.language}>{label(word, game.language)}</span>{matched && <ListeningIcon name="check" />}</button>
          {playable && <button type="button" className="matching-word-audio" aria-label={`Nghe tiếng Anh: ${word.word_en}`} onClick={() => listen(word)}><ListeningIcon name="volume" /></button>}
        </div>;
      })}</div>
      <div className={`matching-feedback${feedback ? ` is-${feedback.kind}` : ""}`} role="status">{feedback ? <>{feedback.kind === "correct" && <ListeningIcon name="check" />}{feedback.text}</> : selectedWord ? <>Đang chọn: <strong lang={game.language}>{label(selectedWord, game.language)}</strong>. Em tìm hình phù hợp nhé!</> : "Em chọn một từ để bắt đầu ghép nhé."}</div>
      {roundDone && <div className="matching-round-end"><p>Em đã ghép đủ các cặp trong vòng này!</p><button ref={nextButton} type="button" className="button" onClick={nextRound}>{game.round + 1 === game.rounds.length ? "Xem kết quả" : "Vòng tiếp theo"}<ListeningIcon name="arrow-right" /></button></div>}
    </div>}
    <audio ref={audio} preload="none" onError={() => setMessage("Chưa tải được phát âm. Em vẫn có thể ghép từ bằng cách đọc nhé!")} />
    <p className="flashcard-message" role="status">{message}</p>
    <p className="games-device-note"><ListeningIcon name="info" />Kết quả ghép từ lưu riêng trên trình duyệt này. <Link href="/hanh-trinh">Tải hoặc khôi phục bản sao</Link> để giữ lại tiến độ.</p>
  </section>;
}
