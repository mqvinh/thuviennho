alter table reading_themes add column if not exists icon_path text;

-- Preserve the existing visual choices as editable image fields.
update reading_themes set icon_path = case
  when slug = 'kindness-sharing' or name_vi ilike '%lòng tốt%' or name_vi ilike '%sẻ chia%' then '/images/themes/kindness-sharing.png'
  when slug = 'family' or name_vi ilike '%gia đình%' then '/images/themes/family.png'
  when slug = 'nature' or name_vi ilike '%thiên nhiên%' then '/images/themes/nature.png'
  when slug = 'good-habits' or name_vi ilike '%thói quen%' then '/images/themes/good-habits.png'
  when slug = 'school' or name_vi ilike '%trường học%' then '/images/themes/school.png'
  when slug = 'friendship' or name_vi ilike '%tình bạn%' then '/images/themes/friendship.png'
  else '/images/themes/book.png'
end where icon_path is null;
