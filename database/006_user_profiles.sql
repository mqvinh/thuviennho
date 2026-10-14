alter table teacher_users add column if not exists full_name text not null default '';
alter table teacher_users add column if not exists email text not null default '';
