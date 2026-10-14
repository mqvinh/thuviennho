-- Local PostgreSQL-compatible schema and starter data for PGlite.
-- The hosted Supabase schema remains in 001_initial_library_schema.sql.
create table if not exists reading_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_vi text not null,
  name_en text not null,
  sort_order integer not null default 0
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references reading_themes(id) on delete restrict,
  slug text not null unique,
  title_vi text not null,
  title_en text not null,
  summary_vi text not null default '',
  summary_en text not null default '',
  reading_level smallint not null check (reading_level in (1, 2)),
  estimated_minutes smallint not null default 5,
  is_published boolean not null default false
);

alter table stories add column if not exists cover_image_path text;

create table if not exists story_sentences (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  text_vi text not null,
  text_en text not null,
  unique (story_id, sequence_no)
);

create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  sequence_no integer not null default 0,
  word_vi text not null,
  word_en text not null,
  meaning_vi text not null,
  example_vi text not null default '',
  unique (story_id, word_vi, word_en)
);

create table if not exists reading_questions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  question_vi text not null,
  question_en text not null default '',
  options jsonb not null default '[]'::jsonb,
  unique (story_id, sequence_no)
);

create table if not exists reading_answers (
  question_id uuid primary key references reading_questions(id) on delete cascade,
  correct_option smallint not null check (correct_option >= 0),
  explanation_vi text not null default ''
);

insert into reading_themes (slug, name_vi, name_en, sort_order)
values ('kindness-sharing', 'Lòng tốt và sẻ chia', 'Kindness and Sharing', 1)
on conflict (slug) do nothing;

insert into stories (theme_id, slug, title_vi, title_en, summary_vi, summary_en, reading_level, estimated_minutes, is_published)
select id, 'tho-con-biet-se-chia', 'Thỏ con biết sẻ chia', 'The Little Rabbit Learns to Share',
  'Thỏ con chia củ cà rốt với bạn Rùa đang đói.',
  'A little rabbit shares a carrot with a hungry turtle.', 1, 5, true
from reading_themes where slug = 'kindness-sharing'
on conflict (slug) do nothing;

insert into story_sentences (story_id, sequence_no, text_vi, text_en)
select id, 1, 'Thỏ con có một củ cà rốt.', 'The little rabbit has a carrot.'
from stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;
insert into story_sentences (story_id, sequence_no, text_vi, text_en)
select id, 2, 'Bạn Rùa đang đói. Thỏ con chia củ cà rốt cho bạn.', 'Turtle is hungry. Rabbit shares the carrot.'
from stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;

insert into vocabulary (story_id, sequence_no, word_vi, word_en, meaning_vi, example_vi)
select id, 1, 'chia sẻ', 'share', 'Cho người khác cùng dùng hoặc cùng nhận.', 'Em chia sẻ đồ chơi với bạn.'
from stories where slug = 'tho-con-biet-se-chia'
on conflict do nothing;

insert into reading_questions (story_id, sequence_no, question_vi, question_en, options)
select id, 1, 'Thỏ con đã làm gì khi biết bạn Rùa đói?', 'What did the rabbit do when Turtle was hungry?',
  '["Thỏ con bỏ đi.", "Thỏ con chia cà rốt.", "Thỏ con giấu cà rốt."]'::jsonb
from stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;

insert into reading_answers (question_id, correct_option, explanation_vi)
select id, 1, 'Thỏ con đã chia củ cà rốt với bạn Rùa.'
from reading_questions where question_vi = 'Thỏ con đã làm gì khi biết bạn Rùa đói?'
on conflict (question_id) do nothing;
