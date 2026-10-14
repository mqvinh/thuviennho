alter table story_sentences add column if not exists audio_vi_path text;
alter table story_sentences add column if not exists audio_en_path text;
alter table vocabulary add column if not exists pronunciation_path text;
alter table vocabulary add column if not exists illustration_path text;
alter table reading_questions add column if not exists kind text not null default 'choice';
alter table reading_answers add column if not exists correct_order jsonb;
alter table stories add column if not exists review_status text not null default 'draft';
alter table stories add column if not exists source_note text not null default '';
alter table stories add column if not exists license_note text not null default '';
alter table stories add column if not exists owner_id uuid;
update stories set review_status = 'published' where is_published = true;

insert into reading_questions (story_id, sequence_no, question_vi, question_en, options, kind)
select id, 2, 'Bạn nào đang đói?', 'Who is hungry?', '["Bạn Rùa", "Bạn Sóc", "Bạn Chim"]'::jsonb, 'choice'
from stories where slug = 'tho-con-biet-se-chia' on conflict (story_id, sequence_no) do nothing;
insert into reading_answers (question_id, correct_option, explanation_vi)
select q.id, 0, 'Bạn Rùa đang đói nên Thỏ con chia cà rốt cho bạn.' from reading_questions q join stories s on s.id = q.story_id
where s.slug = 'tho-con-biet-se-chia' and q.sequence_no = 2 on conflict (question_id) do nothing;
insert into reading_questions (story_id, sequence_no, question_vi, question_en, options, kind)
select id, 3, 'Sắp xếp những việc trong truyện theo thứ tự.', 'Put the events in order.',
 '["Thỏ con chia cà rốt cho bạn Rùa.", "Thỏ con có một củ cà rốt.", "Thỏ con biết bạn Rùa đang đói."]'::jsonb, 'order'
from stories where slug = 'tho-con-biet-se-chia' on conflict (story_id, sequence_no) do nothing;
insert into reading_answers (question_id, correct_option, correct_order, explanation_vi)
select q.id, 0, '[1,2,0]'::jsonb, 'Thỏ con có cà rốt, biết bạn Rùa đói rồi chia cà rốt cho bạn.' from reading_questions q join stories s on s.id = q.story_id
where s.slug = 'tho-con-biet-se-chia' and q.sequence_no = 3 on conflict (question_id) do nothing;

create table if not exists teacher_users (
 id uuid primary key default gen_random_uuid(), username text not null unique,
 password_hash text not null, role text not null check(role in ('teacher','admin'))
);
create table if not exists teacher_sessions (
 token_hash text primary key, user_id uuid not null references teacher_users(id) on delete cascade,
 expires_at timestamptz not null
);
create table if not exists login_attempts (key text primary key, attempts integer not null default 0, reset_at timestamptz not null);
create table if not exists media_files (path text primary key, owner_id uuid not null references teacher_users(id) on delete cascade);
