export type SequenceCard = { id: string; text_vi: string; image_path: string; audio_path: string; hint_vi: string };
export type SequenceStory = { slug: string; title_vi: string; theme_slug: string | null; theme_vi: string; cover_image_path: string | null; sequence_cards: SequenceCard[] };
export type SequenceProgress = { plays: number; bestStars: number; lastStars: number; lastAttempts: number; lastHints: number; lastPlayed: string };
export type SequenceHistory = Record<string, SequenceProgress>;

export function validateSequenceCards(value: unknown): SequenceCard[] {
  if (!Array.isArray(value) || value.length > 6) throw Error("Trò xếp tranh có tối đa 6 thẻ.");
  const text = (value: unknown, max: number) => {
    if (typeof value !== "string" || value.length > max) throw Error("Kiểm tra mô tả và gợi ý của thẻ tranh.");
    return value.trim();
  };
  const media = (value: unknown, audio = false) => {
    const path = text(value ?? "", 300);
    if (path && !(audio ? /^\/media\/[a-f0-9-]+\.(mp3|wav|ogg)$/ : /^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/).test(path)) throw Error("Chọn đúng tệp ảnh hoặc audio đã tải lên cho thẻ tranh.");
    return path;
  };
  const cards = value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw Error("Thẻ tranh không hợp lệ.");
    const row = item as Record<string, unknown>, id = text(row.id, 36);
    if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) throw Error("Mã thẻ tranh không hợp lệ.");
    return { id, text_vi: text(row.text_vi, 300), hint_vi: text(row.hint_vi, 300), image_path: media(row.image_path), audio_path: media(row.audio_path, true) };
  });
  if (new Set(cards.map(card => card.id)).size !== cards.length) throw Error("Mã thẻ tranh bị trùng.");
  return cards;
}

export function sequenceReady(value: unknown): value is SequenceCard[] {
  try {
    const cards = validateSequenceCards(value);
    return cards.length >= 4 && cards.every(card => !!card.text_vi && !!card.hint_vi && !!card.image_path)
      && new Set(cards.map(card => card.text_vi.normalize("NFKC").toLocaleLowerCase("vi"))).size === cards.length
      && new Set(cards.map(card => card.image_path)).size === cards.length;
  } catch { return false; }
}

export function sequenceStars(attempts: number, hints: number) {
  return attempts === 1 && hints === 0 ? 3 : attempts <= 3 && hints <= 1 ? 2 : 1;
}

// Moving a placed card swaps it with the target; a displaced bank card returns
// to the bank. Correct positions cannot be moved after checking an answer.
export function placeSequenceCard(slots: (string | null)[], id: string, target: number, locked: boolean[]) {
  if (target < 0 || target >= slots.length || locked[target]) return slots;
  const from = slots.indexOf(id);
  if (from === target || (from >= 0 && locked[from])) return slots;
  const next = [...slots];
  if (from >= 0) next[from] = next[target];
  next[target] = id;
  return next;
}

export function shuffledSequence(cards: SequenceCard[], random = Math.random) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  if (deck.every((card, index) => card.id === cards[index].id) && deck.length > 1) deck.push(deck.shift()!);
  return deck;
}

export function recordSequenceGame(previous: SequenceProgress | undefined, attempts: number, hints: number, now = Date.now()): SequenceProgress {
  const stars = sequenceStars(attempts, hints);
  return { plays: (previous?.plays ?? 0) + 1, bestStars: Math.max(previous?.bestStars ?? 0, stars), lastStars: stars, lastAttempts: attempts, lastHints: hints, lastPlayed: new Date(now).toISOString() };
}
