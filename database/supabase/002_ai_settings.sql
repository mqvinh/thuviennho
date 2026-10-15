-- Run after 001_library.sql. Adds configuration only; preserves all content.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('little-readers-supabase-schema'));
ALTER TABLE little_readers.site_settings ADD COLUMN IF NOT EXISTS ai_api_url text NOT NULL DEFAULT '';
ALTER TABLE little_readers.site_settings ADD COLUMN IF NOT EXISTS ai_api_key text;
ALTER TABLE little_readers.site_settings ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT '';
INSERT INTO little_readers.platform_migrations(name) VALUES('002_ai_settings') ON CONFLICT(name) DO NOTHING;
COMMIT;
