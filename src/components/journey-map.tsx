"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DeviceData } from "@/lib/device-store";
import type { Theme } from "@/lib/library";
import { journeyRegions, landmarkFor, storyState, type JourneyStory } from "@/lib/journey-map";
import { LandmarkArtwork, MapIsland, SeaDecorations } from "./journey-artwork";
import { ListeningIcon } from "./listening-icon";

const labels = { new: "Chưa khám phá", started: "Đang khám phá", finished: "Đã mở địa điểm" };
function moveTo(element: HTMLElement | null) {
  element?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

export function JourneyMap({ stories, themes, data, ready, focusSlug }: { stories: JourneyStory[]; themes: Theme[]; data: DeviceData; ready: boolean; focusSlug?: string }) {
  const regions = useMemo(() => journeyRegions(stories, themes), [stories, themes]);
  const [selection, setSelection] = useState<{ region: string | undefined; story: string | undefined }>(() => {
    const region = regions.find(item => item.stories.some(story => story.slug === focusSlug)) ?? regions.find(item => item.stories.length) ?? regions[0];
    return { region: region?.slug, story: region?.stories.find(story => story.slug === focusSlug)?.slug ?? region?.stories[0]?.slug };
  });
  const regionRef = useRef<HTMLDivElement>(null), detailRef = useRef<HTMLHeadingElement>(null), shouldFocus = useRef(false);
  const region = regions.find(item => item.slug === selection.region) ?? regions[0];
  const active = region?.stories.find(story => story.slug === selection.story) ?? region?.stories[0];
  useEffect(() => {
    if (ready && focusSlug && stories.some(story => story.slug === focusSlug)) {
      const frame = requestAnimationFrame(() => moveTo(regionRef.current));
      return () => cancelAnimationFrame(frame);
    }
  }, [focusSlug, ready, stories]);
  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    detailRef.current?.focus({ preventScroll: true });
    if (matchMedia("(max-width: 760px)").matches) moveTo(detailRef.current);
  }, [selection]);

  const opened = (items: JourneyStory[]) => items.filter(story => Object.hasOwn(data.finished, story.slug)).length;
  const total = stories.length, done = opened(stories), completed = Object.keys(data.finished).length;
  function chooseRegion(slug: string) {
    const next = regions.find(item => item.slug === slug);
    setSelection({ region: slug, story: next?.stories.find(story => storyState(data, story.slug) !== "finished")?.slug ?? next?.stories[0]?.slug });
    requestAnimationFrame(() => moveTo(regionRef.current));
  }
  const milestones = [
    { count: 1, kind: "tree", name: "Cây khởi đầu" },
    { count: 3, kind: "cottage", name: "Nhà của sách" },
    { count: 10, kind: "lighthouse", name: "Hải đăng đọc sách" },
  ] as const;

  return <section id="ban-do-kham-pha" className="journey-map journey-card" aria-labelledby="journey-map-title" aria-busy={!ready}>
    <div className="journey-map-heading"><div><span className="journey-map-eyebrow">MỖI CÂU CHUYỆN, MỘT ĐỊA ĐIỂM MỚI</span><h2 id="journey-map-title">Bản đồ khám phá của em <span aria-hidden="true">🗺️</span></h2><p>Đọc một câu chuyện, thắp sáng một góc thế giới nhỏ.</p></div><div className="journey-map-count"><strong>{ready ? done : "…"}<span> / {total}</span></strong><span>địa điểm đã mở</span></div></div>
    <div className="journey-map-legend" aria-label="Chú thích bản đồ">{Object.entries(labels).map(([state, label]) => <span key={state}><i className={`map-dot ${state}`} aria-hidden="true" />{label}</span>)}</div>
    {!ready ? <p role="status" className="journey-map-loading">Đang mở bản đồ của em…</p> : !stories.length ? <div className="journey-map-empty"><span aria-hidden="true">🏝️</span><h3>Những hòn đảo đang chờ câu chuyện đầu tiên</h3><p>Khi thư viện có truyện, các địa điểm sẽ xuất hiện ở đây.</p><Link className="button secondary" href="/">Về tủ sách</Link></div> : <>
      <div className="journey-world" aria-label="Các hòn đảo theo chủ đề" style={{ aspectRatio: `1200 / ${Math.ceil(regions.length / 3) * 360}` }}>
        <svg className="journey-world-art" viewBox={`0 0 1200 ${Math.ceil(regions.length / 3) * 360}`} fill="none" aria-hidden="true"><SeaDecorations />{regions.map((item, index) => <MapIsland key={item.slug} x={200 + index % 3 * 400} y={160 + Math.floor(index / 3) * 360} land={item.style.land} edge={item.style.edge} kind={item.style.kind} />)}</svg>
        {regions.map((item, index) => <button type="button" className={`journey-island-button${opened(item.stories) && opened(item.stories) === item.stories.length ? " is-complete" : ""}`} key={item.slug} aria-pressed={region?.slug === item.slug} aria-controls="journey-region" onClick={() => chooseRegion(item.slug)} style={{ left: `${(200 + index % 3 * 400) / 12}%`, top: `${(195 + Math.floor(index / 3) * 360) / (Math.ceil(regions.length / 3) * 360) * 100}%` }}>
          <span className="journey-island-name">{item.title}</span><span>{opened(item.stories)}/{item.stories.length} truyện <span aria-hidden="true">{item.stories.length && opened(item.stories) === item.stories.length ? "✦" : "→"}</span></span>
        </button>)}
        <span className="journey-world-caption">Những hòn đảo của câu chuyện</span>
      </div>
      <div className="journey-map-milestones" aria-label="Phần thưởng theo mốc đọc">{milestones.map(item => <div key={item.count} className={`journey-map-milestone${completed >= item.count ? " is-unlocked" : ""}`}><LandmarkArtwork kind={item.kind} /><div><strong>{item.name}</strong><span>{completed >= item.count ? "Đã mở" : `Hoàn thành ${item.count} truyện`}</span></div><span aria-hidden="true">{completed >= item.count ? "✓" : "☆"}</span></div>)}</div>
      <nav className="journey-region-picker" aria-label="Chọn vùng khám phá">{regions.map(item => <button type="button" key={item.slug} aria-pressed={region?.slug === item.slug} aria-controls="journey-region" onClick={() => chooseRegion(item.slug)}><span aria-hidden="true">{item.style.icon}</span>{item.title}<small>{opened(item.stories)}/{item.stories.length}</small></button>)}</nav>
      {region && <div ref={regionRef} id="journey-region" className="journey-region" style={{ "--region-land": region.style.land, "--region-edge": region.style.edge, "--region-accent": region.style.accent } as CSSProperties}>
        <div className="journey-region-heading"><div><span className="journey-map-eyebrow">{region.style.icon} {region.style.name}</span><h3>{region.title}</h3><p>Chạm một địa điểm để chọn câu chuyện.</p></div><div className="journey-region-progress"><span>{opened(region.stories)}/{region.stories.length} địa điểm đã mở</span><progress aria-label={`Tiến độ ${region.title}`} value={opened(region.stories)} max={Math.max(region.stories.length, 1)} /></div></div>
        <div className="journey-region-layout"><div className="journey-region-scene"><div className="journey-scene-cloud cloud-one" aria-hidden="true" /><div className="journey-scene-cloud cloud-two" aria-hidden="true" /><div className="journey-stop-grid">
          {region.stories.map(story => {
            const state = storyState(data, story.slug), landmark = landmarkFor(story.slug);
            return <button type="button" key={story.slug} data-story={story.slug} data-state={state} className={`journey-map-stop is-${state}`} title={`${story.title_vi} · ${landmark.name}`} aria-label={`${story.title_vi}. ${landmark.name}. ${labels[state]}`} aria-pressed={active?.slug === story.slug} aria-controls="journey-stop-detail" onClick={() => { shouldFocus.current = true; setSelection({ region: region.slug, story: story.slug }); }}>
              <span className="journey-stop-art"><LandmarkArtwork kind={landmark.kind} /><span className="journey-stop-marker" aria-hidden="true">{state === "finished" ? "✓" : state === "started" ? "✦" : "·"}</span></span><span className="journey-stop-name">{landmark.name}</span><span className="journey-stop-story">{story.title_vi}</span>
            </button>;
          })}
          {!region.stories.length && <p className="journey-region-empty">Vùng này đang chờ những câu chuyện mới. Em chọn một vùng khác nhé!</p>}
        </div><span className="journey-scene-sign" aria-hidden="true">Mỗi bước nhỏ đều đáng quý ✦</span></div>
        {active && <aside id="journey-stop-detail" className="journey-stop-detail" aria-labelledby="journey-stop-title" key={active.slug}>
          <Image src={active.cover_image_path || "/images/book-cover.svg"} alt={`Ảnh bìa ${active.title_vi}`} width={400} height={230} unoptimized />
          <div><span className={`journey-stop-status is-${storyState(data, active.slug)}`}>{labels[storyState(data, active.slug)]}</span><h3 ref={detailRef} tabIndex={-1} id="journey-stop-title">{active.title_vi}</h3><p>{Object.hasOwn(data.finished, active.slug) ? `Em đã mở ${landmarkFor(active.slug).name.toLocaleLowerCase("vi")}. Đọc lại để gặp những điều thân quen nhé!` : `Hoàn thành câu chuyện để mở ${landmarkFor(active.slug).name.toLocaleLowerCase("vi")} ở vùng này.`}</p><Link className="button" href={`/doc/${active.slug}`}><ListeningIcon name="book" />{storyState(data, active.slug) === "finished" ? "Đọc lại" : storyState(data, active.slug) === "started" ? "Đọc tiếp" : "Bắt đầu đọc"}</Link></div>
        </aside>}
        </div>
      </div>}
      <p className="journey-map-tip"><ListeningIcon name="tip" />Ở trang đọc, bấm “Em đã đọc xong” để mở địa điểm. Những truyện đã hoàn thành trước đây cũng được tính.</p>
    </>}
  </section>;
}
