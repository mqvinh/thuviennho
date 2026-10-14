import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { Library } from "@/components/library";
import { ListeningIcon } from "@/components/listening-icon";
import { CatalogBanner } from "@/components/catalog-banner";
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="library-page">
      <CatalogBanner kind="library" />
      <div className="shelf-heading-row">
        <h2 id="books" className="shelf-heading"><span aria-hidden="true">📚</span>Tủ sách song ngữ<ListeningIcon name="sprout" /></h2>
        <p><ListeningIcon name="sprout" />Những câu chuyện hay cho những bạn nhỏ tuyệt vời!</p>
      </div>
      <Suspense fallback={<LoadingIndicator label="Đang mở tủ sách" />}>
        <LibraryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
async function LibraryContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await io();
  const [library, query] = await Promise.all([getLibrary(), searchParams]);
  const theme = typeof query["chu-de"] === "string" ? query["chu-de"] : "";
  return <Library key={theme} {...library} initialTheme={theme} />;
}
