"use client";
import { useState } from "react";
import Link from "next/link";
import { changeDeviceData, recordActivity, useDeviceData } from "@/lib/device-store";
import { finishJourneyStory, landmarkFor } from "@/lib/journey-map";
import { LandmarkArtwork } from "./journey-artwork";
import { recordDailyReading } from "@/lib/daily-learning";
import { useLearningDay } from "@/lib/use-learning-day";
export function ReadingProgress({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const { data } = useDeviceData();
  const day = useLearningDay();
  const dailyStory = data.daily?.[day]?.storySlug === slug;
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  function record(kind: "started" | "finished") {
    try {
      if (kind === "finished") {
        let first = false;
        changeDeviceData(current => { const result = finishJourneyStory(current, slug, title); first = result.unlocked; return recordDailyReading(result.data, slug); });
        if (first) setUnlocked(true);
      } else recordActivity(kind, slug, title);
      setMessage(
        kind === "started"
          ? "Đã ghi nhận truyện em đang khám phá."
          : "🌟 Em đã hoàn tất câu chuyện!",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chưa lưu được tiến độ.",
      );
    }
  }
  return (
    <section className="panel">
      <h2>Bước nhỏ hôm nay</h2>
      <p>Lưu tiến độ trên thiết bị này khi em muốn.</p>
      <div className="actions">
        <button className="button secondary" onClick={() => record("started")}>
          {Object.hasOwn(data.started, slug)
            ? "Đã bắt đầu đọc"
            : "Ghi nhận bắt đầu đọc"}
        </button>
        <button
          className="button"
          onClick={() => record("finished")}
        >
          {Object.hasOwn(data.finished, slug)
            ? "Đã đọc xong 🌟"
            : "Em đã đọc xong"}
        </button>
      </div>
      <p role="status">{message}</p>
      {dailyStory && <Link className="button secondary" href="/#goc-hoc-hom-nay">🧭 {data.daily?.[day]?.readAt ? "Đã xong nhiệm vụ đọc · Tiếp tục góc học hôm nay" : "Về góc học hôm nay"} →</Link>}
      {unlocked && <div className="journey-unlock" role="status"><LandmarkArtwork kind={landmarkFor(slug).kind} /><div><strong>Một địa điểm mới đã mở!</strong><p>{landmarkFor(slug).name} đang chờ em trên bản đồ khám phá.</p></div></div>}
      {Object.hasOwn(data.finished, slug) && <Link className="button secondary journey-map-link" href={`/hanh-trinh?truyen=${encodeURIComponent(slug)}#ban-do-kham-pha`}>{unlocked ? "Xem địa điểm vừa mở" : "Xem địa điểm trên bản đồ"} →</Link>}
    </section>
  );
}
