export const sections = [
  { href: "/", title: "Tủ sách song ngữ", icon: "📚" },
  { href: "/nghe-sach", title: "Nghe sách", icon: "🎧" },
  { href: "/tu-vung", title: "Góc từ vựng", icon: "🌱" },
  { href: "/thu-tai", title: "Đọc vui thử tài", icon: "🧩" },
  { href: "/tro-choi", title: "Khu trò chơi", icon: "🎮" },
  { href: "/nhat-ky", title: "Nhật ký đọc sách", icon: "✏️" },
  { href: "/hanh-trinh", title: "Hành trình đọc sách", icon: "🌟" },
];

export const mobileNavigationQuery = "(max-width: 760px)";

export function isSectionActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/" || pathname.startsWith("/doc/") || pathname.startsWith("/truyen/")
    : pathname === href || pathname.startsWith(`${href}/`);
}
