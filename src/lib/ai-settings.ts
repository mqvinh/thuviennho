import "server-only";
import { getDb, type LibraryDatabase, type SqlStatement } from "./db";
import { HttpError, text } from "./http";

const defaultApiUrl = "https://api.openai.com/v1/responses";

type StoredAISettings = {
  ai_api_url: string;
  ai_api_key: string | null;
  ai_model: string;
};

export type AdminAISettings = {
  api_url: string;
  model: string;
  has_key: boolean;
  schema_ready: boolean;
};

export function normalizeAIUrl(value: string) {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new HttpError(400, "Địa chỉ API không hợp lệ."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new HttpError(400, "Địa chỉ API phải dùng HTTPS, không chứa tài khoản, query hoặc fragment.");
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith("/responses")) url.pathname += "/responses";
  return url.href;
}

async function readStoredAISettings(db: LibraryDatabase) {
  try {
    const { rows } = await db.query<StoredAISettings>(
      "select ai_api_url,ai_api_key,ai_model from site_settings where id=true",
    );
    return { stored: rows[0], schemaReady: true };
  } catch (error) {
    // Older databases can still serve website settings and use server envs.
    // Only the known missing-column error is a migration fallback.
    const message = error instanceof Error ? error.message : "";
    if (!/no such column: (?:site_settings\.)?ai_|column "ai_[a-z_]+" does not exist/i.test(message)) throw error;
    return { stored: undefined, schemaReady: false };
  }
}

async function readAISettings() {
  const { stored, schemaReady } = await readStoredAISettings(await getDb());
  return {
    api_url: stored?.ai_api_url || process.env.OPENAI_API_URL || defaultApiUrl,
    // NULL inherits the legacy env; an explicitly cleared key disables it.
    api_key: stored?.ai_api_key ?? process.env.OPENAI_API_KEY ?? "",
    model: stored?.ai_model || process.env.OPENAI_MODEL || "",
    schema_ready: schemaReady,
  };
}

// Only call after checking the admin role. Never return the stored secret.
export async function getAdminAISettings(): Promise<AdminAISettings> {
  const settings = await readAISettings();
  return {
    api_url: settings.api_url,
    model: settings.model,
    has_key: Boolean(settings.api_key),
    schema_ready: settings.schema_ready,
  };
}

// Only call from the authenticated, server-side AI generation handler.
export async function getAIConnection() {
  const settings = await readAISettings();
  if (!settings.api_key || !settings.model)
    throw new HttpError(503, "AI chưa được cấu hình. Quản trị viên cần nhập địa chỉ API, API key và model trong Cài đặt website.");
  return { url: normalizeAIUrl(settings.api_url), key: settings.api_key, model: settings.model };
}

export async function aiSettingsUpdate(value: unknown, db: LibraryDatabase): Promise<SqlStatement> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Cấu hình AI không hợp lệ.");
  const input = value as Record<string, unknown>;
  const apiUrl = normalizeAIUrl(text(input.api_url, 1000));
  const model = text(input.model, 150, false);
  const key = text(input.api_key ?? "", 2000, false);
  const hasControl = [...key, ...model].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if ((input.clear_key !== undefined && typeof input.clear_key !== "boolean") || /\s/.test(key) || hasControl)
    throw new HttpError(400, "Kiểm tra lại API key và tên model.");
  if (input.clear_key && key)
    throw new HttpError(400, "Chọn nhập API key mới hoặc xóa key hiện tại.");
  if (!(await readStoredAISettings(db)).schemaReady)
    throw new HttpError(503, "Cần chạy migration cấu hình AI cho cơ sở dữ liệu trước khi lưu.");
  return {
    sql: "update site_settings set ai_api_url=?1,ai_model=?2,ai_api_key=case when ?3=true then '' when ?4<>'' then ?4 else ai_api_key end where id=true",
    values: [apiUrl, model, input.clear_key === true, key],
  };
}
