alter table teacher_users add column if not exists avatar_path text;

-- Existing stories have no recorded creation date; retain NULL for those rows.
alter table stories add column if not exists created_at timestamptz;
alter table stories alter column created_at set default now();
create index if not exists stories_created_at_idx on stories(created_at desc nulls last);
