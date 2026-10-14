const string = { type: "string" };
const integer = { type: "integer" };
const array = (items: unknown) => ({ type: "array", items });
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const draftSchema = object({
  slug: string,
  theme_slug: string,
  title_vi: string,
  title_en: string,
  summary_vi: string,
  summary_en: string,
  reading_level: integer,
  estimated_minutes: integer,
  source_note: string,
  license_note: string,
  cover_image_path: string,
  sentences: array(
    object({
      text_vi: string,
      text_en: string,
      audio_vi_path: string,
      audio_en_path: string,
    }),
  ),
  vocabulary: array(
    object({
      word_vi: string,
      word_en: string,
      meaning_vi: string,
      example_vi: string,
      pronunciation_path: string,
      illustration_path: string,
    }),
  ),
  questions: array(
    object({
      question_vi: string,
      question_en: string,
      kind: { type: "string", enum: ["choice", "order"] },
      options: array(string),
      correct_option: integer,
      correct_order: array(integer),
      explanation_vi: string,
    }),
  ),
});
