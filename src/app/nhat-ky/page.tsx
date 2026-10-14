import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { Journal } from "@/components/journal";
import { CatalogBanner } from "@/components/catalog-banner";
export default function Page() {
  return (
    <div className="library-page journal-page"><CatalogBanner kind="journal" />
    <Suspense fallback={<LoadingIndicator label="Đang mở nhật ký" />}>
      <Content />
    </Suspense>
    </div>
  );
}
async function Content() {
  await io();
  return <Journal stories={(await getLibrary()).stories} />;
}
