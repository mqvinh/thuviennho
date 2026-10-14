import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sections } from "@/lib/sections";
export default function SectionPage({ params }: PageProps<"/[section]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Đang mở khu vực" />}>
      <Section params={params} />
    </Suspense>
  );
}
async function Section({ params }: Pick<PageProps<"/[section]">, "params">) {
  const { section } = await params;
  const item = sections.find((s) => s.href === `/${section}`);
  if (!item) notFound();
  return (
    <section className="panel empty">
      <span aria-hidden="true" className="text-5xl">
        {item.icon}
      </span>
      <h1>{item.title}</h1>
      <p>Khu vực này đang được chuẩn bị.</p>
      <p>Trong lúc chờ, em có thể khám phá các câu chuyện trong tủ sách nhé!</p>
      <Link className="button" href="/">
        Khám phá tủ sách
      </Link>
    </section>
  );
}
