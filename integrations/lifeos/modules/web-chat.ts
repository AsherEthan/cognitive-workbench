import { readFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteJSON } from "../lib/atomic-write";

type Config = { baseUrl: string; model: string; apiKey: string };
const defaults: Config = { baseUrl: "https://api.openai.com/v1", model: "", apiKey: "" };
const system = "你是個人認知工作台的對話助理。使用繁體中文。協助釐清意圖、能量、能力、注意力及可用支持。未提供的個人資料視為未知，提供建議讓本人決定。你只能對話，不能聲稱已修改工作台、保存筆記或執行任何操作。";
function configPath() {
  const root = process.env.WEB_CHAT_USER_DIR || (process.env.LIFEOS_DIR ? join(process.env.LIFEOS_DIR, "USER") : join(process.env.LIFEOS_CONFIG_DIR || join(process.env.HOME!, ".config/LIFEOS"), "USER"));
  return join(root, "CONFIG", "web-chat.json");
}
function load(): Config {
  try { return { ...defaults, ...JSON.parse(readFileSync(configPath(), "utf8")) }; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return { ...defaults }; throw e; }
}
function publicConfig(c: Config) { return { baseUrl: c.baseUrl, model: c.model, hasApiKey: !!c.apiKey }; }
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
function baseUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("請填寫服務位址。");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("服務位址格式不正確。"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash) throw new Error("雲端服務請使用 HTTPS；本機服務可使用 HTTP。位址不能含帳密、查詢或片段。");
  return url.toString().replace(/\/$/, "");
}
async function body(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw new Error("請使用 JSON。");
  if (Number(req.headers.get("content-length")) > 100_000) throw new Error("輸入過長。");
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 100_000) throw new Error("輸入過長。");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("輸入格式不正確。");
  return value;
}
export async function handleWebChatRequest(req: Request, pathname: string): Promise<Response> {
  const origin = req.headers.get("origin");
  if ((origin && origin !== new URL(req.url).origin) || req.headers.get("sec-fetch-site") === "cross-site" || (req.method !== "GET" && !origin)) return json({ error: "僅允許從本機工作台操作。" }, 403);
  if (!["/api/web-chat/config", "/api/web-chat/message"].includes(pathname)) return json({ error: "找不到此功能。" }, 404);
  if (pathname.endsWith("config") && req.method === "GET") {
    try { return json(publicConfig(load())); } catch { return json({ error: "無法讀取模型設定。" }, 500); }
  }
  if (req.method !== "POST") return json({ error: "不支援此操作。" }, 405);
  let input: any;
  try { input = await body(req); } catch (e) { return json({ error: e instanceof SyntaxError ? "輸入格式不正確。" : (e as Error).message }, 400); }
  let config: Config;
  try { config = load(); } catch { return json({ error: "無法讀取模型設定。" }, 500); }
  if (pathname.endsWith("config")) {
    try {
      const endpoint = baseUrl(input.baseUrl);
      if (typeof input.model !== "string" || !input.model.trim() || input.model.length > 200) throw new Error("請填寫模型名稱。");
      if (input.apiKey !== undefined && (typeof input.apiKey !== "string" || input.apiKey.length > 4096 || /[\r\n]/.test(input.apiKey))) throw new Error("金鑰格式不正確。");
      // Changing providers must never carry a previous provider's key to a new host.
      const key = input.clearApiKey ? "" : input.apiKey?.trim() || (endpoint === config.baseUrl ? config.apiKey : "");
      config = { baseUrl: endpoint, model: input.model.trim(), apiKey: key };
    } catch (e) { return json({ error: (e as Error).message }, 400); }
    try { atomicWriteJSON(configPath(), config, 0o600); return json(publicConfig(config)); }
    catch { return json({ error: "無法保存模型設定。" }, 500); }
  }
  if (!config.model) return json({ error: "請先設定模型。" }, 400);
  let endpoint: string;
  try { endpoint = baseUrl(config.baseUrl); } catch { return json({ error: "模型服務位址不正確。" }, 400); }
  const messages = input.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 60 || messages.some(m => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 12000) || messages.at(-1).role !== "user") return json({ error: "對話過長或格式不正確，請開始新對話。" }, 400);
  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST", redirect: "error", signal: AbortSignal.any([req.signal, AbortSignal.timeout(90_000)]),
      headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
      body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))], stream: false }),
    });
    if (!response.ok) return json({ error: response.status === 401 || response.status === 403 ? "服務拒絕驗證，請檢查 API 金鑰與權限。" : `模型服務回傳 ${response.status}，請檢查位址及模型名稱。` }, 502);
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return json({ error: "模型未回傳文字，請確認此模型支援對話。" }, 502);
    return json({ reply, model: config.model });
  } catch { return json({ error: "連線中斷或逾時，請確認模型服務正在運行。" }, 502); }
}
