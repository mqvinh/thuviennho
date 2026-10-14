"use client";
/* eslint-disable @next/next/no-img-element -- Device-only drawings use their natural aspect ratio without server optimization. */
import { useRef, useState } from "react";
import Link from "next/link";
import { useHydrated } from "@/lib/use-hydrated";
import { Feedback, useUI } from "./ui-provider";
import type { Story } from "@/lib/library";
import { changeDeviceData, useDeviceData } from "@/lib/device-store";
import { FieldLabel } from "./field-label";
import { ListeningIcon } from "./listening-icon";
const drawingColors = [
  { name: "Xanh lá", value: "#276653" },
  { name: "Xanh dương", value: "#287bc1" },
  { name: "Đỏ", value: "#e34242" },
  { name: "Vàng", value: "#f2b629" },
  { name: "Cam", value: "#e97c22" },
  { name: "Tím", value: "#8652c7" },
  { name: "Hồng", value: "#e15b97" },
  { name: "Nâu", value: "#8b522e" },
  { name: "Đen", value: "#263238" },
];
export function Journal({ stories }: { stories: Story[] }) {
  const { confirm } = useUI();
  const ready = useHydrated();
  const { data, available } = useDeviceData();
  const [slug, setSlug] = useState("");
  const [character, setCharacter] = useState("");
  const [lesson, setLesson] = useState("");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [message, setMessage] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState(drawingColors[0].value);
  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) * 800) / rect.width,
      ((e.clientY - rect.top) * 450) / rect.height,
    ];
  }
  return (
    <div className="journal-content">
      <section className="journal-device-notice journal-card" aria-labelledby="journal-device-title">
        <div className="journal-notice-art" aria-hidden="true" />
        <div>
          <h2 id="journal-device-title"><ListeningIcon name="lock" />Nhật ký này chỉ hiển thị trên thiết bị của em</h2>
          <p>Đây là góc nhỏ để em lưu lại cảm nghĩ sau khi đọc sách.</p>
          <p>Nhật ký lưu trong trình duyệt này; ai dùng chung thiết bị cũng có thể xem. Em không ghi họ tên đầy đủ, địa chỉ, số điện thoại hay thông tin riêng tư nhé!</p>
        </div>
      </section>
      {!available && (
        <Feedback message="Không đọc được bộ nhớ thiết bị. Hãy kiểm tra quyền lưu dữ liệu của trình duyệt." />
      )}
      <div className="journal-layout">
      <form
        id="journal-form"
        className="journal-card journal-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const story = stories.find((s) => s.slug === slug);
            if (!story) throw Error("Em chọn một truyện nhé!");
            if (!character.trim() || !lesson.trim())
              throw Error(
                "Em viết nhân vật yêu thích và điều đã học được nhé!",
              );
            if (data.journal.length >= 50)
              throw Error(
                "Nhật ký đã có 50 sản phẩm. Em lưu bản sao rồi xóa bớt nhé!",
              );
            const artwork =
              image ||
              (hasDrawing
                ? (canvas.current?.toDataURL("image/png") ?? "")
                : "");
            if (artwork.length > 1_500_000)
              throw Error("Ảnh quá lớn. Em chọn ảnh nhỏ hơn nhé!");
            changeDeviceData((d) => ({
              ...d,
              journal: [
                {
                  id: crypto.randomUUID(),
                  slug,
                  title: story.title_vi,
                  character: character.trim(),
                  lesson: lesson.trim(),
                  image: artwork,
                  date: new Date().toISOString(),
                },
                ...d.journal,
              ],
            }));
            setCharacter("");
            setLesson("");
            setImage("");
            setImageName("");
            setHasDrawing(false);
            canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 450);
            setMessage("Đã lưu nhật ký trên thiết bị!");
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Chưa lưu được.",
            );
          }
        }}
      >
        <div className="journal-section-heading"><span className="journal-heading-art"><ListeningIcon name="pencil" /><ListeningIcon name="sprout" /></span><div>
          <h2>Viết nhật ký của em</h2>
          <p>Hãy kể cho chúng mình nghe về cuốn sách em vừa đọc nhé!</p>
        </div></div>
        <label className="journal-field">
          <FieldLabel required>Truyện em đã đọc</FieldLabel>
          <span className="journal-input-wrap"><ListeningIcon name="book" />
          <select
            aria-label="Truyện em đã đọc"
            disabled={!ready}
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            <option value="">Chọn truyện</option>
            {stories.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title_vi}
              </option>
            ))}
          </select>
          </span>
        </label>
        <label className="journal-field">
          <FieldLabel required>Nhân vật em thích</FieldLabel>
          <span className="journal-input-wrap"><ListeningIcon name="person" />
          <input
            required
            disabled={!ready}
            maxLength={100}
            placeholder="Nhập tên nhân vật em thích…"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
          />
          </span>
        </label>
        <label className="journal-field">
          <FieldLabel required>Điều em học được</FieldLabel>
          <span className="journal-input-wrap journal-textarea-wrap"><ListeningIcon name="tip" />
          <textarea
            required
            disabled={!ready}
            maxLength={1000}
            placeholder="Viết điều em học được từ câu chuyện này…"
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
          />
          </span>
        </label>
        <section className="journal-artwork" aria-labelledby="journal-artwork-title">
          <div className="journal-artwork-heading"><ListeningIcon name="palette" /><div>
            <h3 id="journal-artwork-title">Vẽ hoặc viết điều em thích</h3>
            <p>Em có thể vẽ tranh hoặc viết bằng nét bút. Phần này không bắt buộc.</p>
          </div><button
            type="button"
            className="journal-clear-drawing"
            aria-label="Xóa tranh đang vẽ"
            title="Xóa tranh đang vẽ"
            disabled={!ready || (!hasDrawing && !image)}
            onClick={() => {
              canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 450);
              setHasDrawing(false);
              setImage("");
              setImageName("");
            }}
          ><ListeningIcon name="trash" /></button></div>
          <fieldset className="drawing-palette">
            <legend>Chọn màu vẽ</legend>
            <div className="drawing-colors">
              {drawingColors.map(color => <button
                key={color.value}
                type="button"
                disabled={!ready}
                className="drawing-swatch"
                aria-label={`Màu ${color.name.toLowerCase()}`}
                title={color.name}
                aria-pressed={drawingColor === color.value}
                style={{ "--drawing-color": color.value } as React.CSSProperties}
                onClick={() => setDrawingColor(color.value)}
              ><span aria-hidden="true">{drawingColor === color.value ? "✓" : ""}</span></button>)}
              <label className="drawing-custom-color">
                Màu khác
                <input type="color" disabled={!ready} aria-label="Chọn màu vẽ khác" value={drawingColor} onChange={e => setDrawingColor(e.target.value)} />
              </label>
            </div>
          </fieldset>
          <div className="journal-drawing-stage">
          <canvas
            ref={canvas}
            width={800}
            height={450}
            aria-label="Bảng vẽ bằng chuột hoặc cảm ứng; em cũng có thể tải ảnh bên dưới"
            className="drawing-canvas"
            onPointerDown={(e) => {
              if (!ready) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              const ctx = e.currentTarget.getContext("2d");
              if (ctx) {
                const [x, y] = position(e);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineWidth = 6;
                ctx.lineCap = "round";
                ctx.strokeStyle = drawingColor;
                ctx.lineTo(x + 0.1, y + 0.1);
                ctx.stroke();
                setHasDrawing(true);
                setImage("");
                setImageName("");
              }
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = e.currentTarget.getContext("2d");
              const [x, y] = position(e);
              ctx?.lineTo(x, y);
              ctx?.stroke();
              setHasDrawing(true);
              setImage("");
            }}
            onPointerUp={() => (drawing.current = false)}
            onPointerCancel={() => (drawing.current = false)}
          />
          {!hasDrawing && <div className="journal-drawing-placeholder" aria-hidden="true"><ListeningIcon name="pencil" /><p>Thỏa sức sáng tạo nào!</p></div>}
          </div>
        </section>
        <div className="journal-upload-box">
        <label className="journal-upload-label" htmlFor="journal-art-upload"><ListeningIcon name="image" />Hoặc chọn tranh đã vẽ (PNG/JPG/WebP, tối đa 1 MB)</label>
        <div className="journal-file-control">
          <span className="journal-file-trigger" aria-hidden="true">Chọn tệp</span>
          <span className="journal-file-name">{imageName || "Chưa có tệp nào được chọn"}</span>
          <input
            id="journal-art-upload"
            type="file"
            disabled={!ready}
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (
                  file.size > 1024 * 1024 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(file.type)
                )
                  throw Error("Chọn ảnh PNG/JPG/WebP tối đa 1 MB.");
                const bitmap = await createImageBitmap(file);
                const target = document.createElement("canvas");
                const scale = Math.min(
                  1,
                  800 / bitmap.width,
                  600 / bitmap.height,
                );
                target.width = Math.round(bitmap.width * scale);
                target.height = Math.round(bitmap.height * scale);
                target
                  .getContext("2d")
                  ?.drawImage(bitmap, 0, 0, target.width, target.height);
                bitmap.close();
                setImage(target.toDataURL("image/jpeg", 0.8));
                setImageName(file.name);
                setMessage("Đã chọn tranh.");
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Không đọc được ảnh.",
                );
              }
              e.target.value = "";
            }}
          />
        </div>
        {image && (
          <div className="media-image"><img src={image} alt="Tranh em vừa chọn" className="journal-image" /></div>
        )}
        </div>
        <button className="button journal-save" disabled={!ready || !available}>
          <ListeningIcon name="pencil" />Lưu nhật ký
        </button>
      </form>
      <aside className="journal-sidebar" aria-label="Gợi ý và hành trình viết nhật ký">
        <section className="journal-tips journal-card" aria-labelledby="journal-tips-title">
          <h2 id="journal-tips-title"><ListeningIcon name="tip" />Gợi ý cho em</h2>
          <p>Em có thể tham khảo những gợi ý sau để viết nhật ký dễ dàng hơn nhé!</p>
          <div className="journal-prompts">
            <div className="journal-prompt pink"><ListeningIcon name="rabbit" /><p>Em thích nhân vật nào nhất?</p></div>
            <div className="journal-prompt blue"><ListeningIcon name="book" /><p>Điều gì làm em nhớ nhất?</p></div>
            <div className="journal-prompt green"><ListeningIcon name="star" /><p>Em học được điều gì tốt?</p></div>
          </div>
        </section>
        <section className="journal-mini-journey journal-card" aria-labelledby="journal-mini-journey-title">
          <h2 id="journal-mini-journey-title"><ListeningIcon name="chart" />Hành trình nhỏ của em</h2>
          <p>Mỗi trang nhật ký là một bước tiến tuyệt vời. Cố gắng đọc và khám phá thêm những câu chuyện nhé!</p>
          <ul>
            <li><ListeningIcon name="book" /><p>Đã viết <strong>{data.journal.length}</strong> nhật ký</p></li>
            <li><ListeningIcon name="star" /><p><Link href="/">Tiếp tục khám phá</Link><br />nhiều câu chuyện mới</p></li>
            <li><ListeningIcon name="heart" /><p>Mỗi câu chuyện là<br />một bài học hay</p></li>
            <li><ListeningIcon name="sprout" /><p>Em đang trở thành<br />một độc giả tuyệt vời!</p></li>
          </ul>
          <div className="journal-sidebar-art" aria-hidden="true" />
        </section>
      </aside>
      </div>
      <p className="journal-feedback" role="status">{message}</p>
      <section className="journal-saved" aria-labelledby="journal-saved-title">
      <div className="journal-section-heading"><ListeningIcon name="book" /><div><h2 id="journal-saved-title">Nhật ký em đã lưu</h2><p>Cùng xem lại những câu chuyện em đã viết nhé!</p></div></div>
      {!data.journal.length ? (
        <p className="journal-card journal-empty">
          Chưa có nhật ký. Em kể về truyện đầu tiên nhé!
        </p>
      ) : (
        data.journal.map((entry) => (
          <article className="journal-entry journal-card" key={entry.id}>
            <div className="journal-entry-artwork">
              {entry.image ? <img src={entry.image} alt={`Tranh về ${entry.title}`} className="journal-image" /> : <div className="journal-entry-placeholder"><ListeningIcon name="pencil" /><p>Nhật ký của em</p></div>}
            </div>
            <div className="journal-entry-detail">
            <h3>{entry.title}</h3>
            <p className="journal-entry-date"><ListeningIcon name="calendar" /><time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}</time></p>
            <p className="journal-entry-character"><ListeningIcon name="heart" /><span>Nhân vật em thích: {entry.character}</span></p>
            <p className="journal-entry-lesson"><ListeningIcon name="tip" /><span>Điều em học được: {entry.lesson}</span></p>
            <div className="journal-entry-actions">
            <button
              className="button secondary journal-delete-entry"
              onClick={async () => {
                if (await confirm("Xóa sản phẩm đọc sách này khỏi thiết bị?", "Xóa sản phẩm"))
                  try {
                    changeDeviceData((d) => ({
                      ...d,
                      journal: d.journal.filter((v) => v.id !== entry.id),
                    }));
                    setMessage("Đã xóa sản phẩm.");
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "Chưa xóa được.",
                    );
                  }
              }}
            >
              <ListeningIcon name="trash" />Xóa sản phẩm
            </button>
            </div>
            </div>
          </article>
        ))
      )}
      </section>
    </div>
  );
}
