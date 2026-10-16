export type HelpGuide = {
  slug: string;
  title: string;
  icon: string;
  href: string;
  summary: string;
  duration: string;
  sections: { title: string; paragraphs?: string[]; steps?: string[] }[];
  questions: { question: string; answer: string }[];
};

export const helpGuides: HelpGuide[] = [
  {
    slug: "flashcard", title: "Flashcard từ vựng thông minh", icon: "🃏", href: "/tro-choi/flashcard",
    summary: "Lật thẻ, nghe phát âm và chọn hình để ghi nhớ từ mới theo lịch ôn của riêng bạn.", duration: "5–10 phút / lượt",
    sections: [
      { title: "Chọn bộ từ vừa sức", paragraphs: ["Vào Khu trò chơi, chọn Flashcard từ vựng thông minh. Mỗi từ cần có hình minh họa và audio phát âm để tham gia trò chơi."], steps: ["Lọc theo Chủ đề hoặc Truyện nếu muốn ôn một nội dung cụ thể.", "Chọn Bộ từ: Tất cả các từ, Từ yêu thích hoặc Đến lịch ôn.", "Chọn 5, 10 hoặc 20 từ mỗi lượt rồi bắt đầu. Nếu bộ từ ít hơn, trò chơi dùng số từ phù hợp đang có."] },
      { title: "Xem thẻ rồi thử nhớ", steps: ["Quan sát hình và thử nói tên đồ vật trước khi lật thẻ.", "Chạm thẻ để xem từ tiếng Việt, tiếng Anh và nghĩa. Bấm Nghe phát âm để nghe tiếng Anh.", "Xem các thẻ, sau đó vào phần thử tài: đọc hoặc nghe từ tiếng Anh rồi chọn hình phù hợp.", "Nếu chọn chưa đúng, đọc phần giải thích và thử ghi nhớ. Từ đó sẽ được luyện lại trong lượt chơi."] },
      { title: "Theo dõi lịch ôn", paragraphs: ["Kết quả cho biết những từ đã nhớ ở lần trả lời đầu tiên và những từ cần luyện thêm. Chọn Ôn từ cần luyện thêm để gặp lại các từ khó.", "Những từ đã nhớ được hẹn ôn sau 1, 3, 7 và 14 ngày; từ chưa nhớ sẽ được gặp lại sớm hơn. Lần sau, chọn Đến lịch ôn để tiếp tục.", "Phụ huynh và giáo viên có thể cùng trẻ nói một câu ngắn với từ vừa học, thay vì chỉ yêu cầu nhớ đáp án."] },
    ],
    questions: [
      { question: "Vì sao chưa có từ để chơi?", answer: "Thử bỏ bớt bộ lọc. Với Từ yêu thích, hãy lưu từ ở Góc từ vựng trước; với Đến lịch ôn, có thể chưa đến ngày hẹn. Từ chưa có đủ hình và audio sẽ chưa được đưa vào trò chơi." },
      { question: "Vì sao chỉ xem được thẻ, chưa có phần chọn hình?", answer: "Kho từ cần ít nhất ba hình khác nhau để tạo lựa chọn. Bạn vẫn có thể xem thẻ; lịch ôn bắt đầu sau khi làm phần thử tài." },
      { question: "Đổi thiết bị có giữ lịch ôn không?", answer: "Lịch ôn lưu trên trình duyệt đang dùng. Tải bản sao trong Hành trình đọc sách rồi khôi phục ở thiết bị mới để chuyển tiến độ." },
    ],
  },
  {
    slug: "ghep-tu-voi-hinh", title: "Ghép từ với hình", icon: "🧩", href: "/tro-choi/ghep-tu-voi-hinh",
    summary: "Tìm hình phù hợp với mỗi từ, luyện liên hệ giữa từ ngữ và hình ảnh qua từng vòng nhỏ.", duration: "2–4 phút / lượt",
    sections: [
      { title: "Chuẩn bị lượt chơi", steps: ["Vào Khu trò chơi và chọn Ghép từ với hình.", "Chọn Chủ đề, Truyện và Bộ từ: Tất cả các từ hoặc Từ yêu thích.", "Chọn ghép Tiếng Anh với hình hoặc Tiếng Việt với hình. Xem số từ và số vòng dự kiến rồi bắt đầu."] },
      { title: "Ghép từng cặp", steps: ["Chạm một từ trong khay để chọn, rồi chạm hình phù hợp. Trên máy tính, bạn cũng có thể kéo từ vào hình.", "Dùng nút nghe bên cạnh từ để nghe phát âm tiếng Anh nếu có audio.", "Cặp đúng được giữ lại. Nếu ghép chưa đúng, thử một hình khác và quan sát phản hồi.", "Ghép hết các cặp rồi bấm Vòng tiếp theo. Sau vòng cuối, chọn Xem kết quả."] },
      { title: "Ôn lại sau lượt chơi", paragraphs: ["Trang kết quả cho biết các cặp đã ghép và những từ cần luyện thêm. Chọn Luyện lại từ sai hoặc Chơi lượt mới để tiếp tục.", "Thời gian hiển thị giúp nhìn lại lượt chơi; trò chơi không bắt bạn phải hoàn thành trong một thời hạn đếm ngược.", "Cùng trẻ giải thích vì sao từ đó phù hợp với hình. Khi đã quen, chuyển sang ghép tiếng Anh để luyện thêm."] },
    ],
    questions: [
      { question: "Vì sao nút bắt đầu chưa bật?", answer: "Bộ lọc có thể còn quá ít từ khác nhau phù hợp. Thử chọn Tất cả các từ hoặc mở rộng chủ đề/truyện; số từ phù hợp được hiển thị ngay dưới bộ lọc." },
      { question: "Có phải kéo thả trên điện thoại không?", answer: "Không cần. Chạm từ rồi chạm hình là cách chơi đầy đủ trên điện thoại và máy tính." },
      { question: "Kết quả có làm thay đổi lịch ôn Flashcard không?", answer: "Hai trò chơi dùng chung nguồn từ vựng nhưng lưu kết quả riêng. Bạn có thể sao lưu cả hai trong Hành trình đọc sách." },
    ],
  },
  {
    slug: "xep-tranh-ke-chuyen", title: "Xếp tranh kể chuyện", icon: "🖼️", href: "/tro-choi/xep-tranh-ke-chuyen",
    summary: "Xếp 4–6 tranh theo diễn biến, tìm mối liên hệ giữa các sự việc rồi cùng kể lại câu chuyện.", duration: "3–5 phút / lượt",
    sections: [
      { title: "Chọn một câu chuyện", paragraphs: ["Vào Khu trò chơi và chọn Xếp tranh kể chuyện. Những truyện có bộ tranh đầy đủ sẽ xuất hiện ở đây."], steps: ["Lọc Chủ đề hoặc chọn Truyện em đã mở đọc/nghe để ôn nội dung quen thuộc.", "Bạn có thể Đọc lại truyện trước khi chơi. Bấm Chơi ngay để nhận bộ tranh đã đảo thứ tự."] },
      { title: "Đặt tranh theo diễn biến", steps: ["Quan sát tranh và đọc mô tả. Dùng nút nghe nếu muốn nghe nội dung; khi chưa có bản thu, thiết bị hỗ trợ sẽ dùng giọng đọc tiếng Việt.", "Chạm một tranh rồi chạm vị trí muốn đặt. Trên máy tính, cũng có thể kéo thả tranh vào vị trí.", "Muốn đổi chỗ, chọn tranh đã đặt rồi chọn vị trí mới. Hai tranh sẽ đổi chỗ; nút Lấy tranh ra đưa tranh về khay.", "Xếp đủ các tranh rồi bấm Kiểm tra câu chuyện. Tranh đúng chuyển xanh và được khóa; những tranh còn lại vẫn có thể thay đổi.", "Dùng Gợi ý khi cần, sửa các vị trí chưa đúng và kiểm tra lại đến khi hoàn thành."] },
      { title: "Ngôi sao và xem lại câu chuyện", paragraphs: ["3 sao: đúng ở lần kiểm tra đầu, không dùng gợi ý. 2 sao: hoàn thành trong tối đa 3 lần kiểm tra và dùng tối đa 1 gợi ý. Những lượt còn lại nhận 1 sao khi hoàn thành.", "Xếp lại từ đầu làm trống các vị trí nhưng vẫn giữ số lần kiểm tra và gợi ý của lượt hiện tại. Chơi lại sau khi hoàn thành sẽ bắt đầu một lượt mới.", "Xem lại diễn biến cho các tranh lần lượt xuất hiện theo thứ tự đúng và không ghi thêm kết quả. Thành tích tốt nhất được giữ trên trình duyệt này.", "Cùng trẻ kể lại bằng lời của mình: Chuyện gì xảy ra trước? Vì sao sự việc tiếp theo lại xảy ra?"] },
    ],
    questions: [
      { question: "Vì sao không có truyện mình muốn chơi?", answer: "Chỉ truyện đã xuất bản, đang hiển thị và có bộ 4–6 tranh đầy đủ mới được đưa vào trò chơi. Thử mở rộng bộ lọc hoặc chọn một truyện đang có." },
      { question: "Vì sao không di chuyển được một tranh?", answer: "Tranh đã được kiểm tra đúng sẽ khóa ở vị trí đó. Hãy đổi những tranh chưa đúng; hoặc dùng Xếp lại từ đầu nếu muốn sắp xếp lại cả bộ." },
      { question: "Không nghe được mô tả thì làm sao?", answer: "Thử bật âm lượng và bấm nghe lại. Khi không có bản thu, giọng tiếng Việt phụ thuộc thiết bị và trình duyệt. Bạn vẫn có thể chơi bằng phần mô tả viết trên mỗi tranh." },
    ],
  },
  {
    slug: "hanh-trinh-doc-sach", title: "Hành trình đọc sách", icon: "🌟", href: "/hanh-trinh",
    summary: "Nhìn lại truyện đã đọc, huy hiệu đạt được và tải bản sao để giữ nhật ký cùng tiến độ học tập.", duration: "Xem lại và lưu giữ",
    sections: [
      { title: "Xem những bước khám phá", paragraphs: ["Mở Hành trình đọc sách từ menu chính để xem số truyện đã khám phá, truyện đã hoàn thành và hoạt động của người học trên trình duyệt này.", "Đánh dấu hoàn thành trong trang đọc sau khi đọc xong để truyện được ghi vào phần đã hoàn thành. Huy hiệu mở dần theo việc đọc và viết nhật ký.", "Chọn một truyện trong danh sách để đọc lại. Phụ huynh và giáo viên có thể cùng người học nhắc lại nhân vật hoặc điều hay đã nhớ."] },
      { title: "Tải bản sao trước khi đổi thiết bị", steps: ["Trong Hành trình đọc sách, tìm khu vực sao lưu và khôi phục.", "Bấm Tải bản sao nhật ký và tiến độ. Trình duyệt tải về một tệp JSON; giữ tệp này ở nơi bạn dễ tìm lại.", "Bản sao gồm nhật ký và tranh vẽ, từ yêu thích, tiến độ đọc, lịch ôn Flashcard và kết quả hai trò Ghép từ với hình, Xếp tranh kể chuyện."] },
      { title: "Khôi phục trên thiết bị đang dùng", steps: ["Nếu thiết bị đang có dữ liệu cần giữ, tải bản sao hiện tại trước.", "Bấm Chọn bản sao nhật ký và chọn tệp do thư viện đã xuất ra.", "Đọc phần xem trước để kiểm tra nội dung. Việc chọn tệp chưa thay đổi dữ liệu hiện tại.", "Bấm Khôi phục bản sao rồi xác nhận. Bản sao sẽ thay thế nhật ký và tiến độ hiện có trên trình duyệt này."] },
      { title: "Dữ liệu của từng trình duyệt", paragraphs: ["Tiến độ này không tự đồng bộ qua tài khoản, không tự gửi cho giáo viên và không tự chuyển sang thiết bị khác. Cùng một máy nhưng dùng trình duyệt khác có thể thấy hành trình khác.", "Tránh xóa dữ liệu trình duyệt khi chưa tải bản sao. Nếu dùng chế độ riêng tư, dữ liệu có thể mất khi đóng phiên. Tải lại bản sao định kỳ sau những buổi học để giữ các ghi chép mới.", "Tệp sao lưu có thể chứa nhật ký và tranh của người học; chỉ chia sẻ khi bạn muốn người nhận xem những nội dung đó."] },
    ],
    questions: [
      { question: "Đăng nhập có tự mang tiến độ sang máy khác không?", answer: "Chưa. Hành trình của người học được lưu riêng trên trình duyệt. Hãy dùng Tải bản sao và Khôi phục bản sao để chuyển dữ liệu." },
      { question: "Bản sao cũ chưa có các trò chơi mới có dùng được không?", answer: "Có. Bản sao cũ đúng định dạng vẫn được đọc. Những phần trò chơi chưa có trong tệp sẽ bắt đầu với tiến độ trống khi khôi phục." },
      { question: "Khôi phục có ghép thêm vào dữ liệu hiện tại không?", answer: "Khôi phục thay thế dữ liệu hiện tại bằng nội dung trong tệp, không tự gộp hai hành trình. Tải bản sao hiện tại trước nếu bạn muốn giữ lại." },
    ],
  },
];

export function helpForPath(pathname: string) {
  return helpGuides.find(guide => guide.href === pathname.replace(/\/$/, ""));
}
