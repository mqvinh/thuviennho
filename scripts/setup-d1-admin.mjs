import {openLocalPlatform} from "./lib/local-platform.mjs";
import {applyMigrations} from "./lib/data-transfer.mjs";
import {randomBytes,pbkdf2Sync} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";

const platform=await openLocalPlatform();
try {
  await applyMigrations(platform.env.DB);
  if (await platform.env.DB.prepare("select id from teacher_users where role='admin' limit 1").first()) console.log("Đã có quản trị. Không thay đổi tài khoản hoặc mật khẩu.");
  else {
    const password="Aa1!"+randomBytes(18).toString("base64url");
    const salt=randomBytes(16);
    const hash="pbkdf2-sha256:210000:"+salt.toString("hex")+":"+pbkdf2Sync(password,salt,210000,32,"sha256").toString("hex");
    await mkdir(".data",{recursive:true});
    const credentialsFile=".data/admin-login-"+Date.now()+"-"+randomBytes(4).toString("hex")+".txt";
    await writeFile(credentialsFile,"Tên đăng nhập: local-admin\nMật khẩu: "+password+"\n",{flag:"wx",mode:0o600});
    await platform.env.DB.prepare("insert into teacher_users(username,password_hash,role) values('local-admin',?1,'admin')").bind(hash).run();
    console.log("Đã tạo quản trị. Thông tin đăng nhập nằm ở "+credentialsFile+".");
  }
} finally {await platform.dispose();}
