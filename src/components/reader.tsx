"use client";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { AudioPlayer, type AudioPlayerHandle } from "./audio-player";
import { ListeningIcon } from "./listening-icon";
import { WordCard } from "./vocabulary";
import type { Word, Sentence } from "@/lib/library";
type Mode = "both" | "vi" | "en";
export type ReaderHandle = { stop: () => void; openAudio: () => void };
export function Reader({
  sentences,
  words,
  preview = false,
  compact = false,
  controlRef,
}: {
  sentences: Sentence[];
  words: Word[];
  preview?: boolean;
  compact?: boolean;
  controlRef?: Ref<ReaderHandle>;
}) {
  const player = useRef<AudioPlayerHandle>(null);
  const listeningDetails = useRef<HTMLDetailsElement>(null);
  useImperativeHandle(controlRef, () => ({
    stop: () => player.current?.stop(),
    openAudio: () => { if (listeningDetails.current) listeningDetails.current.open = true; },
  }));
  const [mode, setMode] = useState<Mode>("both");
  const [size, setSize] = useState(22);
  const [active, setActive] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const definitionContent = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<number, HTMLDivElement>());
  function preservePosition(change: () => void) {
    const anchor = sentences
      .map((s) => nodes.current.get(s.sequence_no))
      .find((node) => node && node.getBoundingClientRect().bottom > 0);
    const before = anchor?.getBoundingClientRect().top;
    change();
    requestAnimationFrame(() => {
      if (anchor && before !== undefined)
        window.scrollBy(0, anchor.getBoundingClientRect().top - before);
    });
  }
  function renderWords(content: string, language: "vi" | "en") {
    const terms = words.filter((w) =>
      (language === "vi" ? w.word_vi : w.word_en).trim(),
    );
    if (!terms.length) return content;
    const escaped = terms.map((w) =>
      Array.from(language === "vi" ? w.word_vi : w.word_en)
        .map((c) =>
          (".^$*+?()[]{}|" + String.fromCharCode(92)).includes(c)
            ? String.fromCharCode(92) + c
            : c,
        )
        .join(""),
    );
    const pattern = new RegExp(
      `(${escaped.sort((a, b) => b.length - a.length).join("|")})`,
      "gi",
    );
    return content.split(pattern).map((part, i) => {
      const word = terms.find(
        (w) =>
          (language === "vi" ? w.word_vi : w.word_en).toLowerCase() ===
          part.toLowerCase(),
      );
      return word ? (
        <button
          className="word-link"
          key={i}
          onClick={() => {
            setSelectedWord(word);
            dialog.current?.showModal();
            dialog.current?.focus({ preventScroll: true });
            if (definitionContent.current) definitionContent.current.scrollTop = 0;
          }}
          aria-label={`Giải nghĩa: ${part}`}
        >
          {part}
        </button>
      ) : (
        part
      );
    });
  }
  return (
    <>
      {compact ? <details className="reader-listening" ref={listeningDetails} onToggle={event => {
        if (!event.currentTarget.open) player.current?.stop();
      }}>
        <summary><ListeningIcon name="headphones" /><span><strong>Nghe truyện</strong><small>Giọng đọc tiếng Việt và tiếng Anh</small></span><span className="reader-listening-toggle" aria-hidden="true">⌄</span></summary>
        <AudioPlayer sentences={sentences} onActive={setActive} controlRef={player} />
      </details> : <AudioPlayer sentences={sentences} onActive={setActive} controlRef={player} />}
      <section className="panel story-reading-card" aria-label="Đọc truyện">
        <section className="reader-controls reading-tools" aria-label="Tùy chỉnh đọc">
          <fieldset>
            <legend><span className="reading-control-title"><ListeningIcon name="book" />Ngôn ngữ đọc</span></legend>
            <div className="actions">
              {(
                [
                  { value: "both", label: "Song ngữ" },
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                ] as const
              ).map((option) => (
                <button
                  className="button secondary"
                  key={option.value}
                  aria-pressed={mode === option.value}
                  onClick={() => preservePosition(() => setMode(option.value))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend><span className="reading-control-title"><ListeningIcon name="type" />Cỡ chữ</span></legend>
            <div className="actions">
              {[
                { value: 22, label: "Vừa" },
                { value: 26, label: "Lớn" },
                { value: 30, label: "Rất lớn" },
              ].map((option) => (
                <button
                  key={option.value}
                  className="button secondary"
                  aria-pressed={size === option.value}
                  onClick={() => preservePosition(() => setSize(option.value))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        {!sentences.length ? (
          <div className="empty" role="status">
            Các câu trong truyện đang được chuẩn bị. Em quay lại tủ sách chọn
            truyện khác nhé!
          </div>
        ) : (
          <section className="reading-sentences" aria-label="Nội dung truyện">
            {sentences.map((sentence) => (
              <div
                key={sentence.sequence_no}
                ref={(node) => {
                  if (node) nodes.current.set(sentence.sequence_no, node);
                  else nodes.current.delete(sentence.sequence_no);
                }}
                className={`sentence ${active === sentence.sequence_no ? "active" : ""}`}
                style={{ fontSize: size }}
              >
                <div className="sentence-copy">
                  <span className="sentence-number">
                    Câu {sentence.sequence_no}
                  </span>
                  {mode !== "en" && (
                    <p lang="vi">
                      {renderWords(sentence.text_vi, "vi") ||
                        "Câu tiếng Việt đang được chuẩn bị."}
                    </p>
                  )}
                  {mode !== "vi" &&
                    (sentence.text_en ? (
                      <p lang="en" className="english">
                        {renderWords(sentence.text_en, "en")}
                      </p>
                    ) : (
                      <p className="muted">
                        Bản tiếng Anh của câu này đang được chuẩn bị.
                      </p>
                    ))}
                </div>
                <div className="sentence-art" aria-hidden="true" />
              </div>
            ))}
          </section>
        )}
      </section>
      <dialog
        ref={dialog}
        className="word-definition-dialog"
        aria-label="Nghĩa của từ"
        tabIndex={-1}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) {
            event.currentTarget.close();
          }
        }}
      >
        <div ref={definitionContent} className="word-definition-content">
          {selectedWord && (
            <WordCard allowFavorites={!preview} word={selectedWord} />
          )}
        </div>
        <footer className="word-definition-footer">
          <button
            type="button"
            className="button secondary"
            onClick={() => dialog.current?.close()}
          >
            Đóng
          </button>
        </footer>
      </dialog>
    </>
  );
}
