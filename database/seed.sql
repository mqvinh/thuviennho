insert into public.reading_themes (slug, name_vi, name_en, sort_order)
values ('kindness-sharing', 'Lòng tốt và sẻ chia', 'Kindness and Sharing', 1)
on conflict (slug) do nothing;

insert into public.stories (
  theme_id, slug, title_vi, title_en, summary_vi, summary_en,
  reading_level, estimated_minutes, is_published
)
select
  id, 'tho-con-biet-se-chia', 'Thỏ con biết sẻ chia',
  'The Little Rabbit Learns to Share',
  'Thỏ con chia củ cà rốt với bạn Rùa đang đói.',
  'A little rabbit shares a carrot with a hungry turtle.',
  1, 5, true
from public.reading_themes
where slug = 'kindness-sharing'
on conflict (slug) do nothing;

insert into public.story_sentences (story_id, sequence_no, text_vi, text_en)
select id, 1, 'Thỏ con có một củ cà rốt.', 'The little rabbit has a carrot.'
from public.stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;

insert into public.story_sentences (story_id, sequence_no, text_vi, text_en)
select id, 2, 'Bạn Rùa đang đói. Thỏ con chia củ cà rốt cho bạn.',
  'Turtle is hungry. Rabbit shares the carrot.'
from public.stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;

insert into public.vocabulary (story_id, sequence_no, word_vi, word_en, meaning_vi, example_vi)
select id, 1, 'chia sẻ', 'share', 'Cho người khác cùng dùng hoặc cùng nhận.', 'Em chia sẻ đồ chơi với bạn.'
from public.stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, word_vi, word_en) do nothing;

insert into public.reading_questions (story_id, sequence_no, question_vi, question_en, options)
select id, 1, 'Thỏ con đã làm gì khi biết bạn Rùa đói?',
  'What did the rabbit do when Turtle was hungry?',
  '["Thỏ con bỏ đi.", "Thỏ con chia cà rốt.", "Thỏ con giấu cà rốt."]'::jsonb
from public.stories where slug = 'tho-con-biet-se-chia'
on conflict (story_id, sequence_no) do nothing;

insert into public.reading_answers (question_id, correct_option, explanation_vi)
select id, 1, 'Thỏ con đã chia củ cà rốt với bạn Rùa.'
from public.reading_questions
where question_vi = 'Thỏ con đã làm gì khi biết bạn Rùa đói?'
on conflict (question_id) do nothing;
