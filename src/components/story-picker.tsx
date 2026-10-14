import Link from "next/link";
import type { Story } from "@/lib/library";
export function StoryPicker({
  stories,
  activity,
}: {
  stories: Story[];
  activity: string;
}) {
  return stories.length ? (
    <div className="story-grid">
      {stories.map((s) => (
        <article className="panel" key={s.slug}>
          <h2>{s.title_vi}</h2>
          <p lang="en">{s.title_en}</p>
          <Link className="button" href={`/doc/${s.slug}#${activity}`}>
            Bắt đầu
          </Link>
        </article>
      ))}
    </div>
  ) : (
    <p className="panel empty">Chưa có truyện. Em quay lại sau nhé!</p>
  );
}
