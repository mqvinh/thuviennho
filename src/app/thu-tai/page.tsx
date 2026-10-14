import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { Library } from "@/components/library";
import { CatalogBanner } from "@/components/catalog-banner";
export default function Page() {
  return (
    <div className="library-page quiz-catalog-page">
      <CatalogBanner kind="quiz" />
      <div className="shelf-heading-row"><h2 id="books" className="shelf-heading">🧩 Đọc vui thử tài</h2><p>Cùng nhớ lại những điều hay trong truyện!</p></div>
      <Suspense fallback={<LoadingIndicator label="Đang tải truyện" />}>
        <Content />
      </Suspense>
    </div>
  );
}
async function Content() {
  await io();
  return <Library {...await getLibrary("quiz")} activity="quiz" />;
}
