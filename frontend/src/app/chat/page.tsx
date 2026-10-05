"use client";
// HERO: A quiet input space for thoughts, intentions, and the present state.
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Settings2, Plus, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./chat.module.css";
type Message = { role: "user" | "assistant"; content: string };
type Config = { baseUrl: string; model: string; hasApiKey: boolean };
async function request(path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/web-chat/${path}`, { cache: "no-store", signal, ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "操作未完成，請重試。");
  return data;
}
export default function ChatPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configStatus, setConfigStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [form, setForm] = useState({ baseUrl: "https://api.openai.com/v1", model: "", apiKey: "", clearApiKey: false });
  const [settings, setSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    request("config").then(c => { if (active) { setConfig(c); setForm(f => ({ ...f, baseUrl: c.baseUrl, model: c.model })); setConfigStatus("ready"); } }).catch(e => { if (active) { setConfigStatus("unavailable"); setError(e.message); } });
    try { const saved = JSON.parse(sessionStorage.getItem("lifeos-web-chat") || "{}"); if (Array.isArray(saved.messages) && saved.messages.length <= 60 && saved.messages.every((m: Message) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")) setMessages(saved.messages); if (typeof saved.draft === "string") setDraft(saved.draft); } catch {}
    setLoaded(true);
    return () => { active = false; controller.current?.abort(); };
  }, []);
  useEffect(() => { if (loaded) try { sessionStorage.setItem("lifeos-web-chat", JSON.stringify({ messages, draft })); } catch { setNotice("此瀏覽器無法暫存對話。"); } }, [messages, draft, loaded]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "auto", block: "end" }); }, [messages, busy]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { const c = await request("config", form); setConfig(c); setConfigStatus("ready"); setForm({ baseUrl: c.baseUrl, model: c.model, apiKey: "", clearApiKey: false }); setSettings(false); setNotice("模型設定已保存。"); }
    catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function send(e?: React.FormEvent) {
    e?.preventDefault(); if (busy || saving || !draft.trim() || !config?.model) return;
    const content = draft.trim();
    const next: Message[] = [...messages, { role: "user", content }];
    setError(""); setNotice(""); setBusy(true); setDraft(""); setMessages(next);
    const abort = new AbortController(); controller.current = abort;
    try { const data = await request("message", { messages: next }, abort.signal); setMessages([...next, { role: "assistant", content: data.reply }]); }
    catch (e) { setMessages(messages); setDraft(content); setError(abort.signal.aborted ? "已停止等待，輸入已保留。" : (e as Error).message); }
    finally { setBusy(false); controller.current = null; }
  }
  const canConnect = configStatus === "ready" && !!config?.model;
  const modelStatus = configStatus === "loading" ? "正在讀取模型設定…" : configStatus === "unavailable" ? "無法確認模型設定" : config?.model ? `已設定模型 · ${config.model}` : "尚未連接對話模型";
  return <div className={styles.page}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>認知工作台 · 輸入口</p><h1>從此刻的一個念頭開始。</h1><p className={styles.subtitle}>寫下想法、意圖，或當下的狀態，慢慢看清你想去的方向。</p></div><div className={styles.tools}><button disabled={busy || !messages.length} onClick={() => { if (window.confirm("清空此分頁的對話？")) { setMessages([]); setError(""); } }}><Plus size={16} />新對話</button><button aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={16} />模型設定</button></div></header>
    <div className={styles.model} role="status"><span className={canConnect ? styles.dot : styles.unset} aria-hidden="true" />{modelStatus}<span>{canConnect ? "傳送時才連接所設定的服務" : "可以先寫下來；文字只暫存於此分頁"}</span></div>
    {settings && <form className={styles.settings} onSubmit={save}><div><h2>選擇你的模型</h2><p>可連接雲端服務，或本機的 OpenAI 相容模型。</p></div><label>服務位址<input type="url" required value={form.baseUrl} placeholder="https://api.openai.com/v1" onChange={e => setForm({ ...form, baseUrl: e.target.value })} /></label><label>模型名稱<input required maxLength={200} value={form.model} placeholder="填入服務提供的模型 ID" onChange={e => setForm({ ...form, model: e.target.value })} /></label><label>API 金鑰<input type="password" autoComplete="new-password" value={form.apiKey} placeholder={config?.hasApiKey ? "已保存；留空保留現有金鑰" : "本機服務可留空"} onChange={e => setForm({ ...form, apiKey: e.target.value })} /></label><label className={styles.check}><input type="checkbox" checked={form.clearApiKey} onChange={e => setForm({ ...form, clearApiKey: e.target.checked })} />清除已保存的金鑰</label><p className={styles.hint}>金鑰保存在本機，不回傳瀏覽器。更換服務位址時，請重新填入金鑰。</p><button className={styles.primary} disabled={saving || busy || !config}>{saving ? "正在保存…" : "保存設定"}</button></form>}
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    <section className={styles.conversation} aria-label="對話內容" aria-live="polite">
      {!messages.length && <div className={styles.empty}><MessageCircle size={30} strokeWidth={1} /><h2>此刻，有什麼在你心上？</h2><p>一個想法、一個想做的方向，或身心的感受。</p><div className={styles.prompts}>{["我有一個想法，想一起整理", "幫我釐清今天最重要的意圖", "我想說說此刻的身心狀態"].map(p => <button key={p} onClick={() => setDraft(p)}>{p}</button>)}</div></div>}
      {messages.map((m, i) => <article key={i} className={m.role === "user" ? styles.user : styles.assistant}><p className={styles.role}>{m.role === "user" ? "你" : "工作台助理"}</p><div className={styles.content}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div></article>)}
      {busy && <p className={styles.waiting}>正在思考… <button onClick={() => controller.current?.abort()}>停止等待</button></p>}<div ref={end} />
    </section>
    <form className={styles.composer} onSubmit={send}><label className={styles.sr} htmlFor="chat-input">輸入想法、意圖或當下狀態</label><textarea id="chat-input" maxLength={12000} rows={3} value={draft} disabled={busy} placeholder="寫下想法、意圖，或此刻的狀態…" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (canConnect && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} /><button type="submit" aria-label="傳送訊息" disabled={busy || saving || !draft.trim() || !canConnect}><ArrowUp size={20} /></button></form>
    <footer className={styles.footer}>{canConnect ? "Enter 傳送 · Shift + Enter 換行" : "Enter 換行 · 連接模型後可傳送"}<span>草稿與對話只暫存於此分頁，關閉後可能遺失。傳送時交由所設定的服務處理；回覆僅提供建議。</span></footer>
  </div>;
}
