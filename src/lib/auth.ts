import "server-only";
import { cookies } from "next/headers";
import {
  createHash,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { getDb } from "./db";
import { HttpError } from "./http";
export type Teacher = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_path: string | null;
  role: "teacher" | "admin";
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function getTeacher(): Promise<Teacher | null> {
  const token = (await cookies()).get("library_teacher")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  return (
    (
      await db.query<Teacher>(
        `select u.id,u.username,u.role,u.full_name,u.email,u.avatar_path from teacher_users u join teacher_sessions s on s.user_id=u.id where s.token_hash=$1 and s.expires_at>now() and u.is_active=true`,
        [hashToken(token)],
      )
    ).rows[0] ?? null
  );
}
export async function requireTeacher() {
  const teacher = await getTeacher();
  if (!teacher) throw new HttpError(401, "Hãy đăng nhập tài khoản giáo viên.");
  return teacher;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export async function createSession(id: string) {
  const token = randomBytes(32).toString("hex");
  const db = await getDb();
  await db.query("delete from teacher_sessions where expires_at<now()");
  await db.query(
    "insert into teacher_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '8 hours')",
    [hashToken(token), id],
  );
  (await cookies()).set("library_teacher", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 3600,
  });
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
