import Link from "next/link";
import { ListeningIcon } from "./listening-icon";
import { IllustrationScene } from "./illustration-scene";
import { BookArtwork, GardenCorners } from "./reading-artwork";

const banners = {
  support: { eyebrow: "Cùng khám phá, từng bước dễ dàng", title: "Bạn cần hỗ trợ điều gì?", description: "Hướng dẫn chơi, theo dõi hành trình và giữ lại tiến độ. Cùng phụ huynh, giáo viên khám phá từng chức năng của thư viện.", href: "#help-guides", action: "Xem hướng dẫn", icon: "help", ticket: "Có hướng dẫn bên bạn", goal: "Từng bước", benefit: "dễ làm theo!", tip: "Mở hướng dẫn ngay khi cần, thực hành một chút và tiếp tục khám phá theo nhịp của mình." },
  sequencing: { eyebrow: "Mỗi bức tranh, một phần câu chuyện", title: "Cùng em xếp tranh kể chuyện!", description: "Chuyện gì xảy ra đầu tiên, chuyện gì đến sau? Xếp những bức tranh, tìm gợi ý và cùng kể lại câu chuyện theo đúng diễn biến.", href: "#sequence-game", action: "Chọn truyện để chơi", icon: "book", ticket: "Nhớ truyện từng bước", goal: "3–5 phút", benefit: "một câu chuyện hay!", tip: "Không cần vội. Cùng suy nghĩ vì sao sự việc này xảy ra trước sự việc kia nhé!" },
  matching: { eyebrow: "Một từ nhỏ, một hình ảnh thân quen", title: "Cùng em ghép từ với hình!", description: "Chọn một từ rồi chạm vào hình phù hợp, hoặc kéo từ vào hình. Ghép từng cặp, nghe phát âm và cùng khám phá những từ trong câu chuyện.", href: "#matching-game", action: "Bắt đầu ghép từ", icon: "image", ticket: "Một lượt vui học", goal: "2–4 phút", benefit: "khám phá cùng nhau!", tip: "Em cứ chơi theo nhịp của mình. Chưa khớp thì thử lại, mỗi lần ghép là một lần nhớ thêm!" },
  games: { eyebrow: "Chơi một chút, khám phá thêm nhiều điều!", title: "Cùng em học qua trò chơi!", description: "Lật thẻ, ghép từ với hình và xếp tranh kể chuyện. Những trò chơi nhỏ giúp em nhớ từ mới và hiểu câu chuyện theo nhịp của mình.", href: "#games", action: "Khám phá trò chơi", icon: "trophy", ticket: "Vui học hôm nay", goal: "Mỗi ngày", benefit: "một khám phá mới!", tip: "Cứ thử sức. Sai một chút cũng là một cách học. Cùng ôn lại mỗi ngày nhé!" },
  flashcard: { eyebrow: "Lật một chiếc thẻ, nhớ thêm một từ", title: "Flashcard từ vựng thông minh", description: "Xem hình, lật thẻ và nghe phát âm tiếng Anh. Cùng chọn hình đúng rồi ôn lại những từ cần luyện thêm theo lịch riêng của em.", href: "#flashcard-game", action: "Bắt đầu khám phá", icon: "sprout", ticket: "Nhớ từ từng bước", goal: "Mỗi ngày", benefit: "một chút thôi!", tip: "Từ khó sẽ được gặp lại sớm hơn. Từ đã nhớ sẽ được ôn sau 1, 3, 7 và 14 ngày." },
  library: { eyebrow: "Chào mừng bạn đến với thư viện của em!", title: "Hôm nay, em muốn mở cuốn sách nào?", description: "Những câu chuyện nhỏ, mang đến những bài học lớn. Chọn một cuốn sách và bắt đầu hành trình đọc song ngữ Việt – Anh thật thú vị nhé!", href: "#books", action: "Chọn sách để đọc", icon: "book", ticket: "Thử đọc hôm nay", goal: "5 phút", benefit: "cho một điều hay!", tip: "Chậm lại một chút. Đọc thêm một trang. Thế giới sẽ rộng mở hơn!" },
  audio: { eyebrow: "Cùng lắng nghe những câu chuyện hay", title: "Một câu chuyện, hai ngôn ngữ!", description: "Chọn một câu chuyện, chạm nút nghe và cùng theo dõi từng câu. Em có thể nghe lại với tốc độ vừa sức mình.", href: "#books", action: "Chọn truyện để nghe", icon: "headphones", ticket: "Lắng nghe hôm nay", goal: "5 phút", benefit: "cho đôi tai nhỏ!", tip: "Nghe một câu. Đọc theo một chút. Mỗi lần nghe là một điều mới!" },
  quiz: { eyebrow: "Đọc xong rồi, cùng thử tài nhé!", title: "Em nhớ gì từ câu chuyện?", description: "Chọn truyện có câu hỏi, tìm đáp án hoặc sắp xếp diễn biến. Em cứ thử sức, đọc lại và khám phá theo cách của mình nhé!", href: "#books", action: "Chọn truyện thử tài", icon: "tip", ticket: "Thử sức hôm nay", goal: "Một câu", benefit: "một khám phá!", tip: "Đọc kỹ câu hỏi. Suy nghĩ một chút. Em làm được mà!" },
  vocabulary: { eyebrow: "Mỗi từ mới là một khám phá nhỏ", title: "Cùng em mở vườn từ mới!", description: "Khám phá từ tiếng Việt và tiếng Anh trong các câu chuyện. Cùng học nghĩa, xem ví dụ và lưu những từ em yêu thích nhé!", href: "#vocabulary-catalog", action: "Khám phá từ mới", icon: "sprout", ticket: "Học từ hôm nay", goal: "Một từ", benefit: "thêm một ý hay!", tip: "Đọc từ mới. Xem một ví dụ. Thử dùng từ để kể chuyện!" },
  journal: { eyebrow: "Góc nhỏ để em kể lại điều đã đọc", title: "Câu chuyện hôm nay của em!", description: "Nhớ lại nhân vật yêu thích, kể điều em học được và vẽ một bức tranh. Mỗi trang nhật ký giữ lại một khám phá nhỏ của em.", href: "#journal-form", action: "Viết nhật ký", icon: "pencil", ticket: "Kể chuyện hôm nay", goal: "Một trang", benefit: "một kỷ niệm!", tip: "Viết một điều hay. Vẽ một điều em nhớ. Cùng lớn lên qua từng câu chuyện!" },
  journey: { eyebrow: "Mỗi bước khám phá đều đáng quý", title: "Cùng nhìn lại hành trình đọc!", description: "Những câu chuyện đã đọc, những bài thử tài đã làm và những huy hiệu nhỏ đang chờ em. Cứ đọc theo nhịp của mình nhé!", href: "#journey-summary", action: "Xem hành trình", icon: "book", ticket: "Cùng đọc mỗi ngày", goal: "Từng bước", benefit: "thêm tự tin!", tip: "Em không cần đọc thật nhanh. Mỗi lần mở sách là một bước tiến nhỏ!" },
} as const;

