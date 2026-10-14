import {
  requireTeacher,
  hashPassword,
  verifyPassword,
  createSession,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isValidPassword, PASSWORD_HELP } from "@/lib/password-policy";
import {
  sameOrigin,
  readJson,
  text,
  HttpError,
  errorResponse,
} from "@/lib/http";
function password(value: unknown) {
  if (!isValidPassword(value)) throw new HttpError(400, PASSWORD_HELP);
  return value;
}
function profile(body: Record<string, unknown>) {
  const fullName = text(body.full_name ?? "", 100, false);
  const email = text(body.email ?? "", 254, false).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Địa chỉ email chưa hợp lệ.");
  return { fullName, email };
}
async function avatar(value: unknown, teacher: Awaited<ReturnType<typeof requireTeacher>>, db: Awaited<ReturnType<typeof getDb>>) {
  if (value === undefined) return undefined;
  const path = value === null ? "" : text(value, 300, false);
  if (!path) return null;
  if (!/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path))
    throw new HttpError(400, "Chọn ảnh đại diện đã tải lên.");
  const found = await db.query("select 1 from media_files where path=$1 and ($2::boolean or owner_id=$3 or exists(select 1 from teacher_users where id=$3 and avatar_path=$1))", [path, teacher.role === "admin", teacher.id]);
  if (!found.rows.length) throw new HttpError(403, "Ảnh không tồn tại hoặc không thuộc quyền sử dụng của bạn.");
  return path;
}
export async function GET() {
  try {
    const teacher = await requireTeacher();
    if (teacher.role !== "admin")
      throw new HttpError(403, "Chỉ quản trị viên xem danh sách tài khoản.");
    const rows = (
      await (
        await getDb()
      ).query(
        "select id,username,full_name,email,role,is_active,avatar_path from teacher_users order by username",
      )
    ).rows;
    return Response.json(
      { users: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const teacher = await requireTeacher();
    const body = await readJson(request, 2000);
    if (typeof body.action !== "string")
      throw new HttpError(400, "Thao tác không hợp lệ.");
    const db = await getDb();
    if (body.action === "profile") {
      const { fullName, email } = profile(body);
      const nextAvatar = await avatar(body.avatar_path, teacher, db);
      if (body.changePassword !== undefined && typeof body.changePassword !== "boolean") throw new HttpError(400, "Lựa chọn đổi mật khẩu không hợp lệ.");
      const nextHash = body.changePassword ? hashPassword(password(body.password)) : null;
      await db.transaction(async tx => {
        if (nextHash) {
          if (typeof body.currentPassword !== "string" || body.currentPassword.length > 200) throw new HttpError(400, "Nhập mật khẩu hiện tại.");
          const current = (await tx.query<{ password_hash: string }>("select password_hash from teacher_users where id=$1 for update", [teacher.id])).rows[0];
          if (!verifyPassword(body.currentPassword, current.password_hash)) throw new HttpError(400, "Mật khẩu hiện tại chưa đúng.");
        }
        await tx.query("update teacher_users set full_name=$1,email=$2,password_hash=coalesce($4,password_hash),avatar_path=case when $5::boolean then $6::text else avatar_path end where id=$3", [fullName, email, teacher.id, nextHash, nextAvatar !== undefined, nextAvatar ?? null]);
        if (nextHash) await tx.query("delete from teacher_sessions where user_id=$1", [teacher.id]);
      });
      if (nextHash) await createSession(teacher.id);
      return Response.json({ ok: true });
    }
    if (body.action === "password") {
      if (
        typeof body.currentPassword !== "string" ||
        body.currentPassword.length > 200
      )
        throw new HttpError(400, "Nhập mật khẩu hiện tại.");
      const current = (
        await db.query<{ password_hash: string }>(
          "select password_hash from teacher_users where id=$1",
          [teacher.id],
        )
      ).rows[0];
      if (!verifyPassword(body.currentPassword, current.password_hash))
        throw new HttpError(400, "Mật khẩu hiện tại chưa đúng.");
      const hash = hashPassword(password(body.password));
      await db.transaction(async (tx) => {
        await tx.query(
          "update teacher_users set password_hash=$1 where id=$2",
          [hash, teacher.id],
        );
        await tx.query("delete from teacher_sessions where user_id=$1", [
          teacher.id,
        ]);
      });
      await createSession(teacher.id);
      return Response.json({ ok: true });
    }
    if (teacher.role !== "admin")
      throw new HttpError(403, "Chỉ quản trị viên quản lý tài khoản.");
    if (body.action === "create") {
      const username = text(body.username, 40);
      if (
        !/^[a-z0-9_-]{3,40}$/.test(username) ||
        typeof body.role !== "string" ||
        !["teacher", "admin"].includes(body.role)
      )
        throw new HttpError(
          400,
          "Tên đăng nhập gồm 3–40 chữ thường, số, _ hoặc -. Chọn quyền hợp lệ.",
        );
      const hash = hashPassword(password(body.password));
      const { fullName, email } = profile(body);
      const nextAvatar = await avatar(body.avatar_path, teacher, db);
      const rows = (
        await db.query(
          "insert into teacher_users(username,password_hash,role,full_name,email,avatar_path) values($1,$2,$3,$4,$5,$6) on conflict(username) do nothing returning id",
          [username, hash, body.role, fullName, email, nextAvatar ?? null],
        )
      ).rows;
      if (!rows.length) throw new HttpError(409, "Tên đăng nhập đã tồn tại.");
      return Response.json({ ok: true });
    }
    const id = text(body.id, 36);
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        id,
      )
    )
      throw new HttpError(400, "Tài khoản không hợp lệ.");
    if (body.action === "update") {
      const username = text(body.username, 40);
      const { fullName, email } = profile(body);
      const nextAvatar = await avatar(body.avatar_path, teacher, db);
      if (!/^[a-z0-9_-]{3,40}$/.test(username) || typeof body.role !== "string" || !["teacher", "admin"].includes(body.role) || typeof body.active !== "boolean")
        throw new HttpError(400, "Kiểm tra lại tên đăng nhập, vai trò và trạng thái.");
      if (id === teacher.id && (body.active === false || body.role !== teacher.role))
        throw new HttpError(400, "Không thể khóa hoặc đổi quyền tài khoản đang sử dụng.");
      const nextHash = body.password === undefined || body.password === "" ? null : hashPassword(password(body.password));
      if (nextHash && id === teacher.id) throw new HttpError(400, "Đổi mật khẩu của bạn tại trang Tài khoản để xác nhận mật khẩu hiện tại.");
      let renewSession = false;
      await db.transaction(async tx => {
        const user = (await tx.query<{ username: string; role: string }>("select username,role from teacher_users where id=$1 for update", [id])).rows[0];
        if (!user) throw new HttpError(404, "Không tìm thấy tài khoản.");
        await tx.query("update teacher_users set username=$1,full_name=$2,email=$3,role=$4,is_active=$5,password_hash=coalesce($7,password_hash),avatar_path=case when $8::boolean then $9::text else avatar_path end where id=$6", [username, fullName, email, body.role, body.active, id, nextHash, nextAvatar !== undefined, nextAvatar ?? null]);
        if (nextHash || user.username !== username || user.role !== body.role || body.active === false) {
          await tx.query("delete from teacher_sessions where user_id=$1", [id]);
          renewSession = id === teacher.id;
        }
        await tx.query("delete from login_attempts where key in ($1,$2)", [`login:${user.username}`, `login:${username}`]);
      });
      if (renewSession) await createSession(teacher.id);
      return Response.json({ ok: true });
    }
    if (body.action === "active" && typeof body.active !== "boolean")
      throw new HttpError(400, "Trạng thái không hợp lệ.");
    if (body.action === "active" && id === teacher.id && body.active === false)
      throw new HttpError(400, "Không thể khóa tài khoản đang sử dụng.");
    if (!["active", "reset"].includes(String(body.action)))
      throw new HttpError(400, "Thao tác không hợp lệ.");
    if (body.action === "reset" && id === teacher.id)
      throw new HttpError(
        400,
        "Hãy dùng Đổi mật khẩu của tôi cho tài khoản đang sử dụng.",
      );
    const hash =
      body.action === "reset" ? hashPassword(password(body.password)) : null;
    await db.transaction(async (tx) => {
      const user = (
        await tx.query<{ username: string }>(
          "select username from teacher_users where id=$1",
          [id],
        )
      ).rows[0];
      if (!user) throw new HttpError(404, "Không tìm thấy tài khoản.");
      if (hash)
        await tx.query(
          "update teacher_users set password_hash=$1 where id=$2",
          [hash, id],
        );
      else
        await tx.query("update teacher_users set is_active=$1 where id=$2", [
          body.active,
          id,
        ]);
      if (hash || body.active === false)
        await tx.query("delete from teacher_sessions where user_id=$1", [id]);
      await tx.query("delete from login_attempts where key=$1", [
        `login:${user.username}`,
      ]);
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505")
      return Response.json({ error: "Tên đăng nhập đã tồn tại." }, { status: 409 });
    return errorResponse(error);
  }
}
