import { readMedia } from "@/lib/media-storage";
import { getDb } from "@/lib/db";
import { getTeacher } from "@/lib/auth";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!/^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(file))
    return new Response("Not found", { status: 404 });
  const media = `/media/${file}`;
  const db = await getDb();
  const publicMedia =
    (
      await db.query(
        `select 1 where exists(select 1 from site_settings where icon_path=?1 or logo_path=?1) or exists(select 1 from reading_themes where icon_path=?1) or exists(select 1 from stories s where s.is_published=true and s.is_visible=true and (s.cover_image_path=?1 or exists(select 1 from story_sentences ss where ss.story_id=s.id and (ss.audio_vi_path=?1 or ss.audio_en_path=?1)) or exists(select 1 from vocabulary v where v.story_id=s.id and (v.pronunciation_path=?1 or v.illustration_path=?1))))`,
        [media],
      )
    ).rows.length > 0;
  if (!publicMedia) {
    const teacher = await getTeacher();
    if (!teacher) return new Response("Not found", { status: 404 });
    if (
      teacher.role !== "admin" &&
      !(
        await db.query(
          "select 1 from media_files where path=?1 and (owner_id=?2 or exists(select 1 from teacher_users where id=?2 and avatar_path=?1))",
          [media, teacher.id],
        )
      ).rows.length
    )
      return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readMedia(file);
    if (!data) return new Response("Not found", { status: 404 });
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };
    return new Response(data.body as unknown as ReadableStream, {
      headers: {
        "Content-Type": types[file.split(".").pop()!],
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
