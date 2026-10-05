"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowUp, Check, ChevronDown, CircleHelp, FolderOpen, LoaderCircle,
  MessageSquare, Plus, Power, RefreshCw, Settings2, ShieldCheck, Square,
  Terminal, Wrench, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./agent.module.css";

type JsonObject = Record<string, unknown>;
type RequestId = string | number;
type ConnectionState = "stopped" | "starting" | "ready" | "missing" | "error";
interface HermesStatus { state: ConnectionState; workspace: string; executable?: string; error?: string }
interface SessionSummary { id: string; title?: string; preview?: string; started_at?: string | number; message_count?: number; source?: string }
interface ActiveSession { runtimeId: string; storedId?: string; title: string; model?: string }
interface HermesEvent { type: string; session_id?: string; payload?: unknown }
interface NativeRequest { id: RequestId; method: "approval" | "clarify"; params: JsonObject }
interface MessageItem { kind: "message"; id: string; role: "user" | "assistant"; text: string; state: "complete" | "streaming" | "interim" | "interrupted" | "error" | "pending" }
interface ToolItem { kind: "tool"; id: string; name: string; args: string; result: string; state: "running" | "complete" | "error" | "stopped"; duration?: number }
type TimelineItem = MessageItem | ToolItem;
interface Conversation { items: TimelineItem[]; activeMessageId: string | null; running: boolean; generatingTool: string; error: string; outcome: string }
type ConversationAction =
  | { type: "restore"; items: TimelineItem[]; running: boolean }
  | { type: "submit"; id: string; text: string }
  | { type: "submitted"; id: string }
  | { type: "submission-error"; id: string; error: string; uncertain?: boolean }
  | { type: "event"; event: HermesEvent; id: string }
  | { type: "disconnected" }
  | { type: "clear-error" };

const EMPTY: Conversation = { items: [], activeMessageId: null, running: false, generatingTool: "", error: "", outcome: "" };
const DRAFT_KEY = "cognitive-workbench:hermes-draft";
const SESSION_KEY = "cognitive-workbench:hermes-session";
const STATUS_LABELS: Record<ConnectionState, string> = { stopped: "尚未連接", starting: "正在啟動", ready: "已連接 Hermes", missing: "尚未找到 Hermes", error: "連接遇到問題" };

class AgentRequestError extends Error {
  constructor(message: string, readonly code?: string) { super(message); this.name = "AgentRequestError"; }
}

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(part => {
    if (typeof part === "string") return part;
    const item = object(part);
    return typeof item.text === "string" ? item.text : typeof item.content === "string" ? item.content : "";
  }).join("\n");
  const item = object(value);
  if (typeof item.text === "string") return item.text;
  if (typeof item.content === "string" || Array.isArray(item.content)) return plainText(item.content);
  return "";
}

function errorText(value: unknown, fallback = "操作未完成，請重試。"): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string" && value) return value;
  const data = object(value);
  return plainText(data.message) || plainText(data.error) || fallback;
}

