"use client";
import type { ContentDraft } from "@/lib/teacher-content";
type Question = ContentDraft["questions"][number];

function validOrder(order: number[], count: number) {
  const retained = [...new Set(order.filter(value => Number.isInteger(value) && value >= 0 && value < count))];
  return [...retained, ...Array.from({ length: count }, (_, index) => index).filter(index => !retained.includes(index))];
}

export function QuestionOptions({ question, onChange }: { question: Question; onChange: (value: Partial<Question>) => void }) {
  const order = validOrder(question.correct_order, question.options.length);
  const optionLabel = (index: number) => `${index + 1}. ${question.options[index].trim() || `Lựa chọn ${index + 1}`}`;
  function resize(count: number) {
    onChange({
      options: Array.from({ length: count }, (_, index) => question.options[index] ?? ""),
      correct_option: Math.min(question.correct_option, count - 1),
      correct_order: validOrder(question.correct_order, count),
    });
  }
  return <>
    <div className="form-row">
      <label>Loại<select aria-label="Loại" value={question.kind} onChange={event => onChange({ kind: event.target.value as Question["kind"], correct_order: order })}><option value="choice">Chọn đáp án</option><option value="order">Sắp xếp diễn biến</option></select></label>
      <label>Số lựa chọn<select aria-label="Số lựa chọn" value={question.options.length} onChange={event => resize(Number(event.target.value))}>{[2, 3, 4, 5, 6].map(count => <option value={count} key={count}>{count} lựa chọn</option>)}</select></label>
    </div>
    {question.options.map((option, index) => <label key={index}>Lựa chọn {index + 1}<input maxLength={500} value={option} onChange={event => onChange({ options: question.options.map((value, position) => position === index ? event.target.value : value) })} /></label>)}
    {question.kind === "choice" ? <label>Đáp án đúng<select aria-label="Đáp án đúng" value={question.correct_option} onChange={event => onChange({ correct_option: Number(event.target.value) })}>{question.options.map((_, index) => <option value={index} key={index}>{optionLabel(index)}</option>)}</select></label> : <fieldset className="editor-fieldset answer-order"><legend>Thứ tự đúng</legend><p className="field-hint">Chọn diễn biến cho từng vị trí. Các vị trí tự đổi chỗ để mỗi lựa chọn chỉ xuất hiện một lần.</p><div className="answer-order-grid">{order.map((option, position) => <label key={position}>Vị trí {position + 1}<select aria-label={`Vị trí ${position + 1}`} value={option} onChange={event => {
      const value = Number(event.target.value); const previousPosition = order.indexOf(value); const next = [...order];
      next[position] = value; next[previousPosition] = option; onChange({ correct_order: next });
    }}>{question.options.map((_, index) => <option value={index} key={index}>{optionLabel(index)}</option>)}</select></label>)}</div></fieldset>}
  </>;
}
