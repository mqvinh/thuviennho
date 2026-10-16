"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Story, Sentence, Word, Question } from "@/lib/library";
import { useDeviceData } from "@/lib/device-store";
import { Cover } from "./cover";
import { ListeningIcon } from "./listening-icon";
import { Reader, type ReaderHandle } from "./reader";
import { ReadingProgress } from "./reading-progress";
import { Quiz } from "./quiz";
import { Vocabulary, VocabularyHeading } from "./vocabulary";

const activities = [
  { id: "read", title: "Đọc truyện", icon: "book", hint: "Đọc và nghe câu chuyện" },
  { id: "vocabulary", title: "Từ vựng", icon: "sprout", hint: "Khám phá những từ mới" },
  { id: "quiz", title: "Thử tài", icon: "quiz", hint: "Câu hỏi về câu chuyện" },
  { id: "progress", title: "Tiến độ", icon: "chart", hint: "Nhìn lại bước nhỏ hôm nay" },
] as const;
type Activity = typeof activities[number]["id"];
function fromHash(): Activity {
  const hash = window.location.hash.slice(1);
  return activities.find(item => item.id === hash)?.id ?? "read";
}

export function StoryWorkspace({ story, sentences, words, questions }: {
  story: Story; sentences: Sentence[]; words: Word[]; questions: Question[];
}) {
  const [active, setActive] = useState<Activity>("read");
  const [compactMenu, setCompactMenu] = useState(false);
  const current = useRef<Activity>("read");
  const reader = useRef<ReaderHandle>(null);
  const menu = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const panels = useRef(new Map<Activity, HTMLDivElement>());
  const frame = useRef(0);
  const { data } = useDeviceData();
  const finished = Object.hasOwn(data.finished, story.slug);
  const tried = Object.hasOwn(data.activities, story.slug);
  const favoriteWords = words.filter(word => data.favorites.includes(String(word.id))).length;
  const entries = data.journal.filter(entry => entry.slug === story.slug).length;
  const counts: Record<Activity, string> = {
    read: finished ? "Đã đọc xong" : `${sentences.length} câu · ${story.estimated_minutes} phút`,
    vocabulary: `${words.length} từ mới`,
    quiz: tried ? "Đã làm bài" : `${questions.length} câu hỏi`,
    progress: "Lưu trên thiết bị này",
  };

  const select = useCallback((id: Activity, scroll = true, focus = false) => {
    if (current.current !== id) {
      if (current.current === "read") reader.current?.stop();
      const previous = panels.current.get(current.current);
      previous?.querySelectorAll("audio, video").forEach(node => (node as HTMLMediaElement).pause());
      previous?.querySelectorAll("dialog[open]").forEach(node => (node as HTMLDialogElement).close());
    }
    current.current = id;
    setActive(id);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (window.location.hash === "#audio") reader.current?.openAudio();
      if (scroll) {
        // The second frame lets the newly selected panel and audio disclosure lay out.
        frame.current = requestAnimationFrame(() => {
          const panel = panels.current.get(id);
          const target = window.location.hash === "#audio" ? document.getElementById("audio") : content.current;
          if (focus) panel?.focus({ preventScroll: true });
          target?.scrollIntoView({ block: "start", behavior: "instant" });
        });
      }
    });
  }, []);

  useEffect(() => {
    const sync = () => select(fromHash(), !!window.location.hash);
    const initial = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(initial);
      cancelAnimationFrame(frame.current);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [select]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setCompactMenu(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    if (menu.current) observer.observe(menu.current);
    return () => observer.disconnect();
  }, []);

  function open(id: Activity, focus = false) {
    if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
    select(id, true, focus);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % activities.length;
    else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index + activities.length - 1) % activities.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = activities.length - 1;
    else return;
    event.preventDefault();
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus({ preventScroll: true });
    open(activities[next].id);
  }
  function nextStep(id: Activity, text: string) {
    return <footer className="story-next"><span>Khám phá tiếp cùng câu chuyện</span><button type="button" className="button" onClick={() => open(id, true)}>{text}<ListeningIcon name="arrow-right" /></button></footer>;
  }

  return <article className="story-workspace">
    <nav className="story-breadcrumbs" aria-label="Điều hướng truyện">
      <Link href="/tu-sach">← Về tủ sách</Link><Link href={`/truyen/${story.slug}`}>Giới thiệu truyện</Link>
    </nav>
    <header className="panel story-compact-header">
      <div className="story-compact-cover"><Cover eager shelf path={story.cover_image_path} title={story.title_vi} /></div>
      <div className="story-compact-intro">
        <p className="eyebrow">{story.theme_vi} · Mức {story.reading_level}</p>
        <h1>{story.title_vi}</h1>
        {story.title_en && <p className="english" lang="en">{story.title_en}</p>}
        <p className="story-compact-summary">{story.summary_vi}</p>
        <span className="story-duration"><ListeningIcon name="clock" />Khoảng {story.estimated_minutes} phút đọc</span>
      </div>
    </header>
    <div className="story-learning-layout">
      <aside className="story-activities" aria-label="Các hoạt động trong truyện">
        <div ref={menu}>
          <p className="story-menu-label">Cùng khám phá</p>
          <div className="story-activity-tabs" role="tablist" aria-label="Hoạt động trong truyện">
            {activities.map((item, index) => <button type="button" role="tab" id={`story-tab-${item.id}`} aria-controls={item.id} aria-selected={active === item.id} tabIndex={active === item.id ? 0 : -1} key={item.id} className={`story-activity story-activity-${item.id}`} onClick={() => open(item.id)} onKeyDown={event => keyboard(event, index)}>
              <span className="story-activity-icon"><ListeningIcon name={item.icon} /></span>
              <span className="story-activity-copy"><strong>{item.title}</strong><small>{counts[item.id]}</small></span>
              {((item.id === "read" && finished) || (item.id === "quiz" && tried)) && <span className="story-activity-done" aria-label="Đã hoàn thành"><ListeningIcon name="check" /></span>}
            </button>)}
          </div>
          <p className="story-menu-tip">Chọn một mục để học. Em có thể đổi mục bất cứ lúc nào.</p>
        </div>
      </aside>
      <div className="story-panel-area" ref={content}>
        <nav className="story-mobile-switcher" aria-label="Chuyển nhanh hoạt động" hidden={!compactMenu}>
          {activities.map(item => <button type="button" key={item.id} aria-pressed={active === item.id} onClick={() => open(item.id)}><ListeningIcon name={item.icon} /><span>{item.title}</span></button>)}
        </nav>
        {activities.map(item => <div id={item.id} role="tabpanel" aria-labelledby={`story-tab-${item.id}`} tabIndex={0} hidden={active !== item.id} className="story-activity-panel" key={item.id} ref={node => { if (node) panels.current.set(item.id, node); else panels.current.delete(item.id); }}>
          <div className="story-section-caption"><span><ListeningIcon name={item.icon} />{item.title}</span><small>{item.hint}</small></div>
          {item.id === "read" && <>
            <Reader compact sentences={sentences} words={words} controlRef={reader} />
            <ReadingProgress slug={story.slug} title={story.title_vi} />
            {nextStep("vocabulary", "Khám phá từ vựng")}
          </>}
          {item.id === "vocabulary" && <>
            <section className="panel reading-section vocabulary-section-card" aria-labelledby="story-vocabulary-title">
              <VocabularyHeading id="story-vocabulary-title" title="Từ mới trong truyện" description="Cùng học nghĩa và cách dùng từ. Em cũng có thể chạm vào từ gạch chân khi đọc truyện để xem nghĩa nhé!" />
              <Vocabulary words={words} storySlug={story.slug} />
            </section>
            {nextStep("quiz", "Cùng thử tài")}
          </>}
          {item.id === "quiz" && <>
            <div className="panel reading-section quiz-section-card"><Quiz slug={story.slug} title={story.title_vi} questions={questions} /></div>
            {nextStep("progress", "Xem tiến độ của em")}
          </>}
          {item.id === "progress" && <>
            <section className="panel story-progress-summary" aria-labelledby="story-progress-title">
              <span className="story-progress-art" aria-hidden="true"><ListeningIcon name="sprout" /></span>
              <h2 id="story-progress-title">Mỗi bước nhỏ đều đáng nhớ</h2>
              <p>Tiến độ của câu chuyện này được lưu trong trình duyệt em đang dùng.</p>
              <ul>
                <li><ListeningIcon name="book" /><span><strong>Đọc truyện</strong>{finished ? "Em đã ghi nhận đọc xong." : "Em chưa ghi nhận đọc xong."}</span></li>
                <li><ListeningIcon name="sprout" /><span><strong>Từ vựng</strong>{favoriteWords} / {words.length} từ đã lưu yêu thích.</span></li>
                <li><ListeningIcon name="quiz" /><span><strong>Thử tài</strong>{tried ? "Em đã gửi bài để kiểm tra." : "Em chưa gửi bài để kiểm tra."}</span></li>
                <li><ListeningIcon name="pencil" /><span><strong>Nhật ký</strong>{entries ? `${entries} bài viết về câu chuyện này.` : "Em có thể viết hoặc vẽ điều mình nhớ."}</span></li>
              </ul>
            </section>
            <ReadingProgress slug={story.slug} title={story.title_vi} />
            <div className="story-progress-links"><Link className="button" href="/nhat-ky"><ListeningIcon name="pencil" />Viết nhật ký</Link><Link className="button secondary" href="/hanh-trinh"><ListeningIcon name="chart" />Hành trình đọc sách</Link></div>
          </>}
        </div>)}
      </div>
    </div>
  </article>;
}
