import { Suspense } from "react";
import { io } from "next/cache";
import { CatalogBanner } from "@/components/catalog-banner";
import { FlashcardGame } from "@/components/flashcard-game";
import { LoadingIndicator } from "@/components/loading-indicator";
import { getWords } from "@/lib/library";

export const metadata = { title: "Flashcard từ vựng thông minh · Thư Viện Nhỏ" };
export default function FlashcardPage() {
  return <div className="library-page games-page"><CatalogBanner kind="flashcard" /><Suspense fallback={<LoadingIndicator label="Đang chuẩn bị những thẻ từ" />}><Content /></Suspense></div>;
}
async function Content() { await io(); return <FlashcardGame words={await getWords()} />; }
