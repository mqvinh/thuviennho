import "server-only";
import { getDb } from "./db";
import { HttpError, text } from "./http";
import type { Teacher } from "./auth";
export type ContentDraft = {
  slug: string;
  theme_slug: string | null;
  title_vi: string;
  title_en: string;
  summary_vi: string;
  summary_en: string;
  reading_level: number;
  estimated_minutes: number;
  source_note: string;
  license_note: string;
  cover_image_path: string;
  sentences: {
    text_vi: string;
    text_en: string;
    audio_vi_path: string;
    audio_en_path: string;
  }[];
  vocabulary: {
    word_vi: string;
    word_en: string;
    meaning_vi: string;
    example_vi: string;
    pronunciation_path: string;
    illustration_path: string;
  }[];
  questions: {
    question_vi: string;
    question_en: string;
    kind: "choice" | "order";
    options: string[];
    correct_option: number;
    correct_order: number[];
    explanation_vi: string;
  }[];
};
export function validateDraft(body: Record<string, unknown>): ContentDraft {
  const slug = text(body.slug, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new HttpError(400, "Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
  const media = (value: unknown) => {
    const path = text(value ?? "", 300, false);
    if (
      path &&
      (!path.startsWith("/media/") ||
        path.includes("..") ||
        !/^\/media\/[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(path))
    )
      throw new HttpError(400, "Chọn tệp đã tải lên.");
    return path;
  };
  const array = (value: unknown, max: number) => {
    if (
      !Array.isArray(value) ||
      value.length > max ||
      value.some((v) => !v || typeof v !== "object" || Array.isArray(v))
    )
      throw new HttpError(400, "Danh sách học liệu không hợp lệ.");
    return value as Record<string, unknown>[];
  };
  const level = Number(body.reading_level ?? 1),
    minutes = Number(body.estimated_minutes === "" ? 5 : body.estimated_minutes ?? 5);
  if (
    ![1, 2].includes(level) ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 60
  )
    throw new HttpError(400, "Kiểm tra mức đọc và thời lượng.");
  const sentences = array(body.sentences ?? [], 80).map((v) => ({
    text_vi: text(v.text_vi ?? "", 1500, false),
    text_en: text(v.text_en ?? "", 1500, false),
    audio_vi_path: media(v.audio_vi_path),
    audio_en_path: media(v.audio_en_path),
  }));
  const vocabulary = array(body.vocabulary ?? [], 50).map((v) => ({
    word_vi: text(v.word_vi ?? "", 100, false),
    word_en: text(v.word_en ?? "", 100, false),
    meaning_vi: text(v.meaning_vi ?? "", 500, false),
    example_vi: text(v.example_vi ?? "", 500, false),
    pronunciation_path: media(v.pronunciation_path),
    illustration_path: media(v.illustration_path),
  }));
  const completeWords = vocabulary.filter(v => v.word_vi && v.word_en);
  if (new Set(completeWords.map(v => `${v.word_vi}:${v.word_en}`)).size !== completeWords.length)
    throw new HttpError(400, "Từ vựng bị trùng.");
  const questions = array(body.questions ?? [], 5).map((v) => {
    if (
      !["choice", "order"].includes(String(v.kind)) ||
      !Array.isArray(v.options) ||
      v.options.length < 2 ||
      v.options.length > 6
    )
      throw new HttpError(400, "Mỗi câu hỏi cần 2–6 lựa chọn.");
    const options = v.options.map((o) => text(o, 500, false));
    const correct_option = Number(v.correct_option ?? 0);
    const correct_order = Array.isArray(v.correct_order) ? v.correct_order : [];
    if (
      v.kind === "choice" &&
      (!Number.isInteger(correct_option) ||
        correct_option < 0 ||
        correct_option >= options.length)
    )
      throw new HttpError(400, "Đáp án không hợp lệ.");
    if (
      v.kind === "order" &&
      (correct_order.length !== options.length ||
        new Set(correct_order).size !== options.length ||
        !correct_order.every(
          (n) => Number.isInteger(n) && n >= 0 && n < options.length,
        ))
    )
      throw new HttpError(400, "Thứ tự đáp án không hợp lệ.");
    return {
      question_vi: text(v.question_vi ?? "", 1000, false),
      question_en: text(v.question_en ?? "", 1000, false),
      kind: v.kind as "choice" | "order",
      options,
      correct_option,
      correct_order: correct_order as number[],
      explanation_vi: text(v.explanation_vi ?? "", 1000, false),
    };
  });
  return {
    slug,
    theme_slug: text(body.theme_slug ?? "", 100, false) || null,
    title_vi: text(body.title_vi, 200),
    title_en: text(body.title_en, 200),
    summary_vi: text(body.summary_vi ?? "", 1000, false),
    summary_en: text(body.summary_en ?? "", 1000, false),
    reading_level: level,
    estimated_minutes: minutes,
    source_note: text(body.source_note ?? "", 1000, false),
    license_note: text(body.license_note ?? "", 1000, false),
    cover_image_path: media(body.cover_image_path),
    sentences,
    vocabulary,
    questions,
  };
}
export async function saveDraft(d: ContentDraft, teacher: Teacher) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const theme = d.theme_slug ? (
      await tx.query<{ id: string }>(
        "select id from reading_themes where slug=$1",
        [d.theme_slug],
      )
    ).rows[0] : null;
    if (d.theme_slug && !theme) throw new HttpError(400, "Chủ đề không còn tồn tại. Hãy chọn chủ đề khác hoặc để trống.");
    const paths = [
      d.cover_image_path,
      ...d.sentences.flatMap((s) => [s.audio_vi_path, s.audio_en_path]),
      ...d.vocabulary.flatMap((v) => [
        v.pronunciation_path,
        v.illustration_path,
      ]),
    ].filter(Boolean);
    for (const mediaPath of paths) {
      const found = await tx.query(
        "select 1 from media_files where path=$1 and ($2::boolean or owner_id=$3)",
        [mediaPath, teacher.role === "admin", teacher.id],
      );
      if (!found.rows.length)
        throw new HttpError(
          403,
          "Tệp không tồn tại hoặc không thuộc quyền sử dụng của bạn.",
        );
    }
    const existing = (
      await tx.query<{ id: string; owner_id: string | null }>(
        "select id,owner_id from stories where slug=$1",
        [d.slug],
      )
    ).rows[0];
    if (
      existing &&
      teacher.role !== "admin" &&
      existing.owner_id !== teacher.id
    )
      throw new HttpError(
        403,
        "Truyện này không thuộc quyền chỉnh sửa của bạn.",
      );
    const { rows } = await tx.query<{ id: string }>(
      `insert into stories(theme_id,slug,title_vi,title_en,summary_vi,summary_en,reading_level,estimated_minutes,source_note,license_note,cover_image_path,owner_id,review_status,is_published) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',false) on conflict(slug) do update set theme_id=excluded.theme_id,title_vi=excluded.title_vi,title_en=excluded.title_en,summary_vi=excluded.summary_vi,summary_en=excluded.summary_en,reading_level=excluded.reading_level,estimated_minutes=excluded.estimated_minutes,source_note=excluded.source_note,license_note=excluded.license_note,cover_image_path=excluded.cover_image_path,review_status='draft',is_published=false returning id`,
      [
        theme?.id ?? null,
        d.slug,
        d.title_vi,
        d.title_en,
        d.summary_vi,
        d.summary_en,
        d.reading_level,
        d.estimated_minutes,
        d.source_note,
        d.license_note,
        d.cover_image_path || null,
        teacher.id,
      ],
    );
    const id = rows[0].id;
    await tx.query("delete from story_sentences where story_id=$1", [id]);
    await tx.query("delete from vocabulary where story_id=$1", [id]);
    await tx.query("delete from reading_questions where story_id=$1", [id]);
    for (const [i, s] of d.sentences.entries())
      await tx.query(
        "insert into story_sentences(story_id,sequence_no,text_vi,text_en,audio_vi_path,audio_en_path) values($1,$2,$3,$4,$5,$6)",
        [
          id,
          i + 1,
          s.text_vi,
          s.text_en,
          s.audio_vi_path || null,
          s.audio_en_path || null,
        ],
      );
    for (const [i, v] of d.vocabulary.entries())
      await tx.query(
        "insert into vocabulary(story_id,sequence_no,word_vi,word_en,meaning_vi,example_vi,pronunciation_path,illustration_path) values($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          i + 1,
          v.word_vi,
          v.word_en,
          v.meaning_vi,
          v.example_vi,
          v.pronunciation_path || null,
          v.illustration_path || null,
        ],
      );
    for (const [i, q] of d.questions.entries()) {
      const question = (
        await tx.query<{ id: string }>(
          "insert into reading_questions(story_id,sequence_no,question_vi,question_en,kind,options) values($1,$2,$3,$4,$5,$6) returning id",
          [
            id,
            i + 1,
            q.question_vi,
            q.question_en,
            q.kind,
            JSON.stringify(q.options),
          ],
        )
      ).rows[0];
      await tx.query(
        "insert into reading_answers(question_id,correct_option,correct_order,explanation_vi) values($1,$2,$3,$4)",
        [
          question.id,
          q.correct_option,
          JSON.stringify(q.correct_order),
          q.explanation_vi,
        ],
      );
    }
    return id;
  });
}
