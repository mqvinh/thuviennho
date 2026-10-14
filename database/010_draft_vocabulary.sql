-- Unfinished vocabulary cards may share empty values while a story is a draft.
alter table vocabulary drop constraint if exists vocabulary_story_id_word_vi_word_en_key;
create unique index if not exists vocabulary_complete_words_unique
  on vocabulary(story_id, word_vi, word_en)
  where trim(word_vi) <> '' and trim(word_en) <> '';
