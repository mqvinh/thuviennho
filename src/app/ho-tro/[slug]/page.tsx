import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogBanner } from "@/components/catalog-banner";
import { HelpArticle } from "@/components/help-article";
import { HelpNavigation } from "@/components/help-navigation";
import { helpGuides } from "@/lib/help-guides";

export function generateStaticParams() { return helpGuides.map(guide => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, guide = helpGuides.find(item => item.slug === slug);
  return { title: guide ? `Hướng dẫn ${guide.title} · Thư Viện Nhỏ` : "Không tìm thấy hướng dẫn" };
}
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, guide = helpGuides.find(item => item.slug === slug);
  if (!guide) notFound();
  return <div className="library-page support-page"><CatalogBanner kind="support" />
    <nav className="help-breadcrumb" aria-label="Vị trí trang"><Link href="/ho-tro">← Hỗ trợ</Link><span>{guide.title}</span></nav>
    <div id="help-guides" className="help-page-layout"><HelpNavigation key={guide.slug} active={guide.slug} /><HelpArticle guide={guide} /></div>
  </div>;
}
