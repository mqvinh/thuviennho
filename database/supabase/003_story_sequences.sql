-- Adds the optional game only. All existing story and media fields are kept.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('little-readers-supabase-schema'));
ALTER TABLE little_readers.stories ADD COLUMN IF NOT EXISTS sequence_cards jsonb NOT NULL DEFAULT '[]'::jsonb;
INSERT INTO little_readers.platform_migrations(name) VALUES('003_story_sequences') ON CONFLICT(name) DO NOTHING;
COMMIT;
