-- Run this file once in the Supabase SQL Editor. It imports no demo content.
-- Application data stays outside the schemas exposed by the Data API.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('little-readers-supabase-schema'));
CREATE SCHEMA IF NOT EXISTS little_readers;
CREATE TABLE IF NOT EXISTS little_readers.platform_migrations (name text PRIMARY KEY);
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM little_readers.platform_migrations WHERE name='001_library') THEN RETURN; END IF;
  CREATE TABLE little_readers.reading_themes (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, slug text NOT NULL UNIQUE,
    name_vi text NOT NULL, name_en text NOT NULL, sort_order integer NOT NULL DEFAULT 0, icon_path text
  );
  CREATE TABLE little_readers.teacher_users (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, username text NOT NULL UNIQUE, password_hash text NOT NULL,
    role text NOT NULL CHECK(role IN ('teacher','admin')), is_active boolean NOT NULL DEFAULT true,
    full_name text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', avatar_path text
  );
  CREATE TABLE little_readers.stories (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    theme_id text REFERENCES little_readers.reading_themes(id) ON DELETE SET NULL,
    slug text NOT NULL UNIQUE, title_vi text NOT NULL, title_en text NOT NULL,
    summary_vi text NOT NULL DEFAULT '', summary_en text NOT NULL DEFAULT '',
    reading_level integer NOT NULL CHECK(reading_level IN (1,2)), estimated_minutes integer NOT NULL DEFAULT 5,
    is_published boolean NOT NULL DEFAULT false, cover_image_path text, review_status text NOT NULL DEFAULT 'draft',
    source_note text NOT NULL DEFAULT '', license_note text NOT NULL DEFAULT '', owner_id text,
    is_visible boolean NOT NULL DEFAULT true,
    created_at text DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  CREATE INDEX stories_created_at_idx ON little_readers.stories(created_at DESC);
  CREATE INDEX stories_theme_idx ON little_readers.stories(theme_id);
  CREATE TABLE little_readers.story_sentences (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id text NOT NULL REFERENCES little_readers.stories(id) ON DELETE CASCADE,
    sequence_no integer NOT NULL CHECK(sequence_no>0), text_vi text NOT NULL, text_en text NOT NULL,
    audio_vi_path text, audio_en_path text, UNIQUE(story_id,sequence_no)
  );
  CREATE TABLE little_readers.vocabulary (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id text NOT NULL REFERENCES little_readers.stories(id) ON DELETE CASCADE,
    sequence_no integer NOT NULL DEFAULT 0, word_vi text NOT NULL, word_en text NOT NULL, meaning_vi text NOT NULL,
    example_vi text NOT NULL DEFAULT '', pronunciation_path text, illustration_path text
  );
  CREATE UNIQUE INDEX vocabulary_complete_words_unique ON little_readers.vocabulary(story_id,word_vi,word_en)
    WHERE trim(word_vi)<>'' AND trim(word_en)<>'';
  CREATE INDEX vocabulary_story_order_idx ON little_readers.vocabulary(story_id,sequence_no);
  CREATE TABLE little_readers.reading_questions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id text NOT NULL REFERENCES little_readers.stories(id) ON DELETE CASCADE,
    sequence_no integer NOT NULL CHECK(sequence_no>0), question_vi text NOT NULL, question_en text NOT NULL DEFAULT '',
    options text NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(options::jsonb)='array'), kind text NOT NULL DEFAULT 'choice',
    UNIQUE(story_id,sequence_no)
  );
  CREATE TABLE little_readers.reading_answers (
    question_id text PRIMARY KEY REFERENCES little_readers.reading_questions(id) ON DELETE CASCADE,
    correct_option integer NOT NULL CHECK(correct_option>=0), explanation_vi text NOT NULL DEFAULT '',
    correct_order text CHECK(correct_order IS NULL OR jsonb_typeof(correct_order::jsonb)='array')
  );
  CREATE TABLE little_readers.teacher_sessions (
    token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES little_readers.teacher_users(id) ON DELETE CASCADE,
    expires_at text NOT NULL
  );
  CREATE INDEX teacher_sessions_user_idx ON little_readers.teacher_sessions(user_id);
  CREATE TABLE little_readers.login_attempts (key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, reset_at text NOT NULL);
  CREATE TABLE little_readers.media_files (path text PRIMARY KEY, owner_id text NOT NULL REFERENCES little_readers.teacher_users(id) ON DELETE CASCADE);
  CREATE TABLE little_readers.site_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK(id), site_name text NOT NULL DEFAULT 'Thư Viện Nhỏ',
    icon_path text NOT NULL DEFAULT '', logo_path text NOT NULL DEFAULT '',
    site_description text NOT NULL DEFAULT 'Little Readers · Cùng đọc mỗi ngày'
  );
  CREATE TABLE little_readers.library_migrations (name text PRIMARY KEY);
  CREATE TABLE little_readers.transaction_guards (id text PRIMARY KEY, valid integer NOT NULL CHECK(valid=1));
  CREATE TABLE little_readers.data_imports (id text PRIMARY KEY, imported_at text NOT NULL);
  CREATE TABLE little_readers.data_import_progress (id text PRIMARY KEY, next_index integer NOT NULL);
  INSERT INTO little_readers.platform_migrations(name) VALUES('001_library');
