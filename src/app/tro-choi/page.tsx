import { Suspense } from "react";
import { io } from "next/cache";
import { CatalogBanner } from "@/components/catalog-banner";
import { GamesCatalog } from "@/components/games-catalog";
import { LoadingIndicator } from "@/components/loading-indicator";
import { getWords, getSequenceStories } from "@/lib/library";

export const metadata = { title: "Khu trò chơi · Thư Viện Nhỏ" };
export default function GamesPage() {
  return <div className="library-page games-page"><CatalogBanner kind="games" /><Suspense fallback={<LoadingIndicator label="Đang mở Khu trò chơi" />}><Content /></Suspense></div>;
}
async function Content() { await io(); const [words, sequenceStories] = await Promise.all([getWords(), getSequenceStories()]); return <GamesCatalog words={words} sequenceStories={sequenceStories} />; }
