import { requireTeacher } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  sameOrigin,
  readJson,
  text,
  errorResponse,
  HttpError,
} from "@/lib/http";
import { validateDraft, saveDraft } from "@/lib/teacher-content";
import { revalidatePath } from "next/cache";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request);
    const teacher = await requireTeacher();
    const { action } = await params;
    const body = await readJson(request, 500_000);
    const db = await getDb();
    if (action === "save") {
      await saveDraft(validateDraft(body), teacher);
      revalidatePath("/", "layout");
      return Response.json({ ok: true });
    }
    if (action === "theme") {
      if (teacher.role !== "admin")
        throw new HttpError(403, "Chỉ quản trị viên sửa chủ đề.");
      const slug = text(body.slug, 100);
      if (!/^[a-z0-9-]+$/.test(slug))
        throw new HttpError(400, "Slug không hợp lệ.");
      if (body.mode === "delete") {
        const result = await db.transaction(async tx => {
          const theme = (await tx.query<{ id: string; name_vi: string }>("select id,name_vi from reading_themes where slug=$1 for update", [slug])).rows[0];
          if (!theme) throw new HttpError(404, "Không tìm thấy chủ đề.");
          const { count } = (await tx.query<{ count: number }>("select count(*)::int count from stories where theme_id=$1", [theme.id])).rows[0];
          if (count > 0 && body.confirm_used !== true)
            return { needs_confirmation: true, story_count: count, name_vi: theme.name_vi };
          await tx.query("delete from reading_themes where id=$1", [theme.id]);
          return { ok: true, affected_stories: count };
        });
        if ("needs_confirmation" in result)
          return Response.json({ ...result, error: "Chủ đề đang được sử dụng. Cần xác nhận trước khi xóa." }, { status: 409 });
        revalidatePath("/", "layout");
        return Response.json(result);
      }
      const replaceIcon = body.icon_path !== undefined;
      const icon = replaceIcon ? text(body.icon_path ?? "", 300, false) : "";
      if (icon && !/^\/images\/themes\/(book|kindness-sharing|family|nature|good-habits|school|friendship)\.png$/.test(icon)) {
        if (!/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(icon) || !(await db.query("select 1 from media_files where path=$1", [icon])).rows.length)
          throw new HttpError(400, "Chọn ảnh icon đã tải lên cho chủ đề.");
      }
      const values = [slug, text(body.name_vi, 100), text(body.name_en, 100), icon || null];
      if (body.mode === "create") {
        const result = await db.query("insert into reading_themes(slug,name_vi,name_en,icon_path) values($1,$2,$3,$4) on conflict(slug) do nothing returning slug", values);
        if (!result.rows.length) throw new HttpError(409, "Mã chủ đề đã tồn tại. Hãy chọn mã khác.");
      } else if (body.mode === "update") {
        const result = await db.query("update reading_themes set name_vi=$2,name_en=$3,icon_path=case when $5 then $4 else icon_path end where slug=$1 returning slug", [...values, replaceIcon]);
        if (!result.rows.length) throw new HttpError(404, "Không tìm thấy chủ đề.");
      } else {
        if (body.mode !== undefined) throw new HttpError(400, "Thao tác chủ đề không hợp lệ.");
        await db.query("insert into reading_themes(slug,name_vi,name_en,icon_path) values($1,$2,$3,$4) on conflict(slug) do update set name_vi=excluded.name_vi,name_en=excluded.name_en,icon_path=case when $5 then excluded.icon_path else reading_themes.icon_path end", [...values, replaceIcon]);
      }
      revalidatePath("/", "layout");
      return Response.json({ ok: true });
    }
    if (action === "status" || action === "delete" || action === "visibility") {
      const slug = text(body.slug, 100);
      const story = (
        await db.query<{
          id: string;
          owner_id: string | null;
          title_vi: string;
          title_en: string;
          review_status: string;
        }>(
          "select id,owner_id,title_vi,title_en,review_status from stories where slug=$1",
          [slug],
        )
      ).rows[0];
      if (!story) throw new HttpError(404, "Không tìm thấy truyện.");
      if (teacher.role !== "admin" && story.owner_id !== teacher.id)
        throw new HttpError(403, "Không có quyền sửa truyện này.");
      if (action === "delete") {
        await db.query("delete from stories where id=$1", [story.id]);
        revalidatePath("/", "layout");
        return Response.json({ ok: true });
      }
      if (action === "visibility") {
        if (typeof body.is_visible !== "boolean")
          throw new HttpError(400, "Chọn ẩn hoặc hiển thị truyện.");
        await db.query("update stories set is_visible=$1 where id=$2", [body.is_visible, story.id]);
        revalidatePath("/", "layout");
        return Response.json({ ok: true });
      }
      const status = text(body.status, 20);
      if (!["draft", "pending", "published"].includes(status))
        throw new HttpError(400, "Trạng thái không hợp lệ.");
      const expected = body.expected_status === undefined ? null : text(body.expected_status, 20);
      if (expected !== null && !["draft", "pending", "published"].includes(expected))
        throw new HttpError(400, "Trạng thái trước khi thay đổi không hợp lệ.");
      if (teacher.role !== "admin" && story.review_status === "published" && status !== "published")
        throw new HttpError(403, "Truyện đã được xuất bản. Hãy mở biên tập để cập nhật nội dung.");
      if (status === "published") {
        if (teacher.role !== "admin")
          throw new HttpError(403, "Chỉ quản trị viên được duyệt và xuất bản.");
        if (body.reviewed !== true)
          throw new HttpError(400, "Xác nhận xuất bản truyện trước khi tiếp tục.");
        text(story.title_vi, 200);
        text(story.title_en, 200);
      }
      const updated = await db.query(
        "update stories set review_status=$1,is_published=$2 where id=$3 and ($4::text is null or review_status=$4) returning id",
        [status, status === "published", story.id, expected],
      );
      if (!updated.rows.length) throw new HttpError(409, "Trạng thái truyện đã thay đổi. Hãy tải lại danh sách trước khi thao tác.");
      revalidatePath("/", "layout");
      return Response.json({ ok: true });
    }
    throw new HttpError(404, "Không có thao tác này.");
  } catch (error) {
    return errorResponse(error);
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const teacher = await requireTeacher();
    const { action } = await params;
    const db = await getDb();
    if (action !== "content") throw new HttpError(404, "Không tìm thấy.");
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug) {
      const stories = await db.query(
        "select s.slug,s.title_vi,s.created_at,s.review_status,s.is_visible,s.owner_id author_id,coalesce(u.username,'Học liệu có sẵn') author_name,t.slug theme_slug,coalesce(t.name_vi,'Chưa phân chủ đề') theme_name from stories s left join reading_themes t on t.id=s.theme_id left join teacher_users u on u.id=s.owner_id where $1::boolean or s.owner_id=$2 order by s.created_at desc nulls last,s.title_vi,s.slug",
        [teacher.role === "admin", teacher.id],
      );
      const themes = await db.query(
        "select t.slug,t.name_vi,t.name_en,t.icon_path,(select count(*)::int from stories where theme_id=t.id) story_count from reading_themes t order by t.sort_order,t.name_vi",
      );
      return Response.json(
        { stories: stories.rows, themes: themes.rows },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const story = (
      await db.query<{
        id: string;
        cover_image_path: string | null;
        [key: string]: unknown;
      }>(
        "select s.*,t.slug theme_slug from stories s left join reading_themes t on t.id=s.theme_id where s.slug=$1 and ($2::boolean or s.owner_id=$3)",
        [slug, teacher.role === "admin", teacher.id],
      )
    ).rows[0];
    if (!story) throw new HttpError(404, "Không tìm thấy truyện.");
    const id = story.id;
    const sentences = (
      await db.query(
        "select text_vi,text_en,coalesce(audio_vi_path,'') audio_vi_path,coalesce(audio_en_path,'') audio_en_path from story_sentences where story_id=$1 order by sequence_no",
        [id],
      )
    ).rows;
    const vocabulary = (
      await db.query(
        "select word_vi,word_en,meaning_vi,example_vi,coalesce(pronunciation_path,'') pronunciation_path,coalesce(illustration_path,'') illustration_path from vocabulary where story_id=$1 order by sequence_no",
        [id],
      )
    ).rows;
    const questions = (
      await db.query(
        "select q.question_vi,q.question_en,q.kind,q.options,a.correct_option,coalesce(a.correct_order,'[]'::jsonb) correct_order,a.explanation_vi from reading_questions q join reading_answers a on a.question_id=q.id where q.story_id=$1 order by q.sequence_no",
        [id],
      )
    ).rows;
    return Response.json(
      {
        ...story,
        cover_image_path: story.cover_image_path ?? "",
        sentences,
        vocabulary,
        questions,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