function uniqueId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Tool details are display-only. These transformations never change RPC input.
function redactText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [已隱藏]")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[已隱藏金鑰]")
    .replace(/((?:api[_-]?key|access[_-]?token|password|secret)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[已隱藏]");
}

function detailsText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return redactText(value).slice(0, 24_000);
  try {
    return redactText(JSON.stringify(value, (key, item) => /^(?:api[_-]?key|.*[_-]token|token|password|secret|authorization|cookie)$/i.test(key) ? "[已隱藏]" : item, 2)).slice(0, 24_000);
  } catch {
    return "無法顯示這項工具資料。";
  }
}

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/hermes/${path}`, {
    cache: "no-store", signal,
    ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = object(data).code ?? object(object(data).error).code;
    throw new AgentRequestError(errorText(object(data).error, response.status === 404 ? "這個入口需要桌面版的本機 Agent 服務。" : `本機服務回傳錯誤（${response.status}）。`), typeof code === "string" ? code : undefined);
  }
  if (data === null) throw new Error("本機服務未回傳可辨認的資料。");
  return data as T;
}

async function rpc<T = JsonObject>(method: string, params: JsonObject = {}): Promise<T> {
  const response = await request<{ result?: T; error?: unknown }>("rpc", { method, params });
  if (response.error !== undefined) {
    const code = object(response.error).code;
    throw new AgentRequestError(errorText(response.error), typeof code === "string" ? code : undefined);
  }
  if (!("result" in response)) throw new Error("Agent 未確認這次操作的結果。");
  return response.result as T;
}

function normalizeStatus(value: unknown): HermesStatus | null {
  const data = object(value);
  if (typeof data.state !== "string" || !(data.state in STATUS_LABELS)) return null;
  return { state: data.state as ConnectionState, workspace: typeof data.workspace === "string" ? data.workspace : "", executable: typeof data.executable === "string" ? data.executable : undefined, error: typeof data.error === "string" ? data.error : undefined };
}

function nativeRequest(value: unknown, method?: NativeRequest["method"]): NativeRequest | null {
  const data = object(value);
  const kind = method ?? data.method;
  if ((typeof data.id !== "string" && typeof data.id !== "number") || (kind !== "approval" && kind !== "clarify")) return null;
  return { id: data.id, method: kind, params: object(data.params) };
}

function restoredItems(value: unknown): TimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index): TimelineItem[] => {
    const row = object(raw);
    if (row.display_kind === "hidden") return [];
    const id = `stored-${row.row_id ?? index}-${index}`;
    const text = plainText(row.text) || plainText(row.content);
    if (row.role === "tool") {
      const metadata = object(row.display_metadata);
      return [{ kind: "tool", id: typeof row.tool_call_id === "string" ? row.tool_call_id : id, name: plainText(row.name) || plainText(metadata.name) || "工具", args: detailsText(row.args), result: detailsText(text || row.content), state: "complete" }];
    }
    if ((row.role === "user" || row.role === "assistant") && text) {
      return [{ kind: "message", id, role: row.role, text, state: row.display_kind === "interim" ? "interim" : "complete" }];
    }
    return [];
  });
}

/** Hermes TUI gateway events: an interim seals commentary; only complete ends a turn. */
function conversationReducer(state: Conversation, action: ConversationAction): Conversation {
  if (action.type === "restore") return { ...EMPTY, items: action.items, running: action.running };
  if (action.type === "clear-error") return { ...state, error: "" };
  if (action.type === "submit") return { ...state, items: [...state.items, { kind: "message", id: action.id, role: "user", text: action.text, state: "pending" }], activeMessageId: null, running: true, generatingTool: "", error: "", outcome: "" };
  if (action.type === "submitted") return { ...state, items: state.items.map(item => item.id === action.id && item.kind === "message" ? { ...item, state: "complete" } : item) };
  if (action.type === "submission-error") return {
    ...state, running: action.uncertain ? state.running : false, generatingTool: action.uncertain ? state.generatingTool : "", error: action.error,
    items: state.items.map(item => !action.uncertain && item.id === action.id && item.kind === "message" ? { ...item, state: "error" } : item),
  };
  if (action.type === "disconnected") return {
    ...state, running: false, activeMessageId: null, generatingTool: "", outcome: state.running ? "連接已停止；已收到的內容保留在此。" : state.outcome,
    items: state.items.map(item => item.kind === "tool" && item.state === "running" ? { ...item, state: "stopped" } : item.kind === "message" && item.state === "streaming" ? { ...item, state: "interrupted" } : item),
  };

  const event = action.event;
  const payload = object(event.payload);
  const text = plainText(payload.text);
  const active = state.items.find(item => item.kind === "message" && item.id === state.activeMessageId) as MessageItem | undefined;

  if (event.type === "message.start") return { ...state, running: true, error: "", outcome: "", generatingTool: "", items: state.items.map(item => item.kind === "message" && item.role === "user" && item.state === "pending" ? { ...item, state: "complete" } : item) };
  if (event.type === "message.delta") {
    if (!text) return state;
    if (active) return { ...state, running: true, items: state.items.map(item => item.id === active.id ? { ...active, text: active.text + text, state: "streaming" } : item) };
    return { ...state, running: true, activeMessageId: action.id, items: [...state.items, { kind: "message", id: action.id, role: "assistant", text, state: "streaming" }] };
  }
  if (event.type === "message.interim") {
    // Canonical text replaces the already streamed segment; never append it twice.
    if (active) return { ...state, activeMessageId: null, items: state.items.map(item => item.id === active.id ? { ...active, text: text || active.text, state: "interim" } : item) };
    if (!text) return state;
    const last = state.items[state.items.length - 1];
    if (payload.already_streamed === true && last?.kind === "message" && last.role === "assistant" && last.text === text) return state;
    return { ...state, activeMessageId: null, items: [...state.items, { kind: "message", id: action.id, role: "assistant", text, state: "interim" }] };
  }
  if (event.type === "tool.generating") return { ...state, generatingTool: plainText(payload.name) || "工具" };
  if (event.type === "tool.start" || event.type === "tool.complete") {
    if (typeof payload.tool_id !== "string") return state;
    const existing = state.items.find(item => item.kind === "tool" && item.id === payload.tool_id) as ToolItem | undefined;
    const complete = event.type === "tool.complete";
    const result = object(payload.result);
    const tool: ToolItem = {
      kind: "tool", id: payload.tool_id, name: plainText(payload.name) || existing?.name || "工具",
      args: detailsText(payload.args ?? payload.args_text) || existing?.args || "",
      result: complete ? detailsText(payload.result_text ?? payload.result ?? payload.summary) : existing?.result || "",
      state: complete ? result.is_error === true || result.success === false || payload.is_error === true ? "error" : "complete" : "running",
      duration: typeof payload.duration_s === "number" ? payload.duration_s : existing?.duration,
    };
    return { ...state, generatingTool: "", items: existing ? state.items.map(item => item.id === tool.id ? tool : item) : [...state.items, tool] };
  }
  if (event.type === "message.complete") {
    const finishState = payload.status === "interrupted" ? "interrupted" : payload.status === "error" ? "error" : "complete";
    let items = state.items.map((item): TimelineItem => item.kind === "tool" && item.state === "running" ? { ...item, state: "stopped" } : item.kind === "message" && item.role === "user" && item.state === "pending" ? { ...item, state: "complete" } : item);
    const finalText = text || (payload.text !== undefined && typeof payload.text !== "string" ? detailsText(payload.text) : "");
    if (active) items = items.map(item => item.id === active.id ? { ...active, text: finalText || active.text, state: finishState } : item);
    else if (finalText) {
      const lastAssistant = [...items].reverse().find(item => item.kind === "message" && item.role === "assistant") as MessageItem | undefined;
      if (!(payload.response_reused === true && lastAssistant?.text === finalText)) items.push({ kind: "message", id: action.id, role: "assistant", text: finalText, state: finishState });
    }
    return { ...state, items, activeMessageId: null, running: false, generatingTool: "",
      error: payload.error || payload.failure_reason ? errorText(payload.error || payload.failure_reason) : finishState === "error" ? "Agent 這次未能完成回應。" : "",
      outcome: finishState === "interrupted" ? "本次回應已中斷。" : plainText(payload.warning),
    };
  }
  return state;
}

function shortDate(value: SessionSummary["started_at"]): string {
  if (value === undefined) return "";
  const numeric = typeof value === "number" ? value : /^\d+(\.\d+)?$/.test(value) ? Number(value) : undefined;
  const date = new Date(numeric !== undefined ? numeric < 1e12 ? numeric * 1000 : numeric : value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" }).format(date);
}

function ToolProgress({ item }: { item: ToolItem }) {
  return <details className={styles.toolProgress}>
    <summary><span className={styles.toolIcon}>{item.state === "running" ? <LoaderCircle className={styles.spinner} size={13} /> : item.state === "complete" ? <Check size={13} /> : <Wrench size={13} />}</span><span>{item.name}</span><span className={styles.toolState}>{item.state === "running" ? "執行中" : item.state === "error" ? "回傳錯誤" : item.state === "stopped" ? "未取得結果" : "已完成"}{item.duration !== undefined ? ` · ${item.duration.toFixed(1)} 秒` : ""}</span><ChevronDown size={13} className={styles.chevron} /></summary>
    <div className={styles.toolBody}>{item.args && <><p>輸入</p><pre>{item.args}</pre></>}{item.result && <><p>結果</p><pre>{item.result}</pre></>}{!item.args && !item.result && <p>尚無可顯示的工具詳情。</p>}</div>
  </details>;
}

function ClarificationCard({ request: pending, busy, onAnswer }: { request: NativeRequest; busy: boolean; onAnswer: (answers: Record<string, string>) => void }) {
  const questions = (Array.isArray(pending.params.questions) ? pending.params.questions : []).map(object).filter(question => typeof question.qid === "string" && typeof question.question === "string");
  const initialAnswers = object(pending.params.answers);
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(questions.map(question => [question.qid as string, plainText(initialAnswers[question.qid as string])])));
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  function choose(qid: string, choice: string, multiple: boolean) {
    const values = multiple ? (selected[qid] || []).includes(choice) ? selected[qid].filter(item => item !== choice) : [...(selected[qid] || []), choice] : [choice];
    setSelected(previous => ({ ...previous, [qid]: values }));
    setAnswers(previous => ({ ...previous, [qid]: values.join("、") }));
  }
  return <form className={styles.requestCard} onSubmit={event => { event.preventDefault(); onAnswer(Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]))); }}>
    <div className={styles.requestHeading}><CircleHelp size={18} /><div><h3>需要你補充一點資訊</h3><p>回答後，Agent 會繼續這次任務。</p></div></div>
    {questions.map(question => {
      const qid = question.qid as string;
      const choices = (Array.isArray(question.choices) ? question.choices : []).filter((choice): choice is string => typeof choice === "string");
      return <fieldset key={qid} disabled={busy}><legend>{question.question as string}</legend>{choices.length > 0 && <div className={styles.choices}>{choices.map(choice => <button key={choice} type="button" aria-pressed={(selected[qid] || []).includes(choice)} onClick={() => choose(qid, choice, question.multi_select === true)}>{choice}</button>)}</div>}<label className={styles.srOnly} htmlFor={`answer-${pending.id}-${qid}`}>回答：{question.question as string}</label><textarea id={`answer-${pending.id}-${qid}`} rows={2} value={answers[qid] || ""} maxLength={12000} onChange={event => setAnswers(previous => ({ ...previous, [qid]: event.target.value }))} placeholder={choices.length ? "也可以在這裡補充…" : "寫下你的回答…"} /></fieldset>;
    })}
    <div className={styles.requestActions}><button type="button" disabled={busy} onClick={() => onAnswer({})}>取消回答</button><button type="submit" className={styles.primary} disabled={busy || !Object.values(answers).some(answer => answer.trim())}>{busy ? "傳送中…" : "送出回答"}<ArrowUp size={14} /></button></div>
  </form>;
}

export default function AgentPage() {
  const [status, setStatus] = useState<HermesStatus | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [conversation, dispatch] = useReducer(conversationReducer, EMPTY);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [executable, setExecutable] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [interrupting, setInterrupting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<NativeRequest[]>([]);
  const [answering, setAnswering] = useState<RequestId | null>(null);
  const activeRef = useRef<ActiveSession | null>(null);
  const statusRef = useRef<HermesStatus | null>(null);
  const busyRef = useRef(false);
  const operationRef = useRef(false);
  const alive = useRef(true);
  const savedSessionId = useRef<string | null>(null);
  const restored = useRef(false);
  const acknowledged = useRef(new Set<RequestId>());
  const transcript = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  busyRef.current = conversation.running;

  const applyStatus = useCallback((next: HermesStatus) => {
    statusRef.current = next;
    setStatus(next);
    if (next.state !== "ready" && next.state !== "starting") {
      activeRef.current = null;
      restored.current = false;
      setActiveSession(previous => previous ? { ...previous, runtimeId: "" } : null);
      setPendingRequests([]);
      acknowledged.current.clear();
      setInterrupting(false);
      dispatch({ type: "disconnected" });
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const result = normalizeStatus(await request<unknown>("status"));
    if (!result) throw new Error("無法辨認 Agent 的連接狀態。");
    if (alive.current) { setAvailable(true); applyStatus(result); }
    return result;
  }, [applyStatus]);

  const refreshSessions = useCallback(async () => {
    if (statusRef.current?.state !== "ready") return;
    setSessionsLoading(true);
    try {
      const result = await rpc<{ sessions?: unknown }>("session.list");
      if (alive.current && Array.isArray(result.sessions)) setSessions(result.sessions.filter((session): session is SessionSummary => typeof object(session).id === "string"));
    } catch (issue) {
      if (alive.current) setError(`暫時無法讀取對話列表：${errorText(issue)}`);
    } finally { if (alive.current) setSessionsLoading(false); }
  }, []);

  function rememberSession(id?: string) {
    savedSessionId.current = id ?? null;
    try { if (id) localStorage.setItem(SESSION_KEY, id); else localStorage.removeItem(SESSION_KEY); } catch { /* Session records remain owned by Hermes. */ }
  }

  const applySession = useCallback((result: JsonObject, fallback?: SessionSummary): ActiveSession => {
    if (typeof result.session_id !== "string" || !result.session_id) throw new Error("Agent 沒有回傳有效的對話識別碼。");
    const info = object(result.info);
    const storedId = typeof result.stored_session_id === "string" ? result.stored_session_id : fallback?.id;
    const current: ActiveSession = { runtimeId: result.session_id, storedId, title: fallback?.title || plainText(info.title) || "新的對話", model: plainText(info.model) || undefined };
    activeRef.current = current;
    setActiveSession(current);
    rememberSession(storedId);
    const running = typeof result.running === "boolean" ? result.running : object(result.inflight).streaming === true;
    dispatch({ type: "restore", items: restoredItems(result.messages), running });
    busyRef.current = running;
    const requests = (Array.isArray(result.open_requests) ? result.open_requests : []).map(value => nativeRequest(value)).filter((value): value is NativeRequest => value !== null);
    setPendingRequests(requests);
    followOutput.current = true;
    return current;
  }, []);

  const resumeSession = useCallback(async (session: SessionSummary) => {
    if (operationRef.current || busyRef.current || statusRef.current?.state !== "ready") return;
    operationRef.current = true; setSessionBusy(true); setError(""); setNotice(""); setInterrupting(false);
    try {
      const result = await rpc<JsonObject>("session.resume", { session_id: session.id });
      if (alive.current) applySession(result, session);
    } catch (issue) { if (alive.current) setError(`無法開啟這段對話：${errorText(issue)}`); }
    finally { operationRef.current = false; if (alive.current) setSessionBusy(false); }
  }, [applySession]);

  useEffect(() => {
    alive.current = true;
    try { setDraft(sessionStorage.getItem(DRAFT_KEY) || ""); savedSessionId.current = localStorage.getItem(SESSION_KEY); } catch { /* A storage restriction does not disable the agent. */ }
    setHydrated(true);
    void refreshStatus().catch(issue => { if (alive.current) { setAvailable(false); setError(errorText(issue)); } });
    void request<{ executable?: string }>("settings").then(result => { if (alive.current && typeof result.executable === "string") setExecutable(result.executable); }).catch(() => {});
    return () => { alive.current = false; };
  }, [refreshStatus]);

  useEffect(() => {
    if (hydrated) try { sessionStorage.setItem(DRAFT_KEY, draft); } catch { /* Draft stays in the current page. */ }
  }, [draft, hydrated]);

  useEffect(() => {
    if (status?.state !== "ready") return;
    void refreshSessions();
    if (!activeRef.current?.runtimeId && savedSessionId.current && !restored.current) {
      restored.current = true;
      void resumeSession({ id: savedSessionId.current });
    }
  }, [status?.state, refreshSessions, resumeSession]);

  useEffect(() => {
    if (available !== true) return;
    const events = new EventSource("/api/hermes/events");
    let hadConnection = false;
    events.onopen = () => {
      setStreamConnected(true);
      setStreamError("");
      if (hadConnection) setNotice("即時連接已恢復。如有缺少的內容，可在回應結束後同步這段對話。");
      hadConnection = true;
    };
    events.onerror = () => { setStreamConnected(false); setStreamError("即時連接暫時中斷，正在重新連接…"); };
    events.addEventListener("status", event => {
      try { const data = JSON.parse((event as MessageEvent).data); const next = normalizeStatus(data) || normalizeStatus(object(data).status); if (next) applyStatus(next); } catch { /* A malformed status must never claim the agent is ready. */ }
    });
    events.addEventListener("hermes", event => {
      try {
        const raw = JSON.parse((event as MessageEvent).data) as HermesEvent;
        if (raw.type === "request.cancel") {
          const id = object(raw.payload).id;
          setPendingRequests(current => current.filter(request => request.id !== id));
          return;
        }
        if (!raw.session_id || raw.session_id !== activeRef.current?.runtimeId) return;
        dispatch({ type: "event", event: raw, id: uniqueId() });
        if (raw.type === "message.complete") { busyRef.current = false; setInterrupting(false); setPendingRequests([]); void refreshSessions(); }
      } catch { setError("有一則 Agent 事件無法顯示。請同步對話以確認完整內容。"); }
    });
    const onNativeRequest = (event: Event, method: NativeRequest["method"]) => {
      try {
        const pending = nativeRequest(JSON.parse((event as MessageEvent).data), method);
        if (!pending) return;
        if (typeof pending.params.session_id === "string" && pending.params.session_id !== activeRef.current?.runtimeId) return;
        setPendingRequests(current => current.some(request => request.id === pending.id) ? current : [...current, pending]);
        followOutput.current = true;
      } catch { setError("無法顯示 Agent 的確認請求；這項操作尚未獲得你的同意。"); }
    };
    events.addEventListener("approval", event => onNativeRequest(event, "approval"));
    events.addEventListener("clarification", event => onNativeRequest(event, "clarify"));
    return () => { events.close(); setStreamConnected(false); };
  }, [available, applyStatus, refreshSessions]);

  useEffect(() => {
    if (!transcript.current) return;
    if (!conversation.items.length && !pendingRequests.length) {
      transcript.current.scrollTop = 0;
      return;
    }
    if (followOutput.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [conversation.items, conversation.generatingTool, pendingRequests, sessionBusy]);

  // Hermes starts the native approval wait after the client confirms that its
  // card is visible. This acknowledges receipt only; it never grants permission.
  useEffect(() => {
    for (const pending of pendingRequests) {
      if (pending.method !== "approval" || acknowledged.current.has(pending.id)) continue;
      const { session_id, request_id } = pending.params;
      if (typeof session_id !== "string" || typeof request_id !== "string") continue;
      acknowledged.current.add(pending.id);
      void rpc("approval.received", { session_id, request_id }).catch(issue => {
        if (alive.current) setError(`確認卡已顯示，但未能回報收件狀態：${errorText(issue)}`);
      });
    }
  }, [pendingRequests]);

  async function connect() {
    if (connectionBusy) return;
    setConnectionBusy(true); setError(""); setNotice("");
    try {
      const result = normalizeStatus(await request<unknown>("start", {}));
      if (result) applyStatus(result); else await refreshStatus();
    } catch (issue) {
      setError(errorText(issue));
      await refreshStatus().catch(() => {});
    } finally { setConnectionBusy(false); }
  }

  async function disconnect() {
    if (connectionBusy) return;
    setConnectionBusy(true); setError("");
    try {
      const result = normalizeStatus(await request<unknown>("stop", {}));
      if (result) applyStatus(result); else await refreshStatus();
      setNotice("Agent 連接已停止。");
    } catch (issue) { setError(errorText(issue)); }
    finally { setConnectionBusy(false); }
  }

  async function createSession(): Promise<ActiveSession> {
    const result = await rpc<JsonObject>("session.create", { cwd: statusRef.current?.workspace || undefined, cwd_explicit: true, source: "cognitive-workbench", idempotency_key: uniqueId() });
    const current = applySession(result);
    void refreshSessions();
    return current;
  }

  async function newConversation() {
    if (operationRef.current || busyRef.current || status?.state !== "ready") return;
    operationRef.current = true; setSessionBusy(true); setError(""); setNotice("");
    try { await createSession(); setDraft(""); input.current?.focus(); }
    catch (issue) { setError(`無法建立對話：${errorText(issue)}`); }
    finally { operationRef.current = false; setSessionBusy(false); }
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busyRef.current || operationRef.current || status?.state !== "ready" || !streamConnected) return;
    operationRef.current = true; setSessionBusy(true); setError(""); setNotice(""); dispatch({ type: "clear-error" });
    let messageId: string | null = null;
    try {
      const current = activeRef.current?.runtimeId ? activeRef.current : await createSession();
      messageId = uniqueId();
      busyRef.current = true;
      dispatch({ type: "submit", id: messageId, text });
      setDraft(""); followOutput.current = true;
      await rpc("prompt.submit", { session_id: current.runtimeId, text });
      dispatch({ type: "submitted", id: messageId });
    } catch (issue) {
      const uncertain = issue instanceof AgentRequestError && issue.code === "REQUEST_TIMEOUT";
      if (messageId) {
        dispatch({ type: "submission-error", id: messageId, uncertain, error: uncertain ? "Agent 的收件確認逾時，這次任務可能仍在處理。可以繼續等候，或按中斷；暫時不要重送。" : `未能確認訊息是否送達：${errorText(issue)}。請先同步對話再決定是否重送。` });
        if (!uncertain) setDraft(previous => previous || text);
      } else setError(errorText(issue));
      if (!uncertain) busyRef.current = false;
    } finally { operationRef.current = false; setSessionBusy(false); }
  }

  async function interrupt() {
    if (!activeRef.current?.runtimeId || interrupting) return;
    setInterrupting(true); setError("");
    try { await rpc("session.interrupt", { session_id: activeRef.current.runtimeId }); }
    catch (issue) { setError(`未能中斷：${errorText(issue)}`); setInterrupting(false); }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setSavingSettings(true); setError(""); setNotice("");
    try {
      await request("settings", { executable: executable.trim() });
      await refreshStatus();
      setNotice("連接設定已保存。"); setSettingsOpen(false);
    } catch (issue) { setError(errorText(issue)); }
    finally { setSavingSettings(false); }
  }

  async function answerRequest(pending: NativeRequest, value: "once" | "deny" | Record<string, string>) {
    if (answering !== null) return;
    setAnswering(pending.id); setError("");
    try {
      if (pending.method === "approval") await request("approval", { id: pending.id, choice: value });
      else await request("clarification", { id: pending.id, answers: value });
      setPendingRequests(current => current.filter(item => item.id !== pending.id));
    } catch (issue) { setError(`未能送出你的決定：${errorText(issue)}`); }
    finally { setAnswering(null); }
  }

  const ready = status?.state === "ready";
  const currentTitle = sessions.find(session => session.id === activeSession?.storedId)?.title || activeSession?.title || "新的對話";
  const anyBusy = conversation.running || sessionBusy || connectionBusy;
  const canSend = ready && streamConnected && !anyBusy && !!draft.trim();
  const statusLabel = status ? STATUS_LABELS[status.state] : available === false ? "本機服務未連接" : "正在確認連接…";
  const toolCount = conversation.items.filter(item => item.kind === "tool").length;
  const hasRequests = pendingRequests.length > 0;

  return <div className={styles.page} lang="zh-Hant">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>認知工作台 <span>/</span> 連接與診斷</p><h1>資訊處理層</h1><p className={styles.headingNote}>此頁供連接與測試；Telegram 等外部輸入路由尚未接通工作台資料。</p></div>
      <button className={styles.subtleButton} onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen} aria-controls="agent-settings"><Settings2 size={15} />連接設定</button>
    </header>

    {settingsOpen && <form id="agent-settings" className={styles.settings} onSubmit={saveSettings}>
      <div><h2>連接 Hermes 處理層</h2><p>使用已安裝的 Hermes 與其中的模型設定。</p></div>
      <label htmlFor="hermes-executable">Hermes 執行檔<input id="hermes-executable" value={executable} onChange={event => setExecutable(event.target.value)} placeholder="hermes，或完整的執行檔路徑" autoComplete="off" spellCheck={false} disabled={ready || status?.state === "starting" || savingSettings} /></label>
      <p className={styles.settingsHint}>{ready || status?.state === "starting" ? "先停止連接，即可修改執行檔位置。" : "若電腦還沒有 Hermes，請先完成安裝與模型設定，再回到這裡連接。"}</p>
      <div className={styles.settingsActions}><button type="button" onClick={() => setSettingsOpen(false)}>收起</button><button type="submit" className={styles.primary} disabled={available !== true || ready || status?.state === "starting" || savingSettings}>{savingSettings ? "保存中…" : "保存設定"}</button></div>
    </form>}

    <div className={styles.workbench}>
      <aside className={styles.sidebar} aria-label="對話列表">
        <div className={styles.sidebarHeading}><span>Hermes 對話</span><button className={styles.iconButton} aria-label="更新對話列表" title="更新對話列表" onClick={() => void refreshSessions()} disabled={!ready || sessionsLoading}><RefreshCw size={14} className={sessionsLoading ? styles.spinner : undefined} /></button></div>
        <button className={styles.newConversation} onClick={() => void newConversation()} disabled={!ready || anyBusy}><Plus size={16} />新對話</button>
        <div className={styles.sessionList} aria-busy={sessionsLoading}>
          {sessions.map(session => <button key={session.id} className={styles.session} aria-current={session.id === activeSession?.storedId ? "true" : undefined} disabled={!ready || conversation.running || sessionBusy} onClick={() => void resumeSession(session)}><span className={styles.sessionTitle}><MessageSquare size={13} /><span>{session.title || session.preview || "未命名對話"}</span></span><span className={styles.sessionMeta}><time>{shortDate(session.started_at)}</time>{typeof session.message_count === "number" && <span>{session.message_count} 則</span>}</span></button>)}
          {!sessions.length && <p className={styles.emptySessions}>{!ready ? "連接後，可檢視 Hermes 中的對話。" : sessionsLoading ? "正在讀取對話…" : "還沒有對話。\n可從右側傳送一則測試訊息。"}</p>}
        </div>
        <div className={styles.connectionPanel}>
          <p className={styles.connectionStatus} role="status"><span className={`${styles.statusDot} ${ready ? styles.ready : status?.state === "error" || status?.state === "missing" ? styles.problem : ""}`} />{statusLabel}</p>
          {status?.workspace && <details className={styles.workspace}><summary><FolderOpen size={12} />工作目錄<ChevronDown size={12} /></summary><p>{status.workspace}</p><span>新對話從這個目錄開始。</span></details>}
          {ready || status?.state === "starting" ? <button className={styles.connectButton} onClick={() => void disconnect()} disabled={connectionBusy}><Power size={14} />{connectionBusy ? "處理中…" : "停止連接"}</button> : <button className={`${styles.connectButton} ${styles.primary}`} onClick={() => available === false ? void refreshStatus().catch(issue => setError(errorText(issue))) : void connect()} disabled={connectionBusy || available === null}><Power size={14} />{connectionBusy ? "正在連接…" : available === false ? "重新檢查服務" : "開始連接"}</button>}
          <p className={styles.connectionNote}>對話由你的 Hermes 保存</p>
        </div>
      </aside>

      <section className={styles.chat} aria-label="資訊處理層連接測試">
        <div className={styles.chatHeading}><div><p>{sessionBusy && !conversation.running ? "正在開啟對話…" : currentTitle}</p><span>{conversation.running ? hasRequests ? "等待你的決定" : "正在處理" : ready ? "可以開始" : "等待連接"}{activeSession?.model ? ` · ${activeSession.model}` : ""}</span></div>{activeSession?.storedId && <button className={styles.iconButton} aria-label="同步這段對話" title="同步這段對話" disabled={!ready || anyBusy} onClick={() => void resumeSession({ id: activeSession.storedId!, title: currentTitle })}><RefreshCw size={15} /></button>}</div>

        <div ref={transcript} className={styles.transcript} onScroll={() => { if (transcript.current) followOutput.current = transcript.current.scrollHeight - transcript.current.scrollTop - transcript.current.clientHeight < 100; }}>
          {(status?.state === "missing" || status?.state === "error" || available === false) && <div className={styles.connectionIssue} role="alert"><Terminal size={21} /><div><h2>{status?.state === "missing" ? "先把 Hermes 連接好" : available === false ? "目前沒有本機 Agent 服務" : "Hermes 未能啟動"}</h2><p>{status?.state === "missing" ? "這台電腦尚未找到可用的 Hermes。完成安裝與模型設定後，指定執行檔位置，再開始連接。" : available === false ? "請從桌面版開啟這個工作台，或先啟動桌面版的本機服務。你的草稿會留在這裡。" : status?.error || "請檢查 Hermes 的安裝與模型設定，再重新連接。"}</p>{status?.state === "missing" && status.error && <details><summary>查看原因</summary><pre>{redactText(status.error)}</pre></details>}<button className={styles.textButton} onClick={() => setSettingsOpen(true)}>查看連接設定</button></div></div>}

          {(error || conversation.error) && <div className={styles.error} role="alert"><span>{error || conversation.error}</span><button className={styles.iconButton} aria-label="收起錯誤訊息" onClick={() => { setError(""); dispatch({ type: "clear-error" }); }}><X size={14} /></button></div>}
          {streamError && ready && <p className={styles.notice} role="status">{streamError}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}

          {!conversation.items.length && !sessionBusy && <div className={styles.empty}>
            <span className={styles.emptyMark} aria-hidden="true"><span /></span>
            <p className={styles.emptyEyebrow}>驗證處理層連接</p>
            <h2>確認 Hermes 可以正常回應。</h2>
            <p>可在此傳送測試指令，<br />查看回覆、工具進度與確認請求。</p>
            <div className={styles.suggestions}>{["請用一句話確認你已收到這則測試訊息。", "查看目前工作目錄，列出可見的檔案。", "請說明你能如何處理一份文字筆記，先不要修改檔案。"].map(suggestion => <button key={suggestion} onClick={() => { setDraft(suggestion); input.current?.focus(); }}>{suggestion}<span aria-hidden="true">↗</span></button>)}</div>
          </div>}

          <div className={styles.messages} aria-label="對話內容" aria-busy={conversation.running}>
            {conversation.items.map(item => item.kind === "tool" ? <ToolProgress key={item.id} item={item} /> : <article key={item.id} className={item.role === "user" ? styles.userMessage : styles.assistantMessage}><div className={styles.messageHeading}><span>{item.role === "user" ? "你" : "Hermes"}</span>{item.state === "interim" && <span>進度</span>}{item.role === "user" && item.state === "error" && <span>未確認送達</span>}{item.state === "interrupted" && <span>已中斷</span>}</div><div className={styles.messageContent}>{item.role === "user" ? <p>{item.text}</p> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{item.text}</ReactMarkdown>}{item.state === "streaming" && <span className={styles.cursor} aria-label="正在回覆" />}</div></article>)}
          </div>

          {conversation.running && !hasRequests && <p className={styles.working} role="status"><LoaderCircle size={13} className={styles.spinner} />{interrupting ? "正在中斷…" : conversation.generatingTool ? `正在準備 ${conversation.generatingTool}…` : "Agent 正在處理…"}{toolCount > 0 && <span>已調用 {toolCount} 次工具</span>}</p>}
          {conversation.outcome && <p className={styles.notice} role="status">{conversation.outcome}</p>}

          {pendingRequests.map(pending => pending.method === "clarify" ? <ClarificationCard key={pending.id} request={pending} busy={answering !== null} onAnswer={answers => void answerRequest(pending, answers)} /> : <div key={pending.id} className={styles.requestCard}>
            <div className={styles.requestHeading}><ShieldCheck size={18} /><div><h3>這一步，需要你的同意</h3><p>{plainText(pending.params.tool_name) || "Hermes"} 提出的操作確認</p></div></div>
            {plainText(pending.params.description) && <p className={styles.requestDescription}>{redactText(plainText(pending.params.description))}</p>}
            {plainText(pending.params.command) && <pre className={styles.command}>{redactText(plainText(pending.params.command))}</pre>}
            <div className={styles.requestActions}><button disabled={answering !== null} onClick={() => void answerRequest(pending, "deny")}><X size={14} />拒絕</button>{Array.isArray(pending.params.choices) && pending.params.choices.includes("once") && <button className={styles.primary} disabled={answering !== null} onClick={() => void answerRequest(pending, "once")}><Check size={14} />{answering === pending.id ? "正在回覆…" : "僅允許這一次"}</button>}</div>
          </div>)}
        </div>

        <div className={styles.composerArea}>
          <form className={styles.composer} onSubmit={send}>
            <label className={styles.srOnly} htmlFor="agent-input">輸入傳送到資訊處理層的測試指令</label>
            <textarea ref={input} id="agent-input" rows={2} maxLength={32000} value={draft} placeholder={conversation.running ? "可以先寫下下一則測試…" : "輸入測試訊息，確認連接與工具是否正常…"} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && ready) { event.preventDefault(); if (canSend) void send(); } }} />
            {conversation.running ? <button type="button" className={styles.interruptButton} onClick={() => void interrupt()} disabled={interrupting || !ready} aria-label={interrupting ? "正在中斷" : "中斷本次回應"} title="中斷本次回應"><Square size={15} fill="currentColor" /></button> : <button type="submit" className={styles.sendButton} disabled={!canSend} aria-label="傳送給 Agent"><ArrowUp size={18} /></button>}
          </form>
          <div className={styles.composerFooter}><span>{conversation.running ? "可隨時中斷本次回應" : ready ? "Enter 傳送 · Shift + Enter 換行" : "可以先寫下來，連接後再傳送"}</span><span>{ready ? "Hermes · 連接測試" : "草稿暫存在此分頁"}</span></div>
        </div>
      </section>
    </div>
  </div>;
}
