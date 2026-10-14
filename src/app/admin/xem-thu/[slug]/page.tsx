import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import { getTeacherPreview } from "@/lib/teacher-preview";
import { Reader } from "@/components/reader";
import { Cover } from "@/components/cover";
import { WordCard } from "@/components/vocabulary";
export default function Page({
  params,
}: PageProps<"/admin/xem-thu/[slug]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Đang mở bản đọc thử" />}>
      <Preview params={params} />
    </Suspense>
  );
}
async function Preview({
  params,
}: Pick<PageProps<"/admin/xem-thu/[slug]">, "params">) {
  await io();
  const teacher = await getTeacher();
  if (!teacher)
    return (
      <section className="panel empty">
        <h1>Đăng nhập để đọc thử</h1>
        <p>Bản đọc thử chỉ dành cho giáo viên có quyền sửa truyện.</p>
        <Link className="button" href="/admin">
          Đăng nhập giáo viên
        </Link>
      </section>
    );
  const { slug } = await params;
  const data = await getTeacherPreview(slug, teacher);
  if (!data) notFound();
  const { story, sentences, words, questions } = data;
  return (
    <article className="reading-width">
      <Link className="button secondary" href="/admin">
        ← Quản lý học liệu
      </Link>
      <section className="panel">
        <h1>Đọc thử học liệu</h1>
        <p>
          Trạng thái:{" "}
          {
            (
              {
                draft: "Nháp",
                pending: "Chờ duyệt",
                published: "Đã xuất bản",
              } as Record<string, string>
            )[story.review_status]
          }
        </p>
        <p>
          Trang này dành cho người duyệt, không ghi tiến độ hoặc từ yêu thích
          của học sinh.
        </p>
        <p>Nguồn: {story.source_note || "Chưa bổ sung"}</p>
        <p>Quyền sử dụng: {story.license_note || "Chưa bổ sung"}</p>
      </section>
      <header className="panel story-header">
        <Cover eager path={story.cover_image_path} title={story.title_vi} />
        <h2>{story.title_vi}</h2>
        <p lang="en">{story.title_en}</p>
        <p>
          {story.theme_vi} · Mức {story.reading_level} ·{" "}
          {story.estimated_minutes} phút
        </p>
        <p>{story.summary_vi}</p>
      </header>
      <Reader preview sentences={sentences} words={words} />
      <h2>Từ vựng cần rà soát</h2>
      {words.length ? (
        words.map((w) => (
          <WordCard allowFavorites={false} key={w.id} word={w} />
        ))
      ) : (
        <p>Chưa có từ vựng.</p>
      )}
      <section>
        <h2>Câu hỏi và đáp án để duyệt</h2>
        {questions.length ? (
          questions.map((q, i) => (
            <article className="panel" key={q.id}>
              <h3>
                {i + 1}. {q.question_vi}
              </h3>
              {q.question_en && <p lang="en">{q.question_en}</p>}
              <ol>
                {q.options.map((option, index) => (
                  <li key={index}>{option}</li>
                ))}
              </ol>
              <p>
                <strong>Đáp án duyệt:</strong>{" "}
                {q.kind === "order"
                  ? q.correct_order.map((index) => q.options[index]).join(" → ")
                  : q.options[q.correct_option]}
              </p>
              <p>Giải thích: {q.explanation_vi}</p>
            </article>
          ))
        ) : (
          <p>Chưa có câu hỏi.</p>
        )}
      </section>
    </article>
  );
}
