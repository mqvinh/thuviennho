import { Suspense } from "react";
import { io } from "next/cache";
import { CatalogBanner } from "@/components/catalog-banner";
import { MatchingGame } from "@/components/matching-game";
import { LoadingIndicator } from "@/components/loading-indicator";
import { getWords } from "@/lib/library";

export const metadata = { title: "Ghép từ với hình · Thư Viện Nhỏ" };
export default function MatchingPage() {
  return <div className="library-page games-page"><CatalogBanner kind="matching" /><Suspense fallback={<LoadingIndicator label="Đang chuẩn bị những cặp từ và hình" />}><Content /></Suspense></div>;
}
async function Content() { await io(); return <MatchingGame words={await getWords()} />; }
