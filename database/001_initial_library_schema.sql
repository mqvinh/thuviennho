create extension if not exists pgcrypto with schema extensions;

create table public.reading_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_vi text not null,
  name_en text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.reading_themes(id) on delete restrict,
  slug text not null unique,
  title_vi text not null,
  title_en text not null,
  summary_vi text not null default '',
  summary_en text not null default '',
  reading_level smallint not null check (reading_level in (1, 2)),
  estimated_minutes smallint not null default 5 check (estimated_minutes > 0),
  cover_image_path text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_sentences (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  text_vi text not null,
  text_en text not null,
  audio_vi_path text,
  audio_en_path text,
  unique (story_id, sequence_no)
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sequence_no integer not null default 0,
  word_vi text not null,
  word_en text not null,
  meaning_vi text not null,
  example_vi text not null default '',
  pronunciation_path text,
  illustration_path text,
  unique (story_id, word_vi, word_en)
);

create table public.reading_questions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  question_vi text not null,
  question_en text not null default '',
  options jsonb not null default '[]'::jsonb,
  unique (story_id, sequence_no),
  check (jsonb_typeof(options) = 'array')
);

-- Answers are kept separate so public reading clients cannot fetch the answer key.
create table public.reading_answers (
  question_id uuid primary key references public.reading_questions(id) on delete cascade,
  correct_option smallint not null check (correct_option >= 0),
  explanation_vi text not null default ''
);

create index stories_theme_level_published_idx
  on public.stories (theme_id, reading_level, is_published);
create index story_sentences_story_sequence_idx
  on public.story_sentences (story_id, sequence_no);
create index vocabulary_story_sequence_idx
  on public.vocabulary (story_id, sequence_no);
create index reading_questions_story_sequence_idx
  on public.reading_questions (story_id, sequence_no);

alter table public.reading_themes enable row level security;
alter table public.stories enable row level security;
alter table public.story_sentences enable row level security;
alter table public.vocabulary enable row level security;
alter table public.reading_questions enable row level security;
alter table public.reading_answers enable row level security;

create policy "Anyone can read themes"
  on public.reading_themes for select
  to anon, authenticated
  using (true);

create policy "Anyone can read published stories"
  on public.stories for select
  to anon, authenticated
  using (is_published = true);

create policy "Anyone can read content for published stories"
  on public.story_sentences for select
  to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = story_sentences.story_id and stories.is_published = true
  ));

create policy "Anyone can read vocabulary for published stories"
  on public.vocabulary for select
  to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = vocabulary.story_id and stories.is_published = true
  ));

create policy "Anyone can read questions for published stories"
  on public.reading_questions for select
  to anon, authenticated
  using (exists (
    select 1 from public.stories
    where stories.id = reading_questions.story_id and stories.is_published = true
  ));

-- Intentionally no read policy on reading_answers. Answer checking will be added
-- as a server-side function in the reading-games implementation step.
