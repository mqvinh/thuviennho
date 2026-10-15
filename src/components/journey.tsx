"use client";
import Link from "next/link";
import Image from "next/image";
import { parseDeviceBackup } from "@/lib/device-backup";
import type { DeviceData } from "@/lib/device-store";
import type { Story } from "@/lib/library";
import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import { Feedback, useUI } from "./ui-provider";
import { ListeningIcon } from "./listening-icon";
import {
  clearDeviceData,
  useDeviceData,
  restoreDeviceData,
} from "@/lib/device-store";
function JourneyMedal({ icon }: { icon: "sprout" | "heart" | "book" | "star" }) {
  const pink = icon === "heart";
  return <div className={`journey-medal${pink ? " pink" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 80 90" fill="none">
      <path d="m20 54-8 31 16-6 9 9 5-29m16-5 10 31-16-6-9 9-5-29" fill={pink ? "#ffb2b3" : "#ffdc8c"} />
      <path d="M40 5c6-5 10 3 16 3 8-1 8 7 13 11 7 3 3 11 7 16 4 6-3 11-3 17 0 7-8 7-12 12-4 6-11 2-17 5-6 4-11-3-17-3-8 0-8-8-13-12-6-4-2-11-5-17-4-7 4-11 4-17 1-7 9-7 13-12 5-6 10-1 14-3Z" fill={pink ? "#ff979d" : "#ffca6b"} />
      <circle cx="40" cy="36" r="27" fill={pink ? "#ffe0df" : "#fff0b6"} stroke={pink ? "#f87989" : "#edb550"} strokeWidth="4" />
      <circle cx="40" cy="36" r="21" fill={pink ? "#ffc9ce" : "#f7df87"} />
    </svg>
    <ListeningIcon name={icon} />
  </div>;
}
export function Journey({ stories }: { stories: Pick<Story, "slug" | "cover_image_path">[] }) {
  const { confirm } = useUI();
  const ready = useHydrated();
  const { data, available } = useDeviceData();
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<DeviceData | null>(null);
  const [backupName, setBackupName] = useState("");
  const completed = Object.entries(data.finished).sort((a, b) => b[1].date.localeCompare(a[1].date));
  const badges = [
    { unlocked: completed.length > 0, icon: "sprout", title: "Người khám phá đầu tiên", description: "Bắt đầu hành trình đọc sách thật tuyệt vời!" },
    { unlocked: data.journal.length > 0, icon: "heart", title: "Người kể chuyện nhỏ", description: "Yêu thích những câu chuyện và chia sẻ cảm xúc của mình!" },
    { unlocked: completed.length >= 3, icon: "book", title: "Bạn của sách", description: "Em đã cùng khám phá ít nhất ba câu chuyện!" },
    { unlocked: completed.length >= 10, icon: "star", title: "Ngôi sao đọc sách", description: "Mười câu chuyện, thật nhiều điều hay để nhớ!" },
  ] as const;
  const dates = new Set(
    [
      ...Object.values(data.started),
      ...Object.values(data.finished),
      ...Object.values(data.activities),
    ].map((v) =>
      new Date(v.date).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    ),
  );
  return (
    <div className="journey-content">
      <section className="journey-encouragement journey-card" aria-labelledby="journey-encouragement-title">
        <div className="journey-welcome-art" aria-hidden="true" />
        <div>
          <h2 id="journey-encouragement-title">Mỗi bước khám phá đều đáng quý.</h2>
          <p>Em không cần đọc nhanh hay so sánh với bạn khác.</p>
          <p className="journey-device-note"><ListeningIcon name="info" />Tiến độ chỉ lưu trên thiết bị này, không gửi cho giáo viên. Dữ liệu được giữ đến khi em xóa hoặc trình duyệt xóa bộ nhớ.</p>
        </div>
      </section>
      {!available && (
        <Feedback message="Dữ liệu thiết bị không đọc được. Em có thể xóa dữ liệu cũ để bắt đầu lại." />
      )}
      <div id="journey-summary" className="journey-stats" aria-label="Tiến độ đọc của em">
        {([
          { value: Object.keys(data.started).length, label: "Truyện đã khám phá", icon: "book", tone: "honey" },
          { value: completed.length, label: "Truyện đã hoàn tất", icon: "check", tone: "green" },
          { value: Object.keys(data.activities).length, label: "Bài thử tài đã hoàn tất", icon: "quiz", tone: "blue" },
          { value: dates.size, label: "Ngày có hoạt động đọc", icon: "calendar", tone: "purple" },
        ] as const).map(stat => <article className={`journey-stat ${stat.tone}`} key={stat.tone}>
          <span className="journey-stat-icon"><ListeningIcon name={stat.icon} /></span>
          <div><strong>{stat.value}</strong><p>{stat.label}</p></div>
        </article>)}
      </div>
      <section className="journey-badges journey-card" aria-labelledby="journey-badges-title">
        <div className="journey-section-heading"><ListeningIcon name="trophy" /><div>
          <h2 id="journey-badges-title">Huy hiệu khích lệ <span aria-hidden="true">✦</span></h2>
          <p>Những huy hiệu đặc biệt dành cho hành trình đọc sách của em.</p>
        </div></div>
        <div className="journey-badge-grid">
          {badges.filter(badge => badge.unlocked).map(badge => <article className="journey-badge" key={badge.icon}>
            <JourneyMedal icon={badge.icon} /><div><h3>{badge.title}</h3><p>{badge.description}</p></div>
          </article>)}
        </div>
        {!badges.some(badge => badge.unlocked) && <p className="journey-empty">Hoàn tất truyện đầu tiên để nhận huy hiệu nhé!</p>}
      </section>
      <section className="journey-completed journey-card" aria-labelledby="journey-completed-title">
        <div className="journey-section-heading"><span className="journey-books-icon" aria-hidden="true">📚</span><div>
          <h2 id="journey-completed-title">Truyện em đã đọc xong</h2>
          <p>Những câu chuyện em đã hoàn thành. Hãy đọc lại bất cứ lúc nào nhé!</p>
        </div></div>
        <div className="journey-story-list">
      {completed.length ? (
        completed.map(([slug, item]) => (
          <article className="journey-story" key={slug}>
            <Image className="journey-story-cover" src={stories.find(story => story.slug === slug)?.cover_image_path || "/images/book-cover.svg"} alt={`Ảnh bìa ${item.title}`} width={144} height={92} unoptimized />
            <div className="journey-story-detail"><h3>{item.title}</h3>
            <div className="journey-story-meta"><span><ListeningIcon name="calendar" /><time dateTime={item.date}>{new Date(item.date).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}</time></span><span className="journey-finished"><ListeningIcon name="check" />Đã hoàn thành</span></div></div>
            <Link className="button journey-read-again" href={`/doc/${slug}`}>
              <ListeningIcon name="book" />Đọc lại
            </Link>
          </article>
        ))
      ) : (
        <p className="journey-empty">Em bắt đầu một truyện trong tủ sách nhé!</p>
      )}
        </div>
      </section>
      <div className="journey-data-actions">
        <button
          className="button secondary"
          disabled={!ready}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "nhat-ky-doc-sach.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <ListeningIcon name="download" />Tải bản sao nhật ký và tiến độ
        </button>
        <button
          className="button secondary journey-delete"
          disabled={!ready}
          onClick={async () => {
            if (
              await confirm(
                "Xóa toàn bộ nhật ký, từ yêu thích và tiến độ trên thiết bị này?",
              )
            )
              try {
                clearDeviceData();
                setMessage("Đã xóa dữ liệu trên thiết bị.");
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Chưa xóa được.",
                );
              }
          }}
        >
          <ListeningIcon name="trash" />Xóa dữ liệu trên thiết bị
        </button>
      </div>
      <section className="journey-restore journey-card" aria-labelledby="journey-restore-title">
        <div className="journey-restore-main">
        <div className="journey-section-heading"><span className="journey-upload-icon"><ListeningIcon name="upload" /></span><div>
        <h2 id="journey-restore-title">Khôi phục bản sao trên thiết bị</h2>
        <p>
          Chọn bản sao JSON đã tải từ Hành trình. Nội dung chỉ được đọc trên
          thiết bị này.
        </p>
        </div></div>
        <label className="journey-file-label" htmlFor="journey-backup">Chọn bản sao nhật ký</label>
        <div className="journey-file-control">
          <span className="journey-file-trigger" aria-hidden="true"><ListeningIcon name="upload" />Chọn tệp</span>
          <span className="journey-file-name">{backupName || "Chưa có tệp nào được chọn"}</span>
          <input
            id="journey-backup"
            type="file"
            disabled={!ready}
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBackup(null);
              setBackupName("");
              try {
                if (file.size > 5 * 1024 * 1024)
                  throw Error("Bản sao tối đa 5 MB.");
                setBackup(parseDeviceBackup(await file.text()));
                setBackupName(file.name);
                setMessage(
                  "Đã kiểm tra bản sao. Dữ liệu hiện tại chưa thay đổi.",
                );
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Không đọc được bản sao.",
                );
              }
              e.target.value = "";
            }}
          />
        </div>
        {backup && (
          <div className="journey-backup-preview">
            <p>
              Bản sao có {backup.journal.length} sản phẩm,{" "}
              {Object.keys(backup.finished).length} truyện hoàn tất và{" "}
              {backup.favorites.length} từ yêu thích và {Object.keys(backup.flashcards).length} từ có lịch ôn Flashcard.
            </p>
            <p>
              Khôi phục sẽ thay thế dữ liệu hiện tại. Em có thể tải bản sao hiện
              tại trước khi tiếp tục.
            </p>
            <div className="actions">
              <button
                className="button"
                onClick={async () => {
                  if (
                    await confirm(
                      "Thay thế nhật ký và tiến độ trên thiết bị bằng bản sao đã chọn?",
                    )
                  )
                    try {
                      restoreDeviceData(backup);
                      setBackup(null);
                      setBackupName("");
                      setMessage("Đã khôi phục bản sao trên thiết bị.");
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Chưa khôi phục được.",
                      );
                    }
                }}
              >
                Khôi phục bản sao
              </button>
              <button
                className="button secondary"
                onClick={() => { setBackup(null); setBackupName(""); }}
              >
                Hủy khôi phục
              </button>
            </div>
          </div>
        )}
        </div>
        <aside className="journey-restore-help" aria-label="Lưu ý về bản sao">
          <div className="journey-restore-tips"><h3><ListeningIcon name="tip" />Một vài lưu ý nhỏ</h3>
          <ul>
            <li><ListeningIcon name="check" />Chỉ chọn tệp sao lưu do Hành trình xuất ra.</li>
            <li><ListeningIcon name="check" />Dữ liệu sẽ được khôi phục trên thiết bị này.</li>
            <li><ListeningIcon name="check" />Nhật ký, từ yêu thích và tiến độ hiện tại sẽ được thay bằng bản sao đã chọn.</li>
          </ul></div>
          <div className="journey-restore-art" aria-hidden="true" />
        </aside>
      </section>
      <p role="status">{message}</p>
    </div>
  );
}