END
$migration$;

-- No public table policies: all reads/writes go through authenticated Next.js
-- server code, including published-media and answer-key permission checks.
DO $permissions$
DECLARE tab record;
BEGIN
  FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='little_readers' LOOP
    EXECUTE format('ALTER TABLE little_readers.%I ENABLE ROW LEVEL SECURITY',tab.tablename);
  END LOOP;
END
$permissions$;
REVOKE ALL ON SCHEMA little_readers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA little_readers FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA little_readers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA little_readers TO service_role;

-- One RPC invocation is one PostgreSQL transaction. Any failing guard or
-- constraint aborts every preceding statement in this invocation.
-- SECURITY INVOKER never elevates the caller. Only service_role can execute.
CREATE OR REPLACE FUNCTION public.library_batch(statements jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = little_readers, pg_catalog
AS $function$
DECLARE item jsonb; statement_sql text; output jsonb := '[]'::jsonb; rows jsonb; changed bigint;
BEGIN
  IF jsonb_typeof(statements) IS DISTINCT FROM 'array' OR jsonb_array_length(statements)<1 OR jsonb_array_length(statements)>2000 THEN
    RAISE EXCEPTION 'Invalid statement batch.' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(statements) LOOP
    statement_sql := item->>'sql';
    IF statement_sql IS NULL OR length(statement_sql)>1000000 OR statement_sql !~* '^\s*(SELECT|INSERT|UPDATE|DELETE)\s' THEN
      RAISE EXCEPTION 'Invalid application statement.' USING ERRCODE='22023';
    END IF;
    IF statement_sql ~* '^\s*SELECT\s' THEN
      EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(query_result)),''[]''::jsonb) FROM ('||statement_sql||') query_result' INTO rows;
      changed := 0;
    ELSIF coalesce((item->>'returns_rows')::boolean,false) THEN
      EXECUTE 'WITH query_result AS ('||statement_sql||') SELECT coalesce(jsonb_agg(to_jsonb(query_result)),''[]''::jsonb) FROM query_result' INTO rows;
      changed := jsonb_array_length(rows);
    ELSE
      EXECUTE statement_sql;
      GET DIAGNOSTICS changed = ROW_COUNT;
      rows := '[]'::jsonb;
    END IF;
    output := output || jsonb_build_array(jsonb_build_object('success',true,'results',rows,'meta',jsonb_build_object('changes',changed)));
  END LOOP;
  RETURN output;
END
$function$;
REVOKE ALL ON FUNCTION public.library_batch(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.library_batch(jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
