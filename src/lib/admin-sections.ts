export const adminTitles = {
  truyen: "Truyện của tôi",
  "tai-khoan": "Tài khoản",
  "nguoi-dung": "Quản lý người dùng",
  "chu-de": "Chủ đề",
  "cai-dat": "Cài đặt website",
  ai: "AI hỗ trợ",
  "bien-tap": "Biên tập truyện",
  "bien-tap-chu-de": "Biên tập chủ đề",
  "bien-tap-nguoi-dung": "Biên tập người dùng",
};
export type AdminView = keyof typeof adminTitles;
export const adminNavigation = [
  { key: "tai-khoan", title: "Tài khoản", adminOnly: false },
  { key: "truyen", title: "Truyện của tôi", adminOnly: false },
  { key: "chu-de", title: "Chủ đề", adminOnly: true },
  { key: "nguoi-dung", title: "Quản lý người dùng", adminOnly: true },
  { key: "ai", title: "AI hỗ trợ", adminOnly: false },
  { key: "cai-dat", title: "Cài đặt website", adminOnly: true },
] as const;
export const adminOnlyViews: AdminView[] = ["chu-de", "nguoi-dung", "cai-dat", "bien-tap-chu-de", "bien-tap-nguoi-dung"];
