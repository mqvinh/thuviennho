import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { errorResponse, HttpError, readJson, sameOrigin, text } from "@/lib/http";

async function requireAdmin() {
  if ((await requireTeacher()).role !== "admin")
    throw new HttpError(403, "Chỉ quản trị viên được thay đổi cài đặt website.");
}

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await getSiteSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const body = await readJson(request);
    const name = text(body.site_name, 100);
    const description = body.site_description === undefined ? null : text(body.site_description, 300, false);
    const image = (value: unknown) => {
      const media = text(value, 300, false);
      if (media && !/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(media))
        throw new HttpError(400, "Icon và logo phải là ảnh PNG, JPG hoặc WebP đã tải lên.");
      return media;
    };
    const icon = image(body.icon_path), logo = image(body.logo_path);
    const db = await getDb();
    await db.transaction(async tx => {
      for (const media of [icon, logo].filter(Boolean)) {
        if (!(await tx.query("select 1 from media_files where path=$1", [media])).rows.length)
          throw new HttpError(400, "Ảnh đã chọn không tồn tại. Hãy tải ảnh lên lại.");
      }
      await tx.query("update site_settings set site_name=$1,icon_path=$2,logo_path=$3,site_description=coalesce($4,site_description) where id=true", [name, icon, logo, description]);
    });
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
