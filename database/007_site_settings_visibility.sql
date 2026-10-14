-- Visibility is independent of the review/publication workflow.
alter table stories add column if not exists is_visible boolean not null default true;

create table if not exists site_settings (
  id boolean primary key default true check (id = true),
  site_name text not null default 'Thư Viện Nhỏ',
  icon_path text not null default '',
  logo_path text not null default ''
);
insert into site_settings(id) values(true) on conflict(id) do nothing;
