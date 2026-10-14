-- Shared schema for local D1 and hosted D1. No demo data or runtime reset.
CREATE TABLE reading_themes (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  slug TEXT NOT NULL UNIQUE, name_vi TEXT NOT NULL, name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, icon_path TEXT
);
CREATE TABLE teacher_users (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher','admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  full_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', avatar_path TEXT
);
CREATE TABLE stories (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  theme_id TEXT REFERENCES reading_themes(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE, title_vi TEXT NOT NULL, title_en TEXT NOT NULL,
  summary_vi TEXT NOT NULL DEFAULT '', summary_en TEXT NOT NULL DEFAULT '',
  reading_level INTEGER NOT NULL CHECK(reading_level IN (1,2)), estimated_minutes INTEGER NOT NULL DEFAULT 5,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)), cover_image_path TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft', source_note TEXT NOT NULL DEFAULT '',
  license_note TEXT NOT NULL DEFAULT '', owner_id TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK(is_visible IN (0,1)),
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX stories_created_at_idx ON stories(created_at DESC);
CREATE INDEX stories_theme_idx ON stories(theme_id);
CREATE TABLE story_sentences (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL CHECK(sequence_no>0), text_vi TEXT NOT NULL, text_en TEXT NOT NULL,
  audio_vi_path TEXT, audio_en_path TEXT, UNIQUE(story_id,sequence_no)
);
CREATE TABLE vocabulary (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL DEFAULT 0, word_vi TEXT NOT NULL, word_en TEXT NOT NULL,
  meaning_vi TEXT NOT NULL, example_vi TEXT NOT NULL DEFAULT '', pronunciation_path TEXT, illustration_path TEXT
);
CREATE UNIQUE INDEX vocabulary_complete_words_unique ON vocabulary(story_id,word_vi,word_en)
  WHERE trim(word_vi)<>'' AND trim(word_en)<>'';
CREATE INDEX vocabulary_story_order_idx ON vocabulary(story_id,sequence_no);
CREATE TABLE reading_questions (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-a'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL CHECK(sequence_no>0), question_vi TEXT NOT NULL, question_en TEXT NOT NULL DEFAULT '',
  options TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(options)), kind TEXT NOT NULL DEFAULT 'choice',
  UNIQUE(story_id,sequence_no)
);
CREATE TABLE reading_answers (
  question_id TEXT PRIMARY KEY NOT NULL REFERENCES reading_questions(id) ON DELETE CASCADE,
  correct_option INTEGER NOT NULL CHECK(correct_option>=0), explanation_vi TEXT NOT NULL DEFAULT '',
  correct_order TEXT CHECK(correct_order IS NULL OR json_valid(correct_order))
);
CREATE TABLE teacher_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES teacher_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX teacher_sessions_user_idx ON teacher_sessions(user_id);
CREATE TABLE login_attempts (key TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, reset_at TEXT NOT NULL);
CREATE TABLE media_files (path TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL REFERENCES teacher_users(id) ON DELETE CASCADE);
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK(id=1), site_name TEXT NOT NULL DEFAULT 'Thư Viện Nhỏ',
  icon_path TEXT NOT NULL DEFAULT '', logo_path TEXT NOT NULL DEFAULT '',
  site_description TEXT NOT NULL DEFAULT 'Little Readers · Cùng đọc mỗi ngày'
);
-- Retain the migration history of imported PGlite data without replaying it.
CREATE TABLE library_migrations (name TEXT PRIMARY KEY NOT NULL);
-- A failed precondition aborts the entire D1 batch, including all writes.
CREATE TABLE transaction_guards (id TEXT PRIMARY KEY NOT NULL, valid INTEGER NOT NULL CHECK(valid=1));
