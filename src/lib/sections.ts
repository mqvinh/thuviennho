export const sections = [
  { href: "/", title: "Khám phá", icon: "🧭" },
  { href: "/tu-sach", title: "Tủ sách song ngữ", icon: "📚" },
  { href: "/nghe-sach", title: "Nghe sách", icon: "🎧" },
  { href: "/tu-vung", title: "Góc từ vựng", icon: "🌱" },
  { href: "/thu-tai", title: "Đọc vui thử tài", icon: "🧩" },
  { href: "/tro-choi", title: "Khu trò chơi", icon: "🎮" },
  { href: "/nhat-ky", title: "Nhật ký đọc sách", icon: "✏️" },
  { href: "/hanh-trinh", title: "Hành trình đọc sách", icon: "🌟" },
  { href: "/ho-tro", title: "Hỗ trợ", icon: "❔" },
];

export const mobileNavigationQuery = "(max-width: 760px)";

export function isSectionActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/tu-sach" && (pathname.startsWith("/doc/") || pathname.startsWith("/truyen/"))) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
