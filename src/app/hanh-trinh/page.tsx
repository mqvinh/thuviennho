import { Journey } from "@/components/journey";
import { Suspense } from "react";
import { io } from "next/cache";
import { getLibrary } from "@/lib/library";
import { LoadingIndicator } from "@/components/loading-indicator";
import { CatalogBanner } from "@/components/catalog-banner";

type Search = Promise<{ truyen?: string | string[] }>;
async function Content({ searchParams }: { searchParams: Search }) {
  await io();
  const [{ stories, themes }, query] = await Promise.all([getLibrary(), searchParams]);
  const focusSlug = typeof query.truyen === "string" ? query.truyen : undefined;
  return <Journey stories={stories.map(({ slug, title_vi, theme_slug, theme_vi, cover_image_path }) => ({ slug, title_vi, theme_slug, theme_vi, cover_image_path }))} themes={themes} focusSlug={focusSlug} />;
}
export default function Page({ searchParams }: { searchParams: Search }) {
  return <div className="library-page journey-page"><CatalogBanner kind="journey" /><Suspense fallback={<LoadingIndicator label="Đang mở hành trình" />}><Content searchParams={searchParams} /></Suspense></div>;
}
