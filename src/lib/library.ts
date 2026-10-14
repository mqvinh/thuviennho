import "server-only";
import { getDb } from "./db";

export type Theme = { slug: string; name_vi: string; name_en: string; icon_path: string | null };
export type LibraryActivity = "audio" | "quiz";
export type Story = {
  slug: string;
  title_vi: string;
  title_en: string;
  summary_vi: string;
  summary_en: string;
  reading_level: number;
  estimated_minutes: number;
  theme_vi: string;
  theme_slug: string | null;
  cover_image_path: string | null;
  sentence_count: number;
};
export type Sentence = {
  sequence_no: number;
  text_vi: string;
  text_en: string;
  audio_vi_path: string | null;
  audio_en_path: string | null;
};
const storyQuery = `select s.slug, s.title_vi, s.title_en, s.summary_vi, s.summary_en,
  s.reading_level, s.estimated_minutes, s.cover_image_path,
  coalesce(t.name_vi, 'Chưa phân chủ đề') as theme_vi, t.slug as theme_slug,
  (select count(*) from story_sentences where story_id = s.id) as sentence_count
  from stories s left join reading_themes t on t.id = s.theme_id where s.is_published = true and s.is_visible = true`;
export async function getThemes() {
  return (await (await getDb()).query<Theme>(
    "select slug, name_vi, name_en, icon_path from reading_themes order by sort_order, name_vi",
  )).rows;
}
export async function getLibrary(activity?: LibraryActivity) {
  const db = await getDb();
  const activityFilter = activity === "audio"
    ? " and exists(select 1 from story_sentences ss where ss.story_id=s.id and (nullif(trim(ss.audio_vi_path),'') is not null or nullif(trim(ss.audio_en_path),'') is not null))"
    : activity === "quiz"
      ? " and exists(select 1 from reading_questions q where q.story_id=s.id)"
      : "";
  const stories = await db.query<Story>(
    `${storyQuery}${activityFilter} order by t.sort_order, s.title_vi`,
  );
  return { stories: stories.rows, themes: await getThemes() };
}
export async function getStory(slug: string) {
  const db = await getDb();
  return (
    (await db.query<Story>(`${storyQuery} and s.slug = ?1`, [slug])).rows[0] ??
    null
  );
}
export async function getSentences(slug: string) {
  const db = await getDb();
  return (
    await db.query<Sentence>(
      `select ss.sequence_no, ss.text_vi, ss.text_en, ss.audio_vi_path, ss.audio_en_path
    from story_sentences ss join stories s on s.id = ss.story_id
    where s.slug = ?1 and s.is_published = true and s.is_visible = true order by ss.sequence_no`,
      [slug],
    )
  ).rows;
}

export type Word = {
  id: string;
  story_slug: string;
  story_title: string;
  word_vi: string;
  word_en: string;
  meaning_vi: string;
  example_vi: string;
  pronunciation_path: string | null;
  illustration_path: string | null;
};
export type Question = {
  id: string;
  question_vi: string;
  question_en: string;
  options: string[];
  kind: "choice" | "order";
};
export async function getWords(slug?: string) {
  const db = await getDb();
  return (
    await db.query<Word>(
      `select v.id, s.slug as story_slug, s.title_vi as story_title, v.word_vi, v.word_en, v.meaning_vi, v.example_vi, v.pronunciation_path, v.illustration_path from vocabulary v join stories s on s.id = v.story_id where s.is_published = true and s.is_visible = true and (?1 is null or s.slug = ?1) order by s.title_vi, v.sequence_no`,
      [slug ?? null],
    )
  ).rows;
}
export async function getQuestions(slug: string) {
  const db = await getDb();
  return (
    await db.query<Question>(
      `select q.id, q.question_vi, q.question_en, q.options, q.kind from reading_questions q join stories s on s.id = q.story_id where s.slug = ?1 and s.is_published = true and s.is_visible = true order by q.sequence_no`,
      [slug],
    )
  ).rows;
}
