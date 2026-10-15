import { Suspense } from "react";
import { io } from "next/cache";
import { CatalogBanner } from "@/components/catalog-banner";
import { SequenceGame } from "@/components/sequence-game";
import { LoadingIndicator } from "@/components/loading-indicator";
import { getSequenceStories } from "@/lib/library";

export const metadata = { title: "Xếp tranh kể chuyện · Thư Viện Nhỏ" };
export default function SequencePage() {
  return <div className="library-page games-page"><CatalogBanner kind="sequencing" /><Suspense fallback={<LoadingIndicator label="Đang chuẩn bị những bức tranh kể chuyện" />}><Content /></Suspense></div>;
}
async function Content() { await io(); return <SequenceGame stories={await getSequenceStories()} />; }
