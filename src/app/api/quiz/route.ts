import { getDb } from "@/lib/db";
import { sameOrigin, readJson, errorResponse, HttpError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await readJson(request, 10_000);
    if (
      typeof body.slug !== "string" ||
      body.slug.length > 100 ||
      !Array.isArray(body.answers) ||
      !body.answers.length ||
      body.answers.length > 20
    )
      throw new HttpError(400, "Bài làm không hợp lệ.");
    const db = await getDb();
    const { rows } = await db.query<{
      id: string;
      kind: string;
      options: string[];
      correct_option: number;
      correct_order: number[] | null;
      explanation_vi: string;
    }>(
      `select q.id, q.kind, q.options, a.correct_option, a.correct_order, a.explanation_vi from reading_questions q join reading_answers a on a.question_id=q.id join stories s on s.id=q.story_id where s.slug=?1 and s.is_published=true and s.is_visible=true order by q.sequence_no`,
      [body.slug],
    );
    if (!rows.length || body.answers.length !== rows.length)
      throw new HttpError(400, "Hãy trả lời đủ câu hỏi.");
    const answers = body.answers as { id?: unknown; value?: unknown }[];
    if (new Set(answers.map((a) => a?.id)).size !== rows.length)
      throw new HttpError(400, "Câu hỏi bị trùng.");
    const feedback = rows.map((q) => {
      const answer = answers.find((a) => a?.id === q.id);
      if (!answer) throw new HttpError(400, "Câu hỏi không hợp lệ.");
      let correct = false;
      if (q.kind === "order") {
        const order = answer.value;
        if (
          !Array.isArray(order) ||
          order.length !== q.options.length ||
          new Set(order).size !== order.length ||
          !order.every(
            (n) => Number.isInteger(n) && n >= 0 && n < q.options.length,
          )
        )
          throw new HttpError(400, "Thứ tự không hợp lệ.");
        correct = JSON.stringify(order) === JSON.stringify(q.correct_order);
      } else {
        if (
          !Number.isInteger(answer.value) ||
          Number(answer.value) < 0 ||
          Number(answer.value) >= q.options.length
        )
          throw new HttpError(400, "Lựa chọn không hợp lệ.");
        correct = answer.value === q.correct_option;
      }
      return { id: q.id, correct, explanation: q.explanation_vi };
    });
    return Response.json(
      { feedback, completed: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
