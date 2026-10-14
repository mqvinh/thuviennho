import "server-only";
import { getDb } from "./db";
import type { Teacher } from "./auth";
import type { Story, Sentence, Word, Question } from "./library";
export type ReviewQuestion = Question & {
  correct_option: number;
  correct_order: number[];
  explanation_vi: string;
};
export async function getTeacherPreview(slug: string, teacher: Teacher) {
  const db = await getDb();
  const story = (
    await db.query<
      Story & {
        id: string;
        source_note: string;
        license_note: string;
        review_status: string;
      }
    >(
      `select s.id,s.slug,s.title_vi,s.title_en,s.summary_vi,s.summary_en,s.reading_level,s.estimated_minutes,s.cover_image_path,s.source_note,s.license_note,s.review_status,coalesce(t.name_vi,'Chưa phân chủ đề') theme_vi,t.slug theme_slug,(select count(*) from story_sentences where story_id=s.id) sentence_count from stories s left join reading_themes t on t.id=s.theme_id where s.slug=?1 and (?2 or s.owner_id=?3)`,
      [slug, teacher.role === "admin", teacher.id],
    )
  ).rows[0];
  if (!story) return null;
  const sentences = (
    await db.query<Sentence>(
      "select sequence_no,text_vi,text_en,audio_vi_path,audio_en_path from story_sentences where story_id=?1 order by sequence_no",
      [story.id],
    )
  ).rows;
  const words = (
    await db.query<Word>(
      "select v.id,?2 story_slug,?3 story_title,word_vi,word_en,meaning_vi,example_vi,pronunciation_path,illustration_path from vocabulary v where story_id=?1 order by sequence_no",
      [story.id, story.slug, story.title_vi],
    )
  ).rows;
  const questions = (
    await db.query<ReviewQuestion>(
      "select q.id,q.question_vi,q.question_en,q.options,q.kind,a.correct_option,coalesce(a.correct_order,'[]') correct_order,a.explanation_vi from reading_questions q join reading_answers a on a.question_id=q.id where q.story_id=?1 order by q.sequence_no",
      [story.id],
    )
  ).rows;
  return { story, sentences, words, questions };
}
