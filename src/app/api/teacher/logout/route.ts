import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { sameOrigin, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await cookies();
    const token = store.get("library_teacher")?.value;
    if (token)
      await (
        await getDb()
      ).query("delete from teacher_sessions where token_hash=?1", [
        hashToken(token),
      ]);
    store.delete("library_teacher");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
