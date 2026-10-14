"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/lib/sections";
export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Các khu vực thư viện" className="navigation">
      {sections.map((section) => {
        const active =
          section.href === "/"
            ? pathname === "/" ||
              pathname.startsWith("/doc/") ||
              pathname.startsWith("/truyen/")
            : pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{section.icon}</span> {section.title}
          </Link>
        );
      })}
    </nav>
  );
}
