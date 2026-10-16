import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/library";
import { Cover } from "@/components/cover";
import { ListeningIcon } from "@/components/listening-icon";
export default function StoryIntroduction({
  params,
}: PageProps<"/truyen/[slug]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Đang mở giới thiệu truyện" />}>
      <Introduction params={params} />
    </Suspense>
  );
}
async function Introduction({
  params,
}: Pick<PageProps<"/truyen/[slug]">, "params">) {
  await io();
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();
  return (
    <article className="reading-width story-introduction">
      <nav className="story-introduction-navigation" aria-label="Điều hướng truyện">
        <Link className="button secondary" href="/tu-sach">
          ← Về tủ sách
        </Link>
      </nav>
      <figure className="story-cover-hero"><Cover eager hero path={story.cover_image_path} title={story.title_vi} /></figure>
      <header className="panel story-header story-introduction-card">
        <div className="story-introduction-copy">
          <p className="eyebrow story-topic-badge">
            <ListeningIcon name="sprout" />
            <span>{story.theme_vi} · Mức {story.reading_level}</span>
          </p>
          <h1>{story.title_vi}</h1>
          <p lang="en" className="english story-introduction-title-en">
            {story.title_en || "Bản tiếng Anh đang được chuẩn bị."}
          </p>
          <div className="story-introduction-summary">
            <p>{story.summary_vi || "Phần giới thiệu đang được chuẩn bị."}</p>
            {story.summary_en && <p lang="en" className="english">{story.summary_en}</p>}
          </div>
          <ul className="story-reading-facts" aria-label="Thông tin đọc truyện">
            <li>
              <span className="story-fact-icon"><ListeningIcon name="clock" /></span>
              <span>{story.estimated_minutes} phút</span>
            </li>
            <li>
              <span className="story-fact-icon"><ListeningIcon name="book" /></span>
              <span>{story.sentence_count} câu</span>
            </li>
          </ul>
          {story.sentence_count ? (
            <Link className="button story-read-button" href={`/doc/${slug}`}>
              <ListeningIcon name="book" />
              <span>Bắt đầu đọc</span>
              <ListeningIcon name="arrow-right" />
            </Link>
          ) : (
            <p className="muted story-introduction-empty">
              Nội dung truyện đang được chuẩn bị. Em chọn truyện khác nhé!
            </p>
          )}
        </div>
        <div className="story-introduction-art" aria-hidden="true" />
      </header>
    </article>
  );
}
