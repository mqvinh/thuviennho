"use client";
import { useState } from "react";
import { recordActivity, useDeviceData } from "@/lib/device-store";
export function ReadingProgress({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const { data } = useDeviceData();
  const [message, setMessage] = useState("");
  function record(kind: "started" | "finished") {
    try {
      recordActivity(kind, slug, title);
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
          onClick={() => {
            record("started");
            record("finished");
          }}
        >
          {Object.hasOwn(data.finished, slug)
            ? "Đã đọc xong 🌟"
            : "Em đã đọc xong"}
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