export function CatalogBanner({ kind }: { kind: keyof typeof banners }) {
  const banner = banners[kind];
  return <IllustrationScene as="section" className={`shelf-welcome collection-banner banner-${kind}`} aria-labelledby={`${kind}-banner-title`}>
    <div className="hero">
      <p className="eyebrow">{banner.eyebrow}</p>
      <h1 id={`${kind}-banner-title`}>{banner.title}</h1>
      <p>{banner.description}</p>
      <div className="hero-actions">
        <Link href={banner.href} className="button"><ListeningIcon name={banner.icon} />{banner.action}<ListeningIcon name="arrow-right" /></Link>
        <Link href={kind === "library" ? "/nghe-sach" : "/"} className="button secondary"><ListeningIcon name={kind === "library" ? "headphones" : "book"} />{kind === "library" ? "Nghe sách" : "Về tủ sách"}</Link>
      </div>
    </div>
    <div className="shelf-welcome-art" aria-hidden="true"><BookArtwork /></div>
    <aside className="reading-ticket" aria-label={banner.ticket}>
      <span className="reading-ticket-sun" aria-hidden="true">☀</span>
      <p className="eyebrow">{banner.ticket}</p>
      <h2><strong>{banner.goal}</strong>{" "}<span>{banner.benefit}</span></h2>
      <p>{banner.tip}</p>
    </aside>
    <GardenCorners />
  </IllustrationScene>;
}
