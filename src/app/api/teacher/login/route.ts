import { getDb } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import {
  sameOrigin,
  readJson,
  text,
  HttpError,
  errorResponse,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await readJson(request, 2000);
    const username = text(body.username, 40);
    if (
      typeof body.password !== "string" ||
      !body.password.length ||
      body.password.length > 200
    )
      throw new HttpError(400, "Mật khẩu không hợp lệ.");
    const password = body.password;
    const db = await getDb();
    const key = `login:${username}`;
    await db.query(
      "insert into login_attempts(key,attempts,reset_at) values($1,0,now()+interval '15 minutes') on conflict(key) do update set attempts=case when login_attempts.reset_at<now() then 0 else login_attempts.attempts end,reset_at=case when login_attempts.reset_at<now() then now()+interval '15 minutes' else login_attempts.reset_at end",
      [key],
    );
    const attempt = (
      await db.query<{ attempts: number }>(
        "update login_attempts set attempts=attempts+1 where key=$1 returning attempts",
        [key],
      )
    ).rows[0];
    if (attempt.attempts > 8)
      throw new HttpError(429, "Hãy thử đăng nhập lại sau 15 phút.");
    const user = (
      await db.query<{ id: string; password_hash: string }>(
        "select id,password_hash from teacher_users where username=$1 and is_active=true",
        [username],
      )
    ).rows[0];
    if (!user || !verifyPassword(password, user.password_hash))
      throw new HttpError(401, "Tên đăng nhập hoặc mật khẩu chưa đúng.");
    await createSession(user.id);
    await db.query("delete from login_attempts where key=$1", [key]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
