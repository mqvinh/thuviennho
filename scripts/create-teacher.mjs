import {openLocalPlatform} from "./lib/local-platform.mjs";
import {applyMigrations} from "./lib/data-transfer.mjs";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
const username = process.argv[2];
const role = process.argv[3] || "teacher";
if (
  !username ||
  !/^[a-z0-9_-]{3,40}$/.test(username) ||
  !["teacher", "admin"].includes(role)
) {
  console.error(
    "Dừng server trước. Cách dùng: node scripts/create-teacher.mjs ten-dang-nhap teacher|admin",
  );
  process.exit(1);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await new Promise((resolve) =>
  rl.question("Mật khẩu (ít nhất 6 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; sẽ hiện trong terminal): ", resolve),
);
rl.close();
if (password.length < 6 || password.length > 200 || !/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{6,200}$/.test(password)) {
  console.error("Mật khẩu cần từ 6 đến 200 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
  process.exit(1);
}
const platform=await openLocalPlatform();
try {
  await applyMigrations(platform.env.DB);
  const salt=randomBytes(16);
  const hash=pbkdf2Sync(password,salt,210000,32,"sha256").toString("hex");
  await platform.env.DB.prepare("insert into teacher_users(username,password_hash,role) values(?1,?2,?3)").bind(username,"pbkdf2-sha256:210000:"+salt.toString("hex")+":"+hash,role).run();
  console.log("Đã tạo tài khoản "+username+" ("+role+").");
} finally {await platform.dispose();}
