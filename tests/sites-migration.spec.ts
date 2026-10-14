import {test,expect} from "@playwright/test";
import {scryptSync} from "node:crypto";
import {verifyPassword,hashPassword} from "../src/lib/password-crypto";

test("legacy hashes and newly created hashes verify without changing the password", async()=>{
  const password="Test-password-123!";
  const salt="legacy-test-only-salt";
  const oldHash=salt+":"+scryptSync(password,salt,64).toString("hex");
  expect(await verifyPassword(password,oldHash)).toBe(true);
  expect(await verifyPassword("Wrong-password-123!",oldHash)).toBe(false);
  const newHash=await hashPassword(password);
  expect(await verifyPassword(password,newHash)).toBe(true);
  expect(await verifyPassword("Wrong-password-123!",newHash)).toBe(false);
});

test("D1 preserves content, permissions, ordering, media and atomic writes", async({request})=>{
  test.setTimeout(240_000);
  const headers={Origin:"http://localhost:3100"};
  const login=await request.post("/api/teacher/login",{headers,data:{username:"test-admin",password:"Test-password-123!"}});
  expect(login.status(),await login.text()).toBe(200);
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBz8AAAAASUVORK5CYII=","base64");
  const upload=await request.post("/api/teacher/upload",{headers:{...headers,"Content-Type":"image/png"},data:png});
  expect(upload.status(),await upload.text()).toBe(200);
  const image=(await upload.json()).path;
  const slug="sites-d1-runtime-test";
  const draft={slug,title_vi:"Truyện chuyển dữ liệu",title_en:"Data migration story",cover_image_path:image,sentences:[{text_vi:"Câu thứ hai",text_en:"Second sentence"},{text_vi:"Câu thứ nhất",text_en:"First sentence"}],vocabulary:[{word_vi:"bạn",word_en:"friend"}],questions:[{question_vi:"Chọn bạn",kind:"choice",options:["Bạn","Sách"],correct_option:0,correct_order:[]}]};
  const save=await request.post("/api/teacher/save",{headers,data:draft});
  expect(save.status(),await save.text()).toBe(200);
  const read=await request.get("/api/teacher/content?slug="+slug);
  const content=await read.json();
  expect(content.sentences.map((sentence:{text_vi:string})=>sentence.text_vi)).toEqual(["Câu thứ hai","Câu thứ nhất"]);
  expect(content.questions[0].options).toEqual(["Bạn","Sách"]);
  expect(content.questions[0].correct_order).toEqual([]);
  const published=await request.post("/api/teacher/status",{headers,data:{slug,status:"published",reviewed:true}});
  expect(published.status(),await published.text()).toBe(200);
  expect((await request.get("/truyen/"+slug)).status()).toBe(200);
  expect(await (await request.get(image)).body()).toEqual(png);
  const users=await (await request.get("/api/teacher/accounts")).json();
  expect(users.users.every((user:{is_active:unknown})=>typeof user.is_active==="boolean")).toBe(true);
  const hidden=await request.post("/api/teacher/visibility",{headers,data:{slug,is_visible:false}});
  expect(hidden.status()).toBe(200);
  expect((await (await request.get("/api/teacher/content?slug="+slug)).json()).review_status).toBe("published");
  const logout=await request.post("/api/teacher/logout",{headers});
  expect(logout.status()).toBe(200);
  expect((await request.get(image)).status()).toBe(404);
  expect((await request.post("/api/teacher/login",{headers,data:{username:"legacy-teacher",password:"test-password-123"}})).status()).toBe(200);
  expect((await request.post("/api/teacher/status",{headers,data:{slug,status:"published",reviewed:true}})).status()).toBe(403);
});
