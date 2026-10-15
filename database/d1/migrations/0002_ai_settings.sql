-- Private server-side settings. NULL keeps the existing environment key.
ALTER TABLE site_settings ADD COLUMN ai_api_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN ai_api_key TEXT;
ALTER TABLE site_settings ADD COLUMN ai_model TEXT NOT NULL DEFAULT '';
