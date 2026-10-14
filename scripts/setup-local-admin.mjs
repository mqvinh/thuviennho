import { PGlite } from "@electric-sql/pglite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
await mkdir(".data", { recursive: true });
const db = new PGlite(".data/little-readers");
await db.waitReady;
try {
  await db.exec(
    "create table if not exists library_migrations(name text primary key)",
  );
  for (const file of [
    "local.sql",
    "002_local_features.sql",
    "003_local_catalog.sql",
    "004_local_operations.sql",
    "005_more_stories.sql",
  ]) {
    const sql = await readFile(`database/${file}`, "utf8");
    await db.transaction(async (tx) => {
      if (
        (
          await tx.query("select 1 from library_migrations where name=$1", [
            file,
          ])
        ).rows.length
      )
        return;
      await tx.exec(sql);
      await tx.query("insert into library_migrations(name) values($1)", [file]);
    });
  }
  if (
    (await db.query("select 1 from teacher_users where role='admin'")).rows
      .length
  ) {
    console.log("Đã có tài khoản quản trị; không thay đổi tài khoản.");
  } else {
    const password = `Aa1!${randomBytes(18).toString("base64url")}`;
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    await db.query(
      "insert into teacher_users(username,password_hash,role) values($1,$2,$3)",
      ["local-admin", `${salt}:${hash}`, "admin"],
    );
    await writeFile(
      ".data/teacher-login.txt",
      `Tài khoản quản trị local\nTrang: http://localhost:3000/admin\nTên đăng nhập: local-admin\nMật khẩu: ${password}\n\nChỉ dùng cho bản local. Không commit hoặc chia sẻ tệp này.\n`,
      { mode: 0o600, flag: "wx" },
    );
    console.log(
      "Đã tạo quản trị local. Thông tin đăng nhập lưu ở .data/teacher-login.txt.",
    );
  }
} finally {
  await db.close();
}
