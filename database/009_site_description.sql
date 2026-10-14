alter table site_settings add column if not exists site_description text not null
  default 'Little Readers · Cùng đọc mỗi ngày';
