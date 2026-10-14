import type { Teacher } from "./auth";
export type AccountRecord = Teacher & { is_active: boolean };
export async function saveAccount(body: Record<string, unknown>) {
  const response = await fetch("/api/teacher/accounts", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Chưa lưu được tài khoản.");
}
export async function getAccounts(signal?: AbortSignal): Promise<AccountRecord[]> {
  const response = await fetch("/api/teacher/accounts", { signal });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Chưa tải được danh sách người dùng.");
  return result.users;
}
