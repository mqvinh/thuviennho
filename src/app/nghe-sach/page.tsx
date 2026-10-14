import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { Library } from "@/components/library";
import { CatalogBanner } from "@/components/catalog-banner";
export default function Page() {
  return (
    <div className="library-page audio-catalog-page">
      <CatalogBanner kind="audio" />
      <div className="shelf-heading-row"><h2 id="books" className="shelf-heading">🎧 Truyện để nghe</h2><p>Chọn truyện, cùng nghe từng câu!</p></div>
      <Suspense fallback={<LoadingIndicator label="Đang tải truyện" />}>
        <Content />
      </Suspense>
    </div>
  );
}
async function Content() {
  await io();
  return (
    <Library {...await getLibrary("audio")} activity="audio" />
  );
}
