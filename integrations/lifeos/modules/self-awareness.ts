/** Manual self-awareness journal. No sensors, polling, agents or external calls. */
import { mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { atomicWriteJSON } from "../lib/atomic-write";

type Category = 0 | 1 | 2 | null;
export interface SelfAwarenessEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  clarity: Category;
  stability: Category;
  tension: Category;
  note: string;
}
interface Journal { schemaVersion: 1; entries: SelfAwarenessEntry[] }

const BASE = "/api/self-awareness";
const DIMENSIONS = ["clarity", "stability", "tension"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16_384;
const ENTRY_KEYS = ["id", "createdAt", "updatedAt", ...DIMENSIONS, "note"];
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function response(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...headers, ...extra } });
}
function error(message: string, status: number, code: string): Response {
  return response({ error: message, code }, status);
}
function userDirectory(): string {
  return process.env.SELF_AWARENESS_USER_DIR || process.env.LIFEOS_USER_DIR ||
    (process.env.LIFEOS_DIR ? join(process.env.LIFEOS_DIR, "USER") : undefined) ||
    (process.env.LIFEOS_CONFIG_DIR ? join(process.env.LIFEOS_CONFIG_DIR, "USER") : undefined) ||
    (process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "LIFEOS", "USER") : undefined) ||
    join(homedir(), ".config", "LIFEOS", "USER");
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function category(value: unknown): value is Category {
  return value === null || value === 0 || value === 1 || value === 2;
}
function hasContent(entry: Pick<SelfAwarenessEntry, "clarity" | "stability" | "tension" | "note">): boolean {
  return DIMENSIONS.some((key) => entry[key] !== null) || entry.note.trim().length > 0;
}
function timestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const time = new Date(value);
  return !Number.isNaN(time.valueOf()) && time.toISOString() === value;
}
function validEntry(value: unknown): value is SelfAwarenessEntry {
  return object(value) && Object.keys(value).length === ENTRY_KEYS.length &&
    Object.keys(value).every((key) => ENTRY_KEYS.includes(key)) &&
    typeof value.id === "string" && UUID.test(value.id) &&
    timestamp(value.createdAt) && timestamp(value.updatedAt) && value.updatedAt >= value.createdAt &&
    DIMENSIONS.every((key) => category(value[key])) &&
    typeof value.note === "string" && value.note.length <= 1000 &&
    hasContent(value as unknown as SelfAwarenessEntry);
}
function readJournal(path: string): Journal {
  let raw: string;
  try { raw = readFileSync(path, "utf8"); }
  catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return { schemaVersion: 1, entries: [] };
    throw cause;
  }
  const value: unknown = JSON.parse(raw);
  if (!object(value) || Object.keys(value).length !== 2 || value.schemaVersion !== 1 ||
      !Array.isArray(value.entries) || !value.entries.every(validEntry) ||
      new Set(value.entries.map((entry) => entry.id.toLowerCase())).size !== value.entries.length) {
    throw new Error("Invalid self-awareness journal");
  }
  return value as unknown as Journal;
}
function writeJournal(path: string, journal: Journal): void {
  mkdirSync(join(userDirectory(), "SELF_AWARENESS"), { recursive: true, mode: 0o700 });
  atomicWriteJSON(path, journal, 0o600);
}

// Do not inherit the broader host exceptions used by other Pulse surfaces.
function allowedRequest(req: Request): boolean {
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname.toLowerCase())) return false;
  const host = req.headers.get("host");
  if (host && host.toLowerCase() !== url.host.toLowerCase()) return false;
  const origin = req.headers.get("origin");
  if (origin !== null && origin !== url.origin) return false;
  const site = req.headers.get("sec-fetch-site");
  return site !== "cross-site";
}
class BodyError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers.get("content-type") ?? "")) {
    throw new BodyError("請以 JSON 格式傳送紀錄。", 415);
  }
  const declaredLength = Number(req.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) throw new BodyError("紀錄內容過長。", 413);
  if (!req.body) throw new BodyError("缺少紀錄內容。");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyError("紀錄內容過長。", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new BodyError("紀錄內容不是有效的 JSON。"); }
  if (!object(value)) throw new BodyError("紀錄內容必須是物件。");
  return value;
}
function validateInput(input: Record<string, unknown>, create: boolean): void {
  const keys = [...DIMENSIONS, "note", ...(create ? ["clientId"] : [])];
  if (Object.keys(input).some((key) => !keys.includes(key))) throw new BodyError("紀錄包含不支援的欄位。");
  for (const key of DIMENSIONS) {
    if (key in input && !category(input[key])) throw new BodyError("狀態必須選擇其中一個類別，或保留未知。");
  }
  if ("note" in input && (typeof input.note !== "string" || input.note.length > 1000)) {
    throw new BodyError("筆記最多 1000 字。");
  }
  if ("clientId" in input && (typeof input.clientId !== "string" || !UUID.test(input.clientId))) {
    throw new BodyError("紀錄識別碼無效。");
  }
  if (!create && Object.keys(input).length === 0) throw new BodyError("缺少要修改的內容。");
}

