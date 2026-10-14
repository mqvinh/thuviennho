import {
  requireTeacher,
  hashPassword,
  verifyPassword,
  createSession,
} from "@/lib/auth";
import { getDb, type SqlStatement } from "@/lib/db";
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
  const found = await db.query("select 1 from media_files where path=?1 and (?2 or owner_id=?3 or exists(select 1 from teacher_users where id=?3 and avatar_path=?1))", [path, teacher.role === "admin", teacher.id]);
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
    const body = await readJson(request,2000);
    if (typeof body.action !== "string") throw new HttpError(400,"Thao tác không hợp lệ.");
    const db = await getDb();
    const actorGuard: SqlStatement = {sql:"exists(select 1 from teacher_users where id=?1 and role=?2 and is_active=true)",values:[teacher.id,teacher.role]};
    if (body.action === "profile" || body.action === "password") {
      const changePassword = body.action === "password" || body.changePassword === true;
      if (body.changePassword !== undefined && typeof body.changePassword !== "boolean") throw new HttpError(400,"Lựa chọn đổi mật khẩu không hợp lệ.");
      const guards = [actorGuard];
      let nextHash: string | null = null;
      if (changePassword) {
        if (typeof body.currentPassword !== "string" || body.currentPassword.length>200) throw new HttpError(400,"Nhập mật khẩu hiện tại.");
        const current = (await db.query<{password_hash:string}>("select password_hash from teacher_users where id=?1",[teacher.id])).rows[0];
        if (!current || !(await verifyPassword(body.currentPassword,current.password_hash))) throw new HttpError(400,"Mật khẩu hiện tại chưa đúng.");
        nextHash = await hashPassword(password(body.password));
        guards.push({sql:"exists(select 1 from teacher_users where id=?1 and password_hash=?2)",values:[teacher.id,current.password_hash]});
      }
      const statements: SqlStatement[] = [];
      if (body.action === "profile") {
        const {fullName,email} = profile(body);
        const nextAvatar = await avatar(body.avatar_path,teacher,db);
        statements.push({sql:"update teacher_users set full_name=?1,email=?2,password_hash=coalesce(?4,password_hash),avatar_path=case when ?5 then ?6 else avatar_path end where id=?3",values:[fullName,email,teacher.id,nextHash,nextAvatar !== undefined,nextAvatar ?? null]});
      } else statements.push({sql:"update teacher_users set password_hash=?1 where id=?2",values:[nextHash,teacher.id]});
      if (nextHash) statements.push({sql:"delete from teacher_sessions where user_id=?1",values:[teacher.id]});
      await db.batch(statements,guards);
      if (nextHash) await createSession(teacher.id);
      return Response.json({ok:true});
    }
    if (teacher.role !== "admin") throw new HttpError(403,"Chỉ quản trị viên quản lý tài khoản.");
    if (body.action === "create") {
      const username = text(body.username,40);
      const role = body.role;
      if (!/^[a-z0-9_-]{3,40}$/.test(username) || typeof role !== "string" || !["teacher","admin"].includes(role)) throw new HttpError(400,"Tên đăng nhập gồm 3–40 chữ thường, số, _ hoặc -. Chọn quyền hợp lệ.");
      const hash = await hashPassword(password(body.password));
      const {fullName,email} = profile(body);
      const nextAvatar = await avatar(body.avatar_path,teacher,db);
      const result = await db.query("insert into teacher_users(username,password_hash,role,full_name,email,avatar_path) values(?1,?2,?3,?4,?5,?6) on conflict(username) do nothing returning id",[username,hash,role,fullName,email,nextAvatar ?? null]);
      if (!result.rows.length) throw new HttpError(409,"Tên đăng nhập đã tồn tại.");
      return Response.json({ok:true});
    }
    const id = text(body.id,36);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400,"Tài khoản không hợp lệ.");
    const user = (await db.query<{username:string;role:string;password_hash:string}>("select username,role,password_hash from teacher_users where id=?1",[id])).rows[0];
    if (!user) throw new HttpError(404,"Không tìm thấy tài khoản.");
    const guards: SqlStatement[] = [actorGuard,{sql:"exists(select 1 from teacher_users where id=?1 and username=?2 and role=?3 and password_hash=?4)",values:[id,user.username,user.role,user.password_hash]}];
    const statements: SqlStatement[] = [];
    let renewSession = false;
    if (body.action === "update") {
      const username = text(body.username,40);
      const {fullName,email} = profile(body);
      const nextAvatar = await avatar(body.avatar_path,teacher,db);
      const role = body.role;
      if (!/^[a-z0-9_-]{3,40}$/.test(username) || typeof role !== "string" || !["teacher","admin"].includes(role) || typeof body.active !== "boolean") throw new HttpError(400,"Kiểm tra lại tên đăng nhập, vai trò và trạng thái.");
      if (id === teacher.id && (body.active === false || role !== teacher.role)) throw new HttpError(400,"Không thể khóa hoặc đổi quyền tài khoản đang sử dụng.");
      const nextHash = body.password === undefined || body.password === "" ? null : await hashPassword(password(body.password));
      if (nextHash && id === teacher.id) throw new HttpError(400,"Đổi mật khẩu của bạn tại trang Tài khoản để xác nhận mật khẩu hiện tại.");
      statements.push({sql:"update teacher_users set username=?1,full_name=?2,email=?3,role=?4,is_active=?5,password_hash=coalesce(?7,password_hash),avatar_path=case when ?8 then ?9 else avatar_path end where id=?6",values:[username,fullName,email,role,body.active,id,nextHash,nextAvatar !== undefined,nextAvatar ?? null]});
      if (nextHash || user.username !== username || user.role !== role || body.active === false) {
        statements.push({sql:"delete from teacher_sessions where user_id=?1",values:[id]});
        renewSession = id === teacher.id;
      }
      statements.push({sql:"delete from login_attempts where key in (?1,?2)",values:["login:"+user.username,"login:"+username]});
    } else {
      if (!["active","reset"].includes(body.action)) throw new HttpError(400,"Thao tác không hợp lệ.");
      if (body.action === "active" && typeof body.active !== "boolean") throw new HttpError(400,"Trạng thái không hợp lệ.");
      if (id === teacher.id && body.action === "active" && body.active === false) throw new HttpError(400,"Không thể khóa tài khoản đang sử dụng.");
      if (id === teacher.id && body.action === "reset") throw new HttpError(400,"Hãy dùng Đổi mật khẩu của tôi cho tài khoản đang sử dụng.");
      const hash = body.action === "reset" ? await hashPassword(password(body.password)) : null;
      statements.push(hash ? {sql:"update teacher_users set password_hash=?1 where id=?2",values:[hash,id]} : {sql:"update teacher_users set is_active=?1 where id=?2",values:[body.active as boolean,id]});
      if (hash || body.active === false) statements.push({sql:"delete from teacher_sessions where user_id=?1",values:[id]});
      statements.push({sql:"delete from login_attempts where key=?1",values:["login:"+user.username]});
    }
    await db.batch(statements,guards);
    if (renewSession) await createSession(teacher.id);
    return Response.json({ok:true});
  } catch (error) { return errorResponse(error); }
}
