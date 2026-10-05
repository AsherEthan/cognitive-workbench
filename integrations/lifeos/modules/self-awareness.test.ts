import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { handleSelfAwarenessRequest } from "./self-awareness";

const BASE = "/api/self-awareness";
const ORIGIN = "http://127.0.0.1:31337";
let root: string;
let previousRoot: string | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lifeos-self-awareness-test-"));
  previousRoot = process.env.SELF_AWARENESS_USER_DIR;
  process.env.SELF_AWARENESS_USER_DIR = root;
});
afterEach(() => {
  if (previousRoot === undefined) delete process.env.SELF_AWARENESS_USER_DIR;
  else process.env.SELF_AWARENESS_USER_DIR = previousRoot;
  rmSync(root, { recursive: true, force: true });
});

async function call(method = "GET", body?: unknown, suffix = "", extraHeaders: Record<string, string> = {}) {
  const request = new Request(`${ORIGIN}${BASE}${suffix}`, {
    method,
    headers: { Origin: ORIGIN, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await handleSelfAwarenessRequest(request, `${BASE}${suffix}`);
  expect(result).not.toBeNull();
  expect(result!.headers.get("cache-control")).toBe("no-store");
  return result!;
}
function journalPath() { return join(root, "SELF_AWARENESS", "entries.json"); }

describe("manual self-awareness journal", () => {
  test("returns an empty journal only when storage is absent", async () => {
    expect(await (await call()).json()).toEqual({ schemaVersion: 1, entries: [] });
    expect(() => statSync(join(root, "SELF_AWARENESS"))).toThrow();
  });

  test("stores unknown as null, accepts zero, and survives new reads", async () => {
    const id = randomUUID();
    const created = await call("POST", { clientId: id, clarity: 0 });
    expect(created.status).toBe(201);
    const { entry } = await created.json();
    expect(entry).toMatchObject({ id, clarity: 0, stability: null, tension: null, note: "" });
    expect(entry.createdAt).toBe(entry.updatedAt);
    expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt);
    expect(await (await call()).json()).toEqual({ schemaVersion: 1, entries: [entry] });
    expect(JSON.parse(readFileSync(journalPath(), "utf8")).entries).toEqual([entry]);
    expect(statSync(journalPath()).mode & 0o777).toBe(0o600);
  });

  test("create is idempotent, conflicting retries never overwrite", async () => {
    const input = { clientId: randomUUID(), stability: 1, note: "開會後" };
    const first = await call("POST", input);
    const second = await call("POST", input);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect((await call("POST", { ...input, stability: 2 })).status).toBe(409);
    expect((await (await call()).json()).entries.length).toBe(1);
  });

  test("concurrent valid requests do not lose entries", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => call("POST", {
      clientId: randomUUID(), note: `獨立紀錄 ${i}`,
    })));
    expect(results.every((result) => result.status === 201)).toBe(true);
    expect((await (await call()).json()).entries.length).toBe(20);
  });

  test("patch preserves unspecified dimensions and time, delete persists", async () => {
    const { entry } = await (await call("POST", { clarity: 2, tension: 0, note: "原筆記" })).json();
    const changed = await call("PATCH", { clarity: null, note: "更正筆記" }, `/${entry.id}`);
    expect(changed.status).toBe(200);
    const updated = (await changed.json()).entry;
    expect(updated).toMatchObject({ id: entry.id, createdAt: entry.createdAt, clarity: null, tension: 0, stability: null, note: "更正筆記" });
    expect(updated.updatedAt >= updated.createdAt).toBe(true);
    expect((await call("PATCH", { tension: null, note: "  " }, `/${entry.id}`)).status).toBe(400);
    expect((await (await call()).json()).entries[0]).toEqual(updated);
    expect(await (await call("DELETE", undefined, `/${entry.id}`)).json()).toEqual({ ok: true });
    expect((await (await call()).json()).entries).toEqual([]);
    expect((await call("DELETE", undefined, `/${entry.id}`)).status).toBe(404);
  });

  test("rejects invented scores, empty entries, injected fields and excess notes", async () => {
    for (const body of [
      {}, { clarity: null, stability: null, tension: null, note: "\n  " },
      { clarity: 3 }, { clarity: -1 }, { clarity: 1.5 }, { clarity: "1" }, { clarity: false },
      { clarity: {} }, { clarity: [] }, { note: null }, { note: "x".repeat(1001) },
      { note: "record", createdAt: new Date().toISOString() }, { note: "record", extra: true },
      { note: "record", clientId: "../../outside" }, [], null,
    ]) {
      expect((await call("POST", body)).status).toBe(400);
    }
    expect((await call("POST", { note: "x".repeat(1000) })).status).toBe(201);
    expect((await (await call()).json()).entries.length).toBe(1);
  });

  test("invalid JSON and oversized streams fail without writing", async () => {
    const invalid = new Request(`${ORIGIN}${BASE}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
    expect((await handleSelfAwarenessRequest(invalid, BASE))!.status).toBe(400);
    const large = new Request(`${ORIGIN}${BASE}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(16_385) });
    expect((await handleSelfAwarenessRequest(large, BASE))!.status).toBe(413);
    expect((await (await call()).json()).entries).toEqual([]);
  });

  test("read, create, patch and delete refuse a corrupt file without overwriting it", async () => {
    mkdirSync(join(root, "SELF_AWARENESS"));
    for (const raw of ["broken JSON", '{"schemaVersion":2,"entries":[]}', '{"schemaVersion":1,"entries":[{"id":"bad"}]}']) {
      writeFileSync(journalPath(), raw);
      for (const [method, body, suffix] of [
        ["GET", undefined, ""], ["POST", { note: "must not replace" }, ""],
        ["PATCH", { note: "must not replace" }, `/${randomUUID()}`],
        ["DELETE", undefined, `/${randomUUID()}`],
      ] as const) {
        expect((await call(method, body, suffix)).status).toBe(500);
        expect(readFileSync(journalPath(), "utf8")).toBe(raw);
      }
    }
  });

  test("filesystem errors do not appear as empty successful reads", async () => {
    writeFileSync(join(root, "SELF_AWARENESS"), "not a directory");
    expect((await call()).status).toBe(500);
    expect((await call("POST", { clarity: 1 })).status).toBe(500);
    expect(readFileSync(join(root, "SELF_AWARENESS"), "utf8")).toBe("not a directory");
  });

  test("lists newest first and rejects duplicate persisted ids", async () => {
    const one = (await (await call("POST", { note: "one" })).json()).entry;
    const two = (await (await call("POST", { note: "two" })).json()).entry;
    one.createdAt = one.updatedAt = "2026-01-01T00:00:00.000Z";
    two.createdAt = two.updatedAt = "2026-01-02T00:00:00.000Z";
    writeFileSync(journalPath(), JSON.stringify({ schemaVersion: 1, entries: [one, two] }));
    expect((await (await call()).json()).entries.map((entry: { note: string }) => entry.note)).toEqual(["two", "one"]);
    writeFileSync(journalPath(), JSON.stringify({ schemaVersion: 1, entries: [one, { ...one }] }));
    expect((await call()).status).toBe(500);
  });

  test("rejects cross-origin, rebinding, fetch-site and form writes", async () => {
    expect((await call("POST", { clarity: 1 }, "", { Origin: "https://example.com" })).status).toBe(403);
    expect((await call("POST", { clarity: 1 }, "", { Origin: "null" })).status).toBe(403);
    expect((await call("POST", { clarity: 1 }, "", { Origin: "http://localhost:31337" })).status).toBe(403);
    expect((await call("POST", { clarity: 1 }, "", { Host: "127.0.0.1.evil.example:31337" })).status).toBe(403);
    expect((await call("GET", undefined, "", { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
    expect((await call("POST", { clarity: 1 }, "", { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await call("POST", { clarity: 1 }, "", { "Content-Type": "application/x-www-form-urlencoded" })).status).toBe(415);
    const rebound = new Request(`http://evil.example:31337${BASE}`);
    expect((await handleSelfAwarenessRequest(rebound, BASE))!.status).toBe(403);
    expect((await (await call()).json()).entries).toEqual([]);
  });

  test("routes only journal operations, with explicit method restrictions", async () => {
    expect(await handleSelfAwarenessRequest(new Request(`${ORIGIN}/api/other`), "/api/other")).toBeNull();
    expect(await handleSelfAwarenessRequest(new Request(`${ORIGIN}${BASE}-other`), `${BASE}-other`)).toBeNull();
    expect((await call("PUT", { clarity: 1 })).status).toBe(405);
    expect((await call("GET", undefined, `/${randomUUID()}`)).status).toBe(405);
    expect((await call("PATCH", { note: "x" }, `/${randomUUID()}`)).status).toBe(404);
    expect((await call("DELETE", undefined, "/../../file")).status).toBe(404);
  });
});
