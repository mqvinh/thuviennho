import { test, expect, type APIRequestContext } from "@playwright/test";

const headers = { Origin: "http://localhost:3100" };
async function login(request: APIRequestContext, username = "test-admin", password = "Test-password-123!") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password } })).status()).toBe(200);
}

test("all account write actions enforce password composition, accept six characters and retain existing logins", async ({ request, playwright }) => {
  await login(request);
  const member = await playwright.request.newContext({ baseURL: "http://localhost:3100" });
  try {
    await login(member, "legacy-teacher", "test-password-123");
    expect((await member.get("/api/teacher/content")).status()).toBe(200);
    const username = "password-policy-member";
    expect((await request.post("/api/teacher/accounts", { headers, data: { action: "create", username, password: "Aa1!bc", role: "teacher", full_name: "Tên đã lưu" } })).status()).toBe(200);
    await login(member, username, "Aa1!bc");
    const { id } = (await (await request.get("/api/teacher/accounts")).json()).users.find((user: { username: string }) => user.username === username);
    const update = { id, username, role: "teacher", active: true, full_name: "Tên chưa lưu" };
    const invalidPasswords = ["Aa1!b", "aa1!bc", "AA1!BC", "Aa!!bc", "Aa12bc", "Aa1 bc", `Aa1!${"b".repeat(197)}`];
    for (const password of invalidPasswords) {
      for (const [client, data] of [
        [request, { action: "create", username: "invalid-password-user", role: "teacher", password }],
        [request, { ...update, action: "update", password }],
        [request, { action: "reset", id, password }],
        [member, { action: "password", currentPassword: "Aa1!bc", password }],
        [member, { action: "profile", full_name: "Tên chưa lưu", changePassword: true, currentPassword: "Aa1!bc", password }],
      ] as const) {
        const response = await client.post("/api/teacher/accounts", { headers, data });
        expect(response.status(), `${data.action}: ${password.length} characters`).toBe(400);
        expect((await response.json()).error).toContain("chữ hoa, chữ thường, số và ký tự đặc biệt");
      }
    }
    const users = (await (await request.get("/api/teacher/accounts")).json()).users;
    expect(users.find((user: { id: string }) => user.id === id).full_name).toBe("Tên đã lưu");
    expect(users.some((user: { username: string }) => user.username === "invalid-password-user")).toBe(false);
    expect((await member.get("/api/teacher/content")).status()).toBe(200);
    expect((await request.post("/api/teacher/accounts", { headers, data: { ...update, action: "update", password: "" } })).status()).toBe(200);
    expect((await member.get("/api/teacher/content")).status()).toBe(200);
    expect((await request.post("/api/teacher/accounts", { headers, data: { ...update, action: "update", password: "Bb2@cd" } })).status()).toBe(200);
    expect((await member.get("/api/teacher/content")).status()).toBe(401);
    await login(member, username, "Bb2@cd");
    expect((await request.post("/api/teacher/accounts", { headers, data: { action: "reset", id, password: "Cc3#de" } })).status()).toBe(200);
    expect((await member.get("/api/teacher/content")).status()).toBe(401);
    await login(member, username, "Cc3#de");
    expect((await member.post("/api/teacher/accounts", { headers, data: { action: "password", currentPassword: "Cc3#de", password: "Dd4$ef" } })).status()).toBe(200);
    expect((await member.get("/api/teacher/content")).status()).toBe(200);
    expect((await member.post("/api/teacher/accounts", { headers, data: { action: "profile", full_name: "Tên mới", changePassword: true, currentPassword: "Dd4$ef", password: "Ee5%fg" } })).status()).toBe(200);
    await login(member, username, "Ee5%fg");
  } finally { await member.dispose(); }
});

test("create and personal account forms accept six-character passwords and block missing character classes", async ({ page }) => {
  await login(page.request);
  await page.goto("/admin/bien-tap-nguoi-dung");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("password-policy-ui");
  const password = page.getByLabel("Mật khẩu cấp mới", { exact: true });
  for (const value of ["Aa1!b", "aa1!bc", "AA1!BC", "Aa!!bc", "Aa12bc", "Aa1 bc"]) {
    await password.fill(value);
    expect(await password.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  }
  await password.fill("Aa1!bc");
  expect(await password.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  await page.getByRole("button", { name: "Lưu người dùng", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/nguoi-dung\?saved=1$/);
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await login(page.request, "password-policy-ui", "Aa1!bc");
  await page.goto("/admin/tai-khoan");
  await page.getByLabel("Đổi mật khẩu", { exact: true }).check();
  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("Aa1!bc");
  for (const label of ["Mật khẩu mới", "Nhập lại mật khẩu mới"]) {
    const input = page.getByLabel(label, { exact: true });
    await input.fill("Ab12cd");
    expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false);
    await input.fill("Bb2@cd");
  }
  await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu thông tin và đổi mật khẩu.");
  await login(page.request, "password-policy-ui", "Bb2@cd");
});
