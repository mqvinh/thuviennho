import { randomUUID } from "node:crypto";
import { putMedia } from "@/lib/media-storage";
import { requireTeacher } from "@/lib/auth";
import { sameOrigin, errorResponse, HttpError } from "@/lib/http";
import { getDb } from "@/lib/db";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const teacher = await requireTeacher();
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Thiếu tệp.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new HttpError(413, "Tệp tối đa 5 MB.");
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const type = request.headers.get("content-type")?.split(";")[0];
    let extension = "";
    if (
      type === "image/png" &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      extension = "png";
    if (
      type === "image/jpeg" &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    )
      extension = "jpg";
    if (
      type === "image/webp" &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    )
      extension = "webp";
    if (
      (type === "audio/mpeg" || type === "audio/mp3") &&
      (bytes.toString("ascii", 0, 3) === "ID3" ||
        (bytes[0] === 255 && (bytes[1] & 224) === 224))
    )
      extension = "mp3";
    if (
      (type === "audio/wav" || type === "audio/x-wav") &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WAVE"
    )
      extension = "wav";
    if (
      (type === "audio/ogg" || type === "application/ogg") &&
      bytes.toString("ascii", 0, 4) === "OggS"
    )
      extension = "ogg";
    if (!extension)
      throw new HttpError(
        400,
        "Chỉ nhận ảnh PNG/JPG/WebP và audio MP3/WAV/OGG hợp lệ.",
      );
    const name = `${randomUUID()}.${extension}`;
    await putMedia(name, bytes, type || "application/octet-stream");
    await (
      await getDb()
    ).query("insert into media_files(path,owner_id) values(?1,?2)", [
      `/media/${name}`,
      teacher.id,
    ]);
    return Response.json({ path: `/media/${name}` });
  } catch (error) {
    return errorResponse(error);
  }
}
