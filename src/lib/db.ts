import "server-only";
import { connection } from "next/server";
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import { getLibraryBindings } from "./cloudflare";
import { HttpError } from "./http";

export type SqlValue = string | number | boolean | null;
export type SqlStatement = { sql: string; values?: SqlValue[] };
const booleanColumns = new Set(["is_active", "is_published", "is_visible"]);
const jsonColumns = new Set(["options", "correct_order"]);

function decodeRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([name, value]) => [name,
    booleanColumns.has(name) && value !== null ? value === 1 :
    jsonColumns.has(name) && typeof value === "string" ? JSON.parse(value) : value,
  ]));
}

export class LibraryDatabase {
  constructor(private binding: D1Database) {}
  private prepare({ sql, values = [] }: SqlStatement): D1PreparedStatement {
    return this.binding.prepare(sql).bind(...values.map(value => typeof value === "boolean" ? Number(value) : value));
  }
  async query<T = Record<string, unknown>>(sql: string, values: SqlValue[] = []): Promise<{ rows: T[] }> {
    const result = await this.prepare({ sql, values }).all<Record<string, unknown>>();
    return { rows: (result.results ?? []).map(row => decodeRow(row) as T) };
  }
  async batch(statements: SqlStatement[], guards: SqlStatement[] = []) {
    if (!statements.length) return;
    const guardIds = guards.map(() => crypto.randomUUID());
    const checks = guards.map((guard, index) => ({
      sql: `INSERT INTO transaction_guards(id,valid) SELECT '${guardIds[index]}',CASE WHEN (${guard.sql}) THEN 1 ELSE 0 END`,
      values: guard.values,
    }));
    const cleanup = guardIds.map(id => ({ sql: "DELETE FROM transaction_guards WHERE id=?1", values: [id] }));
    try {
      await this.binding.batch([...checks, ...statements, ...cleanup].map(statement => this.prepare(statement)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/CHECK constraint failed:.*valid/i.test(message)) throw new HttpError(409, "Thông tin đã thay đổi. Hãy tải lại trước khi lưu.");
      if (/UNIQUE constraint failed: teacher_users.username/i.test(message)) throw new HttpError(409, "Tên đăng nhập đã tồn tại.");
      throw error;
    }
  }
}

export async function getDb(): Promise<LibraryDatabase> {
  // Bindings and durable data belong to the request, never the build machine.
  await connection();
  return new LibraryDatabase((await getLibraryBindings()).DB);
}
