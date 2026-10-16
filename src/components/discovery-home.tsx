"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Story, Word } from "@/lib/library";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import { createDailyPlan, dailyCandidates, dailyProgress, learningDate, learningStars, recordDailyWord, type DailyPlan, type DailyQuestion } from "@/lib/daily-learning";
import { flashcardKey, flashcardReady, reviewWord } from "@/lib/flashcards";
import { useLearningDay } from "@/lib/use-learning-day";
import { Cover } from "./cover";
import { GameImage } from "./game-image";
import { ListeningIcon } from "./listening-icon";
import { Quiz } from "./quiz";
import { useUI } from "./ui-provider";

type Content = { stories: Story[]; words: Word[]; questions: DailyQuestion[] };
export function DiscoveryHome({ stories, words, questions }: Content) {
  const { data, available } = useDeviceData(), day = useLearningDay(), { notify } = useUI();
  const plan = data.daily?.[day];
  const candidates = useMemo(() => dailyCandidates(stories, words, questions), [stories, words, questions]);
  useEffect(() => {
    if (!day || !available || plan || !candidates.length) return;
    try {
      changeDeviceData(current => {
        const today = learningDate();
        if (current.daily?.[today]) return current;
        const next = createDailyPlan(stories, words, questions, current);
        return next ? { ...current, daily: { ...current.daily, [today]: next } } : current;
      });
    } catch (error) { void notify(error instanceof Error ? error.message : "Chưa lưu được bộ nhiệm vụ hôm nay."); }
  }, [day, available, plan, candidates.length, stories, words, questions, notify]);
  const continued = Object.entries(data.started).filter(([slug]) => !Object.hasOwn(data.finished, slug)).sort((a, b) => b[1].date.localeCompare(a[1].date)).map(([slug]) => stories.find(story => story.slug === slug)).find(Boolean);
  const suggested = [...stories].sort((a, b) => Number(Object.hasOwn(data.finished, a.slug)) - Number(Object.hasOwn(data.finished, b.slug)) || Number(b.slug === plan?.storySlug) - Number(a.slug === plan?.storySlug)).slice(0, 4);
  const totalStars = learningStars(data);
  return <div className="discovery-content">
    <section id="goc-hoc-hom-nay" className="daily-learning" aria-labelledby="daily-title" aria-busy={!day || (available && candidates.length > 0 && !plan)}>
      <div className="discovery-heading"><div><p className="eyebrow">MỖI NGÀY MỘT CHÚT, THÊM MỘT ĐIỀU HAY</p><h2 id="daily-title">Góc học hôm nay <span aria-hidden="true">☀️</span></h2><p>Đọc một truyện, ôn ba từ và trả lời ba câu hỏi.</p></div><span className="daily-date">{day ? new Date(`${day}T12:00:00+07:00`).toLocaleDateString("vi-VN", { day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" }) : "Đang mở ngày học…"}</span></div>
      {!available ? <p role="status" className="daily-notice">Chưa đọc được bộ nhớ thiết bị. Hãy cho phép lưu dữ liệu để giữ nhiệm vụ và sao học tập. Em vẫn có thể <Link href="/tu-sach">khám phá tủ sách</Link>.</p> : !day ? <p role="status">Đang mở góc học của bạn…</p> : !candidates.length ? <p className="daily-notice">Thư viện đang chuẩn bị bộ học có đủ ba từ và ba câu hỏi. Ghé <Link href="/tu-sach">Tủ sách</Link> để đọc trước nhé!</p> : plan ? <DailyHub key={`${day}:${plan.storySlug}`} {...{ stories, words, questions, plan, day }} /> : <p role="status">Đang chọn một câu chuyện vừa sức…</p>}
    </section>
    {continued && <section className="discovery-continue" aria-labelledby="continue-title"><div className="discovery-continue-cover"><Cover path={continued.cover_image_path} title={continued.title_vi} /></div><div><p className="eyebrow">MỘT CÂU CHUYỆN ĐANG CHỜ BẠN</p><h2 id="continue-title">Tiếp tục khám phá</h2><h3>{continued.title_vi}</h3><p>{continued.theme_vi} · Khoảng {continued.estimated_minutes} phút</p><Link className="button" href={`/doc/${continued.slug}`}><ListeningIcon name="book" />Đọc tiếp</Link></div><span className="discovery-continue-art" aria-hidden="true">🌱</span></section>}
    <section id="books" aria-labelledby="suggested-title"><div className="discovery-heading"><div><p className="eyebrow">MỞ SÁCH, MỞ THÊM MỘT THẾ GIỚI</p><h2 id="suggested-title">Truyện gợi ý hôm nay</h2></div><Link className="discovery-text-link" href="/tu-sach">Khám phá tủ sách <ListeningIcon name="arrow-right" /></Link></div><div className="story-grid bookshelf discovery-stories">{suggested.map(story => <article className="story-card" key={story.slug}><Link className="book-cover-link" href={`/truyen/${story.slug}`} aria-label={`Mở truyện ${story.title_vi}`}><Cover shelf path={story.cover_image_path} title={story.title_vi} /><span className="eyebrow story-cover-badge">{story.theme_vi} · Mức {story.reading_level}</span></Link><div className="card-body"><h3>{story.title_vi}</h3><p className="english" lang="en">{story.title_en}</p><p className="story-card-summary">{story.summary_vi}</p><p className="story-card-meta"><ListeningIcon name="clock" />{story.estimated_minutes} phút đọc</p><Link className="button" href={`/truyen/${story.slug}`}>Mở câu chuyện <ListeningIcon name="arrow-right" /></Link></div></article>)}</div>{!stories.length && <p>Những câu chuyện đầu tiên sẽ sớm xuất hiện ở đây.</p>}</section>
    <section className="discovery-journey" aria-labelledby="discovery-journey-title"><div className="discovery-star-orbit" aria-hidden="true">★<span>✦</span><span>✧</span></div><div><p className="eyebrow">TỪNG BƯỚC NHỎ ĐỀU ĐÁNG QUÝ</p><h2 id="discovery-journey-title">Hành trình của bạn</h2><p><strong>{totalStars}</strong> sao học tập <span>·</span> <strong>{Object.keys(data.finished).length}</strong> truyện đã đọc xong</p><p>Hoàn thành ba nhiệm vụ trong ngày để nhận một ngôi sao.</p></div><Link className="button secondary" href="/hanh-trinh#ban-do-kham-pha">Mở bản đồ hành trình <ListeningIcon name="arrow-right" /></Link></section>
    <nav className="discovery-shortcuts" aria-label="Khám phá thêm"><Link href="/tro-choi"><span aria-hidden="true">🎮</span><div><strong>Học qua trò chơi</strong><small>Lật thẻ, ghép hình, xếp tranh kể chuyện</small></div><ListeningIcon name="arrow-right" /></Link><Link href="/nhat-ky"><ListeningIcon name="pencil" /><div><strong>Giữ lại điều đã đọc</strong><small>Viết nhật ký và vẽ một bức tranh</small></div><ListeningIcon name="arrow-right" /></Link></nav>
  </div>;
}

function DailyHub({ stories, words, questions, plan, day }: Content & { plan: DailyPlan; day: string }) {
  const { confirm } = useUI();
  const [practice, setPractice] = useState<"words" | "quiz" | null>(null), [selection, setSelection] = useState(plan.storySlug), [message, setMessage] = useState("");
  const practiceRef = useRef<HTMLDivElement>(null);
  const story = stories.find(story => story.slug === plan.storySlug), progress = dailyProgress(plan);
  const selectedWords = plan.wordKeys.map(key => words.find(word => flashcardKey(word) === key)).filter((word): word is Word => !!word && flashcardReady(word));
  const selectedQuestions = plan.questionIds.map(id => questions.find(question => question.id === id && question.story_slug === plan.storySlug)).filter((question): question is DailyQuestion => !!question);
  const stale = !story || selectedWords.length !== 3 || selectedQuestions.length !== 3;
  const candidates = dailyCandidates(stories, words, questions);
  useEffect(() => { if (practice) { practiceRef.current?.focus({ preventScroll: true }); practiceRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); } }, [practice]);
  async function changeStory() {
    if (selection === plan.storySlug || plan.awardedAt) return;
    if ((plan.readAt || plan.reviewedWords.length || plan.answeredQuestions.length) && !await confirm("Đổi truyện sẽ bắt đầu lại ba nhiệm vụ hôm nay. Lịch ôn từ và tiến độ đọc trước đây vẫn được giữ.", "Đổi truyện")) return;
    try {
      changeDeviceData(current => {
        if (day !== learningDate() || current.daily?.[day]?.awardedAt) return current;
        const next = createDailyPlan(stories, words, questions, current, Date.now(), selection);
        return next ? { ...current, daily: { ...current.daily, [day]: next } } : current;
      });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa đổi được truyện."); }
  }
  const tasks = [
    { kind: "read", icon: "book", title: "Đọc một câu chuyện", description: story ? `${story.title_vi} · Khoảng ${story.estimated_minutes} phút` : "Truyện hôm nay đang được cập nhật", complete: !!plan.readAt, action: plan.readAt ? "Đọc lại truyện" : "Mở truyện để đọc" },
    { kind: "words", icon: "sprout", title: "Ôn ba từ vựng", description: `Xem hình, nghe và lật thẻ · ${plan.reviewedWords.length}/3 từ`, complete: plan.reviewedWords.length === 3, action: plan.reviewedWords.length === 3 ? "Ôn lại bộ từ" : "Mở thẻ từ" },
    { kind: "quiz", icon: "quiz", title: "Thử tài ba câu hỏi", description: `Nhớ lại câu chuyện vừa đọc · ${plan.answeredQuestions.length}/3 câu`, complete: plan.answeredQuestions.length === 3, action: plan.answeredQuestions.length === 3 ? "Luyện tập lại" : "Cùng thử tài" },
  ] as const;
  return <>
    <div className="daily-progress-row"><div><span className="daily-progress-label">{progress === 3 ? "Một ngày học thật đáng quý!" : "Một bước nhỏ, thêm một khám phá"}<strong>{progress}/3 nhiệm vụ</strong></span><progress aria-label="Tiến độ nhiệm vụ hôm nay" value={progress} max={3} /></div><span className={`daily-reward${plan.awardedAt ? " is-earned" : ""}`} aria-label={plan.awardedAt ? "Đã nhận một sao hôm nay" : "Phần thưởng: một sao học tập"}>★ <span>{plan.awardedAt ? "+1 sao đã nhận" : "1 sao đang chờ"}</span></span></div>
    {plan.awardedAt && <p role="status" className="daily-congratulations">🌟 Bạn đã hoàn thành góc học hôm nay và nhận một ngôi sao! <Link href="/hanh-trinh#sao-hoc-tap">Xem sao học tập →</Link></p>}
    {stale && <p className="daily-notice" role="status">Nội dung của bộ hôm nay đã thay đổi. {plan.awardedAt ? "Ngôi sao đã nhận vẫn được giữ." : "Hãy đổi sang một truyện khác có đủ từ và câu hỏi."}</p>}
    <div className="daily-task-grid">{tasks.map((task, index) => <article key={task.kind} className={`daily-task daily-task-${task.kind}${task.complete ? " is-complete" : ""}`} data-task={task.kind}><div className="daily-task-top"><span className="daily-task-icon"><ListeningIcon name={task.icon} /></span><span>{task.complete ? <><ListeningIcon name="check" />Đã hoàn thành</> : `Bước ${index + 1}`}</span></div><h3>{task.title}</h3><p>{task.description}</p>{task.kind === "read" ? story && <Link className="button" href={`/doc/${story.slug}`}>{task.action}<ListeningIcon name="arrow-right" /></Link> : <button type="button" className="button" disabled={stale} aria-expanded={practice === task.kind} aria-controls={practice === task.kind ? "daily-practice" : undefined} onClick={() => setPractice(practice === task.kind ? null : task.kind)}>{task.action}<ListeningIcon name="arrow-right" /></button>}</article>)}</div>
    {!plan.awardedAt && (candidates.length > 1 || (stale && candidates.length > 0)) && <details className="daily-story-picker"><summary>Chọn truyện khác cho buổi học</summary><p>Phụ huynh, giáo viên có thể chọn câu chuyện phù hợp hơn.</p><label>Truyện hôm nay<select value={selection} onChange={event => setSelection(event.target.value)}>{!candidates.some(candidate => candidate.slug === plan.storySlug) && <option value={plan.storySlug}>Truyện đã thay đổi</option>}{candidates.map(story => <option key={story.slug} value={story.slug}>{story.title_vi} · {story.estimated_minutes} phút</option>)}</select></label><button type="button" className="button secondary" disabled={selection === plan.storySlug} onClick={changeStory}>Đổi truyện</button></details>}
    {message && <p role="alert">{message}</p>}
    {practice && !stale && <div ref={practiceRef} id="daily-practice" className="daily-practice" tabIndex={-1}><div className="daily-practice-heading"><h3>{practice === "words" ? "Ba từ nhỏ cho hôm nay" : "Ba câu hỏi trong câu chuyện"}</h3><button type="button" className="button secondary" onClick={() => { setPractice(null); document.querySelector<HTMLButtonElement>(`[data-task="${practice}"] button`)?.focus(); }}>Thu gọn</button></div>{practice === "words" ? <DailyWords key={day + plan.storySlug} words={selectedWords} plan={plan} day={day} /> : <Quiz key={day + plan.storySlug} slug={plan.storySlug} title={story!.title_vi} questions={selectedQuestions} dailyDay={day} />}</div>}
    <p className="daily-device-note"><ListeningIcon name="info" />Ngày học tính theo giờ Việt Nam. Nhiệm vụ và sao lưu trên thiết bị này.</p>
  </>;
}

function DailyWords({ words, plan, day }: { words: Word[]; plan: DailyPlan; day: string }) {
  const [index, setIndex] = useState(() => Math.max(0, words.findIndex(word => !plan.reviewedWords.includes(flashcardKey(word))))), [flipped, setFlipped] = useState(false), [message, setMessage] = useState("");
  const audio = useRef<HTMLAudioElement>(null), card = useRef<HTMLButtonElement>(null), word = words[index];
  useEffect(() => { const player = audio.current; return () => player?.pause(); }, [index]);
  function review(correct: boolean) {
    try {
      if (day !== learningDate()) throw Error("Ngày học mới đã bắt đầu. Hãy mở bộ hôm nay để tiếp tục nhé!");
      changeDeviceData(data => recordDailyWord({ ...data, flashcards: { ...data.flashcards, [flashcardKey(word)]: reviewWord(data.flashcards[flashcardKey(word)], correct) } }, flashcardKey(word)));
      setMessage(correct ? "Đã lưu lịch ôn. Hẹn gặp lại từ này nhé!" : "Đã lưu. Từ này sẽ được gặp lại sớm hơn.");
      setIndex((index + 1) % words.length); setFlipped(false); card.current?.focus();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được lượt ôn."); }
  }
  return <div className="daily-word-practice"><p className="daily-word-counter">Từ {index + 1}/{words.length} · Đã ôn {plan.reviewedWords.length}/3 từ</p><p className="daily-word-source">Trong truyện: {word.story_title}</p><button ref={card} type="button" className={`daily-word-card${flipped ? " is-flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-pressed={flipped} aria-label={`Lật thẻ từ ${word.word_en}`}><GameImage src={word.illustration_path!} alt={`Minh họa ${word.word_en}`} width={240} height={180} /><span lang="en">{word.word_en}</span>{flipped ? <><strong>{word.word_vi}</strong><span>{word.meaning_vi}</span><em>{word.example_vi}</em></> : <small>Chạm để xem nghĩa và ví dụ ↻</small>}</button><audio ref={audio} key={word.id} src={word.pronunciation_path!} preload="none" /><button type="button" className="button secondary" onClick={() => { void audio.current?.play().catch(() => setMessage("Chưa phát được âm thanh. Hãy bấm nghe lại nhé!")); }}><ListeningIcon name="volume" />Nghe phát âm</button><div className="daily-word-actions"><button type="button" className="button secondary" disabled={!flipped} onClick={() => review(false)}>Cần ôn thêm</button><button type="button" className="button" disabled={!flipped} onClick={() => review(true)}><ListeningIcon name="check" />Đã nhớ</button></div><p role="status">{message}</p></div>;
}
