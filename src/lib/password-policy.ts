export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 200;
export const PASSWORD_PATTERN = "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s]).{6,200}";
export const PASSWORD_HELP = "Mật khẩu cần từ 6 đến 200 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";

export function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^(?:${PASSWORD_PATTERN})$`).exec(value)?.[0] === value;
}
