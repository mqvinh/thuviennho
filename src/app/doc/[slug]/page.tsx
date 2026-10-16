import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import Link from "next/link";
import { getStory, getSentences, getWords, getQuestions } from "@/lib/library";
import { Cover } from "@/components/cover";
import { ReadingProgress } from "@/components/reading-progress";
import { Quiz } from "@/components/quiz";
import { Vocabulary, VocabularyHeading } from "@/components/vocabulary";
import { Reader } from "@/components/reader";
export default function StoryPage({ params }: PageProps<"/doc/[slug]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Đang mở truyện" />}>
      <StoryContent params={params} />
    </Suspense>
  );
}
async function StoryContent({
  params,
}: Pick<PageProps<"/doc/[slug]">, "params">) {
  await io();
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();
  const [sentences, words, questions] = await Promise.all([
    getSentences(slug),
    getWords(slug),
    getQuestions(slug),
  ]);
  return (
    <article className="reading-width reading-page">
      <nav className="panel actions reading-navigation" aria-label="Điều hướng truyện">
        <Link href="/tu-sach" className="button secondary">
          ← Về tủ sách
        </Link>
        <Link href={`/truyen/${slug}`} className="button secondary">
          Giới thiệu truyện
        </Link>
      </nav>
      <figure className="panel story-cover-hero"><Cover eager hero path={story.cover_image_path} title={story.title_vi} /></figure>
      <header className="panel story-header">
        <p className="eyebrow">
          {story.theme_vi} · Mức {story.reading_level} ·{" "}
          {story.estimated_minutes} phút
        </p>
        <h1>{story.title_vi}</h1>
        <p lang="en" className="english">
          {story.title_en}
        </p>
        <p>{story.summary_vi}</p>
      </header>
      <Reader sentences={sentences} words={words} />
      <section id="vocabulary" className="panel reading-section vocabulary-section-card" aria-labelledby="story-vocabulary-title">
        <VocabularyHeading id="story-vocabulary-title" title="Từ mới trong truyện" description="Cùng học nghĩa và cách dùng từ. Chạm vào từ được gạch chân trong truyện để xem nghĩa nhé!" />
        <Vocabulary key={slug} words={words} storySlug={slug} />
      </section>
      <div id="quiz" className="panel reading-section quiz-section-card">
        <Quiz slug={slug} title={story.title_vi} questions={questions} />
      </div>
      <ReadingProgress slug={slug} title={story.title_vi} />
    </article>
  );
}
