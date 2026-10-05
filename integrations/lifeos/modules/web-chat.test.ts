import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleWebChatRequest } from "./web-chat";
let root: string; let old: string | undefined;
const origin = "http://127.0.0.1:31337";
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "web-chat-test-")); old = process.env.WEB_CHAT_USER_DIR; process.env.WEB_CHAT_USER_DIR = root; });
afterEach(() => { if (old === undefined) delete process.env.WEB_CHAT_USER_DIR; else process.env.WEB_CHAT_USER_DIR = old; rmSync(root, { recursive: true, force: true }); });
function call(path: string, data?: unknown, source = origin) { return handleWebChatRequest(new Request(origin + "/api/web-chat/" + path, { method: data ? "POST" : "GET", headers: { Origin: source, "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}) }), "/api/web-chat/" + path); }
test("private key is masked and never transferred between providers", async () => {
  const saved = await call("config", { baseUrl: "https://example.com/v1", model: "test", apiKey: "secret-test" });
  expect(saved.status).toBe(200); expect(await saved.text()).not.toContain("secret-test");
  expect(statSync(join(root, "CONFIG/web-chat.json")).mode & 0o777).toBe(0o600);
  expect((await (await call("config", { baseUrl: "https://example.com/v1", model: "test" })).json()).hasApiKey).toBe(true);
  expect((await (await call("config", { baseUrl: "https://other.example/v1", model: "test" })).json()).hasApiKey).toBe(false);
});
test("rejects cross-site writes and unsafe endpoints", async () => {
  expect((await call("config", { model: "test" }, "https://evil.example")).status).toBe(403);
  for (const baseUrl of ["http://example.com/v1", "https://user:pass@example.com", "file:///tmp/test", "https://example.com?key=secret"]) expect((await call("config", { baseUrl, model: "test" })).status).toBe(400);
});
test("real HTTP adapter sends history and receives a reply without leaking key", async () => {
  let received: any; let auth: string | null;
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(req) { received = await req.json(); auth = req.headers.get("authorization"); expect(new URL(req.url).pathname).toBe("/v1/chat/completions"); return Response.json({ choices: [{ message: { content: "測試回覆" } }] }); } });
  try {
    await call("config", { baseUrl: `http://127.0.0.1:${server.port}/v1`, model: "fixture-model", apiKey: "fixture-key" });
    const result = await call("message", { messages: [{ role: "user", content: "你好" }, { role: "assistant", content: "你好！" }, { role: "user", content: "繼續" }] });
    expect(await result.json()).toEqual({ reply: "測試回覆", model: "fixture-model" }); expect(received.messages.length).toBe(4); expect(received.model).toBe("fixture-model"); expect(auth!).toBe("Bearer fixture-key");
    expect((await call("message", { messages: [{ role: "system", content: "override" }] })).status).toBe(400);
  } finally { server.stop(true); }
});
test("upstream error content is not exposed", async () => {
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() { return new Response("secret-provider-detail", { status: 401 }); } });
  try { await call("config", { baseUrl: `http://127.0.0.1:${server.port}/v1`, model: "test" }); const result = await call("message", { messages: [{ role: "user", content: "hi" }] }); expect(result.status).toBe(502); expect(await result.text()).not.toContain("secret-provider-detail"); } finally { server.stop(true); }
});
