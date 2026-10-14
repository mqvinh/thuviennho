import Image from "next/image";

export function ThemeIcon({ path }: { path?: string | null }) {
  const source = path?.startsWith("/") && !path.startsWith("//") ? path : "/images/themes/book.png";
  return <Image className="theme-icon-image" src={source} alt="" width={32} height={32} unoptimized />;
}
