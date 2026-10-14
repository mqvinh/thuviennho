"use client";
import { recordActivity } from "@/lib/device-store";
import { useState } from "react";
import { Feedback } from "./ui-provider";
import { ListeningIcon } from "./listening-icon";
import { LoadingIndicator } from "./loading-indicator";
import type { Question } from "@/lib/library";
export function Quiz({
  slug,
  questions,
  title,
}: {
  slug: string;
  title: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [feedback, setFeedback] = useState<
    { id: string; correct: boolean; explanation: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          answers: questions.map((q) => ({
            id: q.id,
            value:
              answers[q.id] ??
              (q.kind === "order" ? q.options.map((_, i) => i) : null),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setFeedback(result.feedback);
      try {
        recordActivity("activities", slug, title);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Bài làm đã kiểm tra, chưa lưu được tiến độ.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chưa gửi được bài làm.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reading-quiz" aria-label="Câu hỏi đọc hiểu">
      <header className="quiz-heading">
        <span className="quiz-symbol" aria-hidden="true"><ListeningIcon name="book" /><ListeningIcon name="tip" /></span>
        <div><h2>Đọc vui thử tài</h2><p>Trả lời câu hỏi để nhớ truyện nhé!</p></div>
        <div className="quiz-heading-art" aria-hidden="true" />
      </header>
      {!questions.length && <p className="empty quiz-empty" role="status">Truyện này chưa có câu hỏi. Em chọn truyện khác nhé!</p>}
      <div className="quiz-question-list">
        {questions.map((q, index) => {
          const order = Array.isArray(answers[q.id])
            ? (answers[q.id] as number[])
            : q.options.map((_, i) => i);
          const result = feedback.find((f) => f.id === q.id);
          return (
            <div className="quiz-question-card" key={q.id}>
              <span className="quiz-number" aria-hidden="true">Câu {index + 1}</span>
              <fieldset
                className="quiz-question"
                disabled={busy || feedback.length > 0}
              >
                <legend>
                  {index + 1}. {q.question_vi}
                </legend>
                {q.kind === "choice" ? (
                  <div className="quiz-options">
                    {q.options.map((option, i) => (
                      <label className="choice quiz-choice" key={i}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === i}
                          onChange={() => setAnswers({ ...answers, [q.id]: i })}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="quiz-order-hint">Dùng nút Lên/Xuống để sắp xếp.</p>
                    <ol className="quiz-order-list" role="list">
                      {order.map((option, position) => (
                        <li key={option} className="order-item">
                          <span className="quiz-order-number" aria-hidden="true">{position + 1}</span>
                          <span className="quiz-order-text">{q.options[option]}</span>
                          <div className="actions quiz-order-actions">
                            {[-1, 1].map((direction) => (
                              <button
                                type="button"
                                key={direction}
                                className="button secondary"
                                disabled={
                                  position + direction < 0 ||
                                  position + direction >= order.length
                                }
                                aria-label={`${direction < 0 ? "Đưa lên" : "Đưa xuống"}: ${q.options[option]}`}
                                onClick={() => {
                                  const next = [...order];
                                  [next[position], next[position + direction]] = [
                                    next[position + direction],
                                    next[position],
                                  ];
                                  setAnswers({ ...answers, [q.id]: next });
                                }}
                              >
                                {direction < 0 ? "↑ Lên" : "↓ Xuống"}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {result && (
                  <p className={`quiz-result ${result.correct ? "is-correct" : "needs-retry"}`} role="status">
                    {result.correct
                      ? "🌟 Em làm tốt lắm!"
                      : "🌱 Cùng đọc lại và thử thêm nhé!"}{" "}
                    {result.explanation}
                  </p>
                )}
              </fieldset>
            </div>
          );
        })}
      </div>
      {questions.length > 0 && <footer className="quiz-footer">
        <div className="actions quiz-submit-actions">
          {feedback.length ? (
            <button
              type="button"
              className="button quiz-check"
              onClick={() => {
                setAnswers({});
                setFeedback([]);
                setMessage("");
              }}
            >
              <ListeningIcon name="replay" />Làm lại
            </button>
          ) : (
            <button type="button" className="button quiz-check" disabled={busy} aria-busy={busy} aria-label="Kiểm tra bài làm" onClick={submit}>
              {busy ? <LoadingIndicator inline label="Đang kiểm tra bài làm" /> : <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="m7 12 3 3 7-7" fill="none" stroke="#97420e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              Kiểm tra bài làm
            </button>
          )}
        </div>
        <p className="quiz-submit-hint">{feedback.length ? "Em có thể làm lại để luyện tập thêm nhé!" : "Em làm xong rồi chạm nút kiểm tra nhé!"}</p>
      </footer>}
      <Feedback message={message} />
    </section>
  );
}
