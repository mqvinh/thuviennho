import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { getStory, getSentences, getWords, getQuestions } from "@/lib/library";
import { StoryWorkspace } from "@/components/story-workspace";
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
    <StoryWorkspace key={slug} story={story} sentences={sentences} words={words} questions={questions} />
  );
}
