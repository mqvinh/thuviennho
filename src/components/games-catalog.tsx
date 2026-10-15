"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Word } from "@/lib/library";
import { useDeviceData } from "@/lib/device-store";
import { dueWords, flashcardReady } from "@/lib/flashcards";
import { uniqueMatchingWords } from "@/lib/matching";
import type { SequenceStory } from "@/lib/sequencing";
import { IllustrationScene } from "./illustration-scene";
import { GardenCorners } from "./reading-artwork";
import { ListeningIcon } from "./listening-icon";

export function GamesCatalog({ words, sequenceStories }: { words: Word[]; sequenceStories: SequenceStory[] }) {
  const { data } = useDeviceData();
  const [now] = useState(() => Date.now());
  const ready = words.filter(flashcardReady);
  const due = dueWords(ready, data.flashcards, now).length;
  return <section id="games" className="games-catalog" aria-labelledby="games-title">
    <div className="games-section-heading"><span className="games-heading-symbol" aria-hidden="true">🎮</span><div><h2 id="games-title">Chọn một trò chơi yêu thích</h2><p>Mỗi lượt chơi là một cách khám phá và ghi nhớ điều mới.</p></div></div>
    <div className="games-grid">
      <IllustrationScene className="game-card">
        <Link href="/tro-choi/flashcard" className="game-card-link">
          <div className="game-card-image"><Image src="/images/games-flashcard.svg" alt="Những thẻ hình màu sắc để khám phá từ vựng" width={600} height={360} /><GardenCorners /></div>
          <div className="game-card-body"><span className="game-category">VIỆT – ANH · GHI NHỚ TỪ</span><h3>Flashcard từ vựng thông minh</h3><p>Mỗi thẻ có hình, từ tiếng Việt, tiếng Anh và nút nghe. Lật thẻ, chọn hình đúng rồi ôn lại những từ cần luyện thêm theo lịch.</p>
          <div className="game-card-meta"><span><ListeningIcon name="sprout" />{ready.length} từ sẵn sàng</span><span><ListeningIcon name="clock" />5–10 phút / lượt</span></div>
          {due > 0 && <p className="game-due-badge">Hôm nay cần ôn {due} từ</p>}
          <span className="button game-play">Chơi ngay<ListeningIcon name="arrow-right" /></span></div>
        </Link>
      </IllustrationScene>
      <IllustrationScene className="game-card">
        <Link href="/tro-choi/ghep-tu-voi-hinh" className="game-card-link">
          <div className="game-card-image"><Image src="/images/games-matching.svg" alt="Ghép các thẻ từ với hình quyển sách và chiếc lá" width={600} height={360} /><GardenCorners /></div>
          <div className="game-card-body"><span className="game-category">VIỆT – ANH · TÌM ĐÚNG CẶP</span><h3>Ghép từ với hình</h3><p>Chạm hoặc kéo từng từ vào hình phù hợp. Cùng ghép những cặp từ thân quen và luyện lại các từ cần nhớ thêm.</p>
            <div className="game-card-meta"><span><ListeningIcon name="image" />{uniqueMatchingWords(words).length} từ có hình</span><span><ListeningIcon name="clock" />2–4 phút / lượt</span></div>
            <span className="button game-play">Chơi ngay<ListeningIcon name="arrow-right" /></span>
          </div>
        </Link>
      </IllustrationScene>
      <IllustrationScene className="game-card">
        <Link href="/tro-choi/xep-tranh-ke-chuyen" className="game-card-link">
          <div className="game-card-image"><Image src="/images/games-sequencing.svg" alt="Những bức tranh hạt đậu, mầm xanh và cây nhỏ được xếp thành câu chuyện" width={600} height={360} /><GardenCorners /></div>
          <div className="game-card-body"><span className="game-category">ĐỌC HIỂU · NHỚ DIỄN BIẾN</span><h3>Xếp tranh kể chuyện</h3><p>Chạm hoặc kéo các tranh theo thứ tự sự việc. Tìm gợi ý, nhận ngôi sao và cùng kể lại câu chuyện của em.</p><div className="game-card-meta"><span><ListeningIcon name="book" />{sequenceStories.length} truyện có bộ tranh</span><span><ListeningIcon name="clock" />3–5 phút / lượt</span></div><span className="button game-play">Chơi ngay<ListeningIcon name="arrow-right" /></span></div>
        </Link>
      </IllustrationScene>
    </div>
    <p className="games-device-note"><ListeningIcon name="info" />Tiến độ lưu trên trình duyệt này. Em có thể tải bản sao tại <Link href="/hanh-trinh">Hành trình đọc sách</Link>.</p>
  </section>;
}
