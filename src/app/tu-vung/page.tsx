import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getWords } from "@/lib/library";
import { Vocabulary, VocabularyHeading } from "@/components/vocabulary";
import { CatalogBanner } from "@/components/catalog-banner";
export default function Page() {
  return (
    <div className="library-page vocabulary-page">
      <CatalogBanner kind="vocabulary" />
    <section id="vocabulary-catalog" className="panel vocabulary-section-card" aria-labelledby="vocabulary-page-title">
      <VocabularyHeading id="vocabulary-page-title" title="Từ mới em khám phá" description="Chọn truyện hoặc tìm tên từ. Chạm vào trái tim để lưu những từ em yêu thích nhé!" />
      <Suspense fallback={<LoadingIndicator label="Đang mở vườn từ" />}>
        <Content />
      </Suspense>
    </section>
    </div>
  );
}
async function Content() {
  await io();
  return <Vocabulary words={await getWords()} />;
}
