-- Deleting a theme removes the association, while preserving its stories.
alter table stories alter column theme_id drop not null;
alter table stories drop constraint if exists stories_theme_id_fkey;
alter table stories add constraint stories_theme_id_fkey
  foreign key (theme_id) references reading_themes(id) on delete set null;
