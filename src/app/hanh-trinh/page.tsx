import { Journey } from "@/components/journey";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { LoadingIndicator } from "@/components/loading-indicator";
import { CatalogBanner } from "@/components/catalog-banner";

async function Content() {
  await io();
  const { stories } = await getLibrary();
  return <Journey stories={stories.map(({ slug, cover_image_path }) => ({ slug, cover_image_path }))} />;
}
export default function Page() {
  return <div className="library-page journey-page"><CatalogBanner kind="journey" /><Suspense fallback={<LoadingIndicator label="Đang mở hành trình" />}><Content /></Suspense></div>;
}