export async function handleSelfAwarenessRequest(req: Request, pathname: string): Promise<Response | null> {
  if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) return null;
  if (!allowedRequest(req)) return error("僅限本機同源存取。", 403, "forbidden");
  const suffix = pathname.slice(BASE.length).replace(/^\//, "");
  const id = suffix ? suffix.toLowerCase() : null;
  if (id && !UUID.test(id)) return error("找不到這筆紀錄。", 404, "not_found");
  const allowed = id ? ["PATCH", "DELETE"] : ["GET", "POST"];
  if (!allowed.includes(req.method)) return response({ error: "不支援此操作。", code: "method_not_allowed" }, 405, { Allow: allowed.join(", ") });

  let input: Record<string, unknown> = {};
  if (req.method === "POST" || req.method === "PATCH") {
    try { input = await readBody(req); validateInput(input, req.method === "POST"); }
    catch (cause) {
      return error(cause instanceof BodyError ? cause.message : "無法讀取紀錄內容。", cause instanceof BodyError ? cause.status : 400, "invalid_input");
    }
  }

  const path = join(userDirectory(), "SELF_AWARENESS", "entries.json");
  // After the awaited body read, mutations are synchronous: concurrent requests
  // in this single Pulse process cannot interleave a read-modify-write sequence.
  try {
    const journal = readJournal(path);
    if (req.method === "GET") {
      const entries = [...journal.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      return response({ schemaVersion: 1, entries });
    }
    if (req.method === "POST") {
      const now = new Date().toISOString();
      const entry: SelfAwarenessEntry = {
        id: typeof input.clientId === "string" ? input.clientId.toLowerCase() : randomUUID(),
        createdAt: now, updatedAt: now,
        clarity: (input.clarity ?? null) as Category,
        stability: (input.stability ?? null) as Category,
        tension: (input.tension ?? null) as Category,
        note: (input.note ?? "") as string,
      };
      if (!hasContent(entry)) return error("請選擇至少一項狀態，或寫下一句筆記。", 400, "empty_entry");
      const existing = journal.entries.find((item) => item.id.toLowerCase() === entry.id);
      if (existing) {
        if (DIMENSIONS.some((key) => existing[key] !== entry[key]) || existing.note !== entry.note) {
          return error("此識別碼已有不同內容，請重新整理後再試。", 409, "id_conflict");
        }
        return response({ entry: existing });
      }
      journal.entries.push(entry);
      writeJournal(path, journal);
      return response({ entry }, 201);
    }
    const index = journal.entries.findIndex((entry) => entry.id.toLowerCase() === id);
    if (index === -1) return error("找不到這筆紀錄。", 404, "not_found");
    if (req.method === "DELETE") {
      journal.entries.splice(index, 1);
      writeJournal(path, journal);
      return response({ ok: true });
    }
    const entry = { ...journal.entries[index], ...input, updatedAt: new Date().toISOString() } as SelfAwarenessEntry;
    if (!hasContent(entry)) return error("請保留至少一項狀態，或一句筆記。", 400, "empty_entry");
    // Avoid an invalid sequence if the local clock was adjusted backwards.
    if (entry.updatedAt < journal.entries[index].updatedAt) entry.updatedAt = journal.entries[index].updatedAt;
    journal.entries[index] = entry;
    writeJournal(path, journal);
    return response({ entry });
  } catch {
    return error("無法讀取或儲存本機紀錄；原有資料未被重設。", 500, "storage_error");
  }
}
