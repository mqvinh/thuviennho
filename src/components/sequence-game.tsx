"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import { placeSequenceCard, recordSequenceGame, sequenceStars, shuffledSequence, type SequenceCard, type SequenceStory } from "@/lib/sequencing";
import { useHydrated } from "@/lib/use-hydrated";
import { GameImage } from "./game-image";
import { ListeningIcon } from "./listening-icon";

type Game = {
  story: SequenceStory; deck: SequenceCard[]; slots: (string | null)[]; locked: boolean[];
  selected: string | null; checked: boolean; attempts: number; hinted: number[]; phase: "play" | "result";
};
const position = (index: number, count: number) => index === 0 ? "Đầu tiên" : index === count - 1 ? "Cuối cùng" : "Tiếp theo";

export function SequenceGame({ stories }: { stories: SequenceStory[] }) {
  const ready = useHydrated(), { data, available } = useDeviceData();
  const [theme, setTheme] = useState(""), [scope, setScope] = useState("all");
  const [game, setGame] = useState<Game | null>(null), current = useRef<Game | null>(null);
  const [message, setMessage] = useState(""), [hint, setHint] = useState("");
  const [saved, setSaved] = useState(false), [replay, setReplay] = useState(0);
  const dragged = useRef<string | null>(null), [over, setOver] = useState<number | null>(null);
  const player = useRef<HTMLAudioElement>(null), speech = useRef<SpeechSynthesisUtterance | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const themes = [...new Map(stories.filter(s => s.theme_slug).map(s => [s.theme_slug!, s.theme_vi])).entries()];
  const filtered = stories.filter(s => (!theme || s.theme_slug === theme) && (scope !== "read" || data.started[s.slug] || data.finished[s.slug]));
  const phase = game?.phase;

  useEffect(() => {
    const audio = player.current;
    return () => { audio?.pause(); if (speech.current) { speech.current = null; window.speechSynthesis?.cancel(); } };
  }, []);
  useEffect(() => {
    if (!phase) return;
    heading.current?.focus({ preventScroll: true });
    document.getElementById("sequence-game")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [phase]);

  function update(next: Game | null) { current.current = next; setGame(next); }
  function stopAudio() {
    player.current?.pause();
    if (speech.current) { speech.current = null; window.speechSynthesis?.cancel(); }
  }
  function start(story: SequenceStory) {
    stopAudio(); setMessage(""); setHint(""); setSaved(false); setOver(null); dragged.current = null;
    update({ story, deck: shuffledSequence(story.sequence_cards), slots: story.sequence_cards.map(() => null), locked: story.sequence_cards.map(() => false), selected: null, checked: false, attempts: 0, hinted: [], phase: "play" });
  }
  function choose(id: string) {
    const active = current.current;
    if (!active || active.phase !== "play" || !active.deck.some(card => card.id === id)) return;
    const index = active.slots.indexOf(id);
    if (index >= 0 && active.locked[index]) return;
    update({ ...active, selected: active.selected === id ? null : id });
    if (index < 0 && active.selected !== id && window.matchMedia("(max-width: 600px)").matches) document.querySelector(".sequence-slots")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  function place(id: string | null, index: number) {
    const active = current.current;
    if (!active || active.phase !== "play" || !id || !active.deck.some(card => card.id === id)) return;
    const slots = placeSequenceCard(active.slots, id, index, active.locked);
    if (slots === active.slots) return;
    update({ ...active, slots, selected: null, checked: false }); setHint("");
  }
  function remove(index: number) {
    const active = current.current;
    if (!active || active.phase !== "play" || active.locked[index]) return;
    update({ ...active, slots: active.slots.map((id, i) => i === index ? null : id), selected: null, checked: false });
  }
  function check() {
    const active = current.current;
    if (!active || active.phase !== "play" || active.slots.some(id => !id)) return;
    const locked = active.story.sequence_cards.map((card, i) => card.id === active.slots[i]), attempts = active.attempts + 1;
    const complete = locked.every(Boolean);
    update({ ...active, locked, attempts, selected: null, checked: true, phase: complete ? "result" : "play" });
    setHint("");
    if (complete) {
      stopAudio();
      try {
        changeDeviceData(previous => ({ ...previous, sequencing: { ...previous.sequencing, [active.story.slug]: recordSequenceGame(previous.sequencing[active.story.slug], attempts, active.hinted.length) } }));
        setSaved(true);
      } catch { setMessage("Em đã hoàn thành! Kết quả chưa lưu được; em kiểm tra quyền lưu dữ liệu hoặc bộ nhớ trình duyệt nhé."); }
    }
  }
  function giveHint() {
    const active = current.current;
    if (!active || active.phase !== "play") return;
    let index = active.locked.findIndex((locked, i) => !locked && !active.hinted.includes(i));
    if (index < 0) index = active.locked.findIndex(locked => !locked);
    if (index < 0) return;
    setHint(`Gợi ý cho vị trí ${index + 1}: ${active.story.sequence_cards[index].hint_vi}`);
    if (!active.hinted.includes(index)) update({ ...active, hinted: [...active.hinted, index] });
  }
  function listen(card: SequenceCard) {
    stopAudio(); setMessage("");
    if (card.audio_path && player.current) {
      player.current.src = card.audio_path;
      void player.current.play().catch(() => setMessage("Chưa phát được audio. Em thử nghe lại nhé."));
    } else if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(card.text_vi);
      utterance.lang = "vi-VN"; utterance.rate = .85;
      const voice = window.speechSynthesis.getVoices().find(voice => /^vi(?:-|_)/i.test(voice.lang));
      if (voice) utterance.voice = voice;
      speech.current = utterance;
      utterance.onend = () => { if (speech.current === utterance) speech.current = null; };
      utterance.onerror = () => { if (speech.current === utterance) { speech.current = null; setMessage("Thiết bị chưa đọc được tiếng Việt. Em có thể đọc mô tả trên thẻ nhé."); } };
      window.speechSynthesis.speak(utterance);
    } else setMessage("Thiết bị này chưa hỗ trợ giọng đọc. Em có thể đọc mô tả trên thẻ nhé.");
  }
  function exit() { stopAudio(); update(null); setMessage(""); setHint(""); dragged.current = null; }
  const audioButton = (card: SequenceCard) => <button type="button" className="sequence-audio" aria-label={`Nghe mô tả: ${card.text_vi}`} onClick={() => listen(card)}><ListeningIcon name="volume" /></button>;
  const cardView = (card: SequenceCard, locked = false) => <article className={`sequence-card${game?.selected === card.id ? " is-selected" : ""}${locked ? " is-locked" : ""}`}>
    <button type="button" className="sequence-card-select" disabled={locked} aria-label={`Chọn tranh: ${card.text_vi}`} aria-pressed={game?.selected === card.id} draggable={!locked}
      onClick={() => choose(card.id)} onDragStart={event => {
        const active = current.current;
        if (!active || active.phase !== "play" || (active.slots.indexOf(card.id) >= 0 && active.locked[active.slots.indexOf(card.id)])) { event.preventDefault(); return; }
        dragged.current = card.id; event.dataTransfer.setData("text/plain", card.id); event.dataTransfer.effectAllowed = "move";
        update({ ...active, selected: card.id });
      }} onDragEnd={() => { dragged.current = null; setOver(null); }}>
      <GameImage src={card.image_path} alt="Tranh minh họa sự việc" width={420} height={280} loading="eager" />
      <span className="sequence-caption">{card.text_vi}</span>
    </button>
    <div className="sequence-card-tools"><span>{locked ? <><ListeningIcon name="check" />Đúng vị trí</> : "Chạm để chọn"}</span>{audioButton(card)}</div>
  </article>;

  return <section id="sequence-game" className="sequence-game" aria-labelledby="sequence-title" onKeyDown={event => {
    if (event.key === "Escape" && current.current) { update({ ...current.current, selected: null }); dragged.current = null; setOver(null); }
  }}>
    <div className="flashcard-breadcrumb"><Link href="/tro-choi">← Khu trò chơi</Link><span>Xếp tranh kể chuyện</span></div>
    {!available && <p className="flashcard-notice" role="status">Em vẫn có thể chơi. Trình duyệt này chưa cho phép lưu kết quả.</p>}
    {!game ? <>
      <div className="matching-intro"><span aria-hidden="true">📚</span><div><h2 id="sequence-title">Chuyện gì xảy ra trước nhỉ?</h2><p>Chọn một truyện, xếp các tranh rồi cùng kể lại câu chuyện theo cách của em.</p></div></div>
      <div className="game-panel sequence-setup"><div className="matching-setup-heading"><h3>Chọn câu chuyện để chơi</h3><span className="matching-duration"><ListeningIcon name="clock" />3–5 phút / lượt</span></div>
        <div className="flashcard-filters"><label>Chủ đề<select disabled={!ready} value={theme} onChange={e => setTheme(e.target.value)}><option value="">Tất cả chủ đề</option>{themes.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}</select></label><label>Bộ truyện<select disabled={!ready} value={scope} onChange={e => setScope(e.target.value)}><option value="all">Tất cả truyện có bộ tranh</option><option value="read">Truyện em đã mở đọc/nghe</option></select></label></div>
        {!filtered.length && <p className="flashcard-empty">Chưa có bộ tranh phù hợp. Em chọn bộ rộng hơn hoặc ghé <Link href="/">Tủ sách</Link> khám phá truyện trước nhé!</p>}
        <div className="sequence-story-grid">{filtered.map(story => <article className="sequence-story" key={story.slug}>
          <GameImage src={story.cover_image_path || story.sequence_cards[0].image_path} alt={`Bộ tranh ${story.title_vi}`} width={480} height={300} />
          <div className="sequence-story-body"><span className="game-category">{story.theme_vi} · {story.sequence_cards.length} tranh</span><h3>{story.title_vi}</h3>
            {data.sequencing[story.slug] && <span className="sequence-best" aria-label={`Kết quả tốt nhất: ${data.sequencing[story.slug].bestStars} sao`}>{"★".repeat(data.sequencing[story.slug].bestStars)} · Thành tích tốt nhất</span>}
            <div className="sequence-story-actions"><button type="button" className="button" disabled={!ready} onClick={() => start(story)}>Chơi ngay<ListeningIcon name="arrow-right" /></button><Link href={`/doc/${story.slug}`}>Đọc lại truyện</Link></div>
          </div></article>)}</div>
        <div className="flashcard-howto"><h3>Cùng chơi từng bước</h3><ol><li>Chọn tranh rồi chạm vào vị trí, hoặc kéo thả.</li><li>Xếp đủ tranh rồi bấm kiểm tra.</li><li>Đổi các tranh chưa đúng và kể lại câu chuyện.</li></ol><p>3 sao: đúng lần đầu, không gợi ý. 2 sao: tối đa 3 lần kiểm tra và 1 gợi ý. Những lượt còn lại nhận 1 sao vì đã kiên trì hoàn thành!</p></div>
      </div>
    </> : game.phase === "result" ? <div className="game-panel sequence-results">
      <div className="sequence-stars" role="img" aria-label={`${sequenceStars(game.attempts, game.hinted.length)} trên 3 sao`}>{[1, 2, 3].map(star => <span key={star} className={star <= sequenceStars(game.attempts, game.hinted.length) ? "is-earned" : ""} aria-hidden="true">★</span>)}</div>
      <h2 id="sequence-title" ref={heading} tabIndex={-1}>Em đã kể lại câu chuyện rồi!</h2><p><strong>{game.story.title_vi}</strong> · {game.attempts} lần kiểm tra · {game.hinted.length} gợi ý</p>
      {saved && <p className="flashcard-saved"><ListeningIcon name="check" />Đã lưu kết quả xếp tranh trên thiết bị này.</p>}
      <h3>Cùng nhìn lại từng sự việc</h3><div className="sequence-timeline" key={replay}>{game.story.sequence_cards.map((card, index) => <article className="sequence-reveal" key={card.id} style={{ "--reveal-delay": `${index * 260}ms` } as CSSProperties}>
        <span className="sequence-position">{index + 1}. {position(index, game.story.sequence_cards.length)}</span><GameImage src={card.image_path} alt="Tranh minh họa sự việc" width={420} height={280} /><div className="sequence-timeline-caption"><p>{card.text_vi}</p>{audioButton(card)}</div>
      </article>)}</div>
      <div className="matching-actions"><button type="button" className="button secondary" onClick={() => setReplay(value => value + 1)}><ListeningIcon name="replay" />Xem lại diễn biến</button><button type="button" className="button" onClick={() => start(game.story)}>Chơi lại</button><button type="button" className="button secondary" onClick={exit}>Chọn truyện khác</button></div>
      <p className="sequence-family-tip">Cùng người thân kể lại nhé: Vì sao sự việc này xảy ra trước? Em thích đoạn nào nhất?</p>
    </div> : <div className="game-panel sequence-play">
      <div className="matching-play-heading"><div><span className="game-category">MỖI BỨC TRANH LÀ MỘT PHẦN CÂU CHUYỆN</span><h2 id="sequence-title" ref={heading} tabIndex={-1}>{game.story.title_vi}</h2></div><button type="button" className="flashcard-end" onClick={exit}>Chọn truyện khác</button></div>
      <div className="matching-progress"><span>Đã đặt {game.slots.filter(Boolean).length}/{game.deck.length} tranh</span><span>{game.attempts} lần kiểm tra</span><span>{game.hinted.length} gợi ý</span></div>
      <p id="sequence-instructions" className="sequence-instructions">Chọn một tranh bên dưới rồi chạm vào vị trí. Em cũng có thể kéo thả hoặc chọn tranh đã đặt để đổi chỗ.</p>
      <div className="sequence-slots" role="group" aria-label="Các vị trí trong câu chuyện" aria-describedby="sequence-instructions">{game.slots.map((id, index) => {
        const card = game.deck.find(card => card.id === id), locked = game.locked[index];
        return <div key={index} className={`sequence-slot${locked ? " is-correct" : game.checked && id ? " is-wrong" : ""}${over === index ? " is-over" : ""}`} onDragOver={event => { if (dragged.current && !locked) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(index); } }} onDragLeave={() => setOver(null)} onDrop={event => {
          event.preventDefault(); const draggedId = dragged.current; dragged.current = null; setOver(null);
          if (draggedId && event.dataTransfer.getData("text/plain") === draggedId) place(draggedId, index);
        }}>
          <button type="button" className="sequence-slot-target" disabled={locked || !game.selected} aria-label={`Đặt tranh vào vị trí ${index + 1}: ${position(index, game.deck.length)}`} onClick={() => place(current.current?.selected ?? null, index)}><span>{index + 1}</span>{position(index, game.deck.length)}{locked && <ListeningIcon name="check" />}</button>
          {card ? <>{cardView(card, locked)}{!locked && <button type="button" className="sequence-remove" aria-label={`Lấy tranh khỏi vị trí ${index + 1}`} onClick={() => remove(index)}>Lấy tranh ra</button>}</> : <button type="button" className="sequence-empty-slot" disabled={!game.selected} onClick={() => place(current.current?.selected ?? null, index)} aria-label={`Ô trống vị trí ${index + 1}`}><ListeningIcon name="image" /><span>Đặt tranh vào đây</span></button>}
        </div>;
      })}</div>
      <div className="sequence-feedback" role="status">{game.checked ? `Đã đúng ${game.locked.filter(Boolean).length}/${game.deck.length} vị trí. Em giữ các tranh xanh và đổi chỗ những tranh còn lại nhé!` : game.selected ? "Đã chọn tranh. Em chạm vào vị trí muốn đặt nhé!" : "Em có thể xếp thử rồi thay đổi theo cách mình nghĩ."}</div>
      <h3 className="sequence-bank-title">Những bức tranh của em</h3><div className="sequence-bank" role="group" aria-label="Khay tranh">{game.deck.filter(card => !game.slots.includes(card.id)).map(card => <div key={card.id}>{cardView(card)}</div>)}</div>
      {game.slots.every(Boolean) && <p className="sequence-bank-empty">Đã đặt đủ tranh. Em kiểm tra diễn biến nhé!</p>}
      <div className="sequence-controls"><button type="button" className="button secondary" onClick={giveHint}><ListeningIcon name="tip" />Gợi ý</button><button type="button" className="button secondary" onClick={() => { update({ ...game, slots: game.deck.map(() => null), locked: game.deck.map(() => false), selected: null, checked: false }); setHint(""); }}>Xếp lại từ đầu</button><button type="button" className="button" disabled={game.slots.some(id => !id)} onClick={check}><ListeningIcon name="check" />Kiểm tra câu chuyện</button></div>
      {hint && <p className="sequence-hint" role="status"><ListeningIcon name="tip" />{hint}</p>}
    </div>}
    <audio ref={player} preload="none" onError={() => setMessage("Chưa tải được audio. Em có thể đọc mô tả trên thẻ nhé.")} />
    <p className="flashcard-message" role="status">{message}</p>
    <p className="games-device-note"><ListeningIcon name="info" />Kết quả xếp tranh lưu riêng trên trình duyệt này. <Link href="/hanh-trinh">Tải hoặc khôi phục bản sao</Link> để giữ lại những ngôi sao.</p>
  </section>;
}
