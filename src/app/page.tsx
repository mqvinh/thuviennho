import { Suspense } from "react";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { CatalogBanner } from "@/components/catalog-banner";
import { DiscoveryHome } from "@/components/discovery-home";
import { LoadingIndicator } from "@/components/loading-indicator";
import { getDailyQuestions, getLibrary, getWords } from "@/lib/library";

export const metadata = { title: "Khám phá · Thư Viện Nhỏ" };
type Search = Promise<Record<string, string | string[] | undefined>>;
export default function Home({ searchParams }: { searchParams: Search }) {
  return <div className="library-page discovery-page"><CatalogBanner kind="discovery" /><Suspense fallback={<LoadingIndicator label="Đang chuẩn bị góc học hôm nay" />}><Content searchParams={searchParams} /></Suspense></div>;
}
async function Content({ searchParams }: { searchParams: Search }) {
  await io();
  const query = await searchParams;
  if (typeof query["chu-de"] === "string") redirect(`/tu-sach?chu-de=${encodeURIComponent(query["chu-de"])}#books`);
  const [{ stories }, words, questions] = await Promise.all([getLibrary(), getWords(), getDailyQuestions()]);
  return <DiscoveryHome stories={stories} words={words} questions={questions} />;
}
