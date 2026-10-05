"use client";

import { moduleLabel } from "@/lib/module-labels-zh";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Workflow,
  ArrowRight,
  BookOpen,
  Braces,
  Eye,
  FileText,
  GitCommitHorizontal,
  History,
  Pencil,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  Pill,
  EmptyState,
  dimStyle,
  type Dim,
  type TabSpec,
} from "@/components/ui/chrome";
import Md from "@/components/Md";

/**
 * Algorithm tab — the complete thinking chain, visible, summarized, editable.
 *
 * RULES & FILES is the primary surface and the landing tab: every file the
 * Algorithm system comprises — system prompt, context hooks, doctrine, ISA
 * system, run-layer hooks, on-demand rules — browsable and editable in one
 * place. Each file carries an AI-generated card: what it performs, when it
 * fires, how it affects the whole system. Doctrine edits run the REAL
 * versioning workflow (new v-file, changelog, LATEST, git commit); everything
 * else saves in place (TS syntax-gated for hooks) and git-commits in the
 * file's own repo.
 *
 * HOW IT WORKS is the simple explanation: one auto-generated plain-language
 * overview (server regenerates it whenever any chain file changes — the page
 * is never stale by design), the loop visual, and the teeth.
 *
 * Holds ZERO data and ZERO write logic: everything comes from
 * /api/algorithm-tab. The whitelist of what's editable lives server-side;
 * this page can't invent a path.
 */

type Stage = "context" | "doctrine" | "isa" | "run" | "ondemand";

interface ChainFile {
  id: string;
  name: string;
  rel: string;
  role: string;
  loaded: string;
  stage: Stage;
  editable: boolean;
  kind: "markdown" | "code";
  bytes: number;
  mtime: string | null;
  summary: { markdown: string; generated_at: string; stale: boolean } | null;
}
interface AlgoData {
  generated_at: string;
  version: string;
  claims: { total: number; hook: number; check: number; self: number };
  stages: Stage[];
  chain: ChainFile[];
  versions: { version: string; mtime: string }[];
  summary: { generated_at: string; level: string; stale: boolean; markdown: string } | null;
  generating: boolean;
  errors: Record<string, string> | null;
}
interface FilePayload {
  id: string;
  content: string;
  mtime: string;
  editable: boolean;
}

type TabId = "files" | "how";
const TABS: TabSpec<TabId>[] = [
  { id: "files", label: "規則與檔案", icon: BookOpen, dim: "blue" },
  { id: "how", label: "運作方式", icon: Workflow, dim: "blue" },
];

const STAGE_META: Record<Stage, { label: string; dim: Dim; desc: string }> = {
  context: { label: "每次對話", dim: "creative", desc: "在開始回應前載入常駐背景與注入背景的事件處理。" },
  doctrine: { label: "執行流程", dim: "money", desc: "流程準則採用版本管理，並保留完整歷史。" },
  isa: { label: "理想狀態系統", dim: "freedom", desc: "記錄、同步、提交與呈現完成條件。" },
  run: { label: "執行期間", dim: "relationships", desc: "工作進行中的即時提醒與檢查機制。" },
  ondemand: { label: "按需載入", dim: "health", desc: "符合觸發條件時才載入的規則檔案。" },
};

// The loop, as it actually runs. File chips jump to that file.
const FLOW: { name: string; desc: string; dim: Dim; files: string[] }[] = [
  { name: "載入", desc: "系統提示詞、CLAUDE.md 引用，以及事件處理注入的背景與記憶。", dim: "creative", files: ["system-prompt", "claude-md", "load-context-hook", "load-memory-hook"] },
  { name: "判斷", desc: "依工作內容判斷是簡單回應或完整執行；使用者指定的深度優先。", dim: "freedom", files: ["doctrine", "nudge-hook"] },
  { name: "描述", desc: "先寫下完成條件：以理想狀態文件列出可驗證的要求、反證方式與排除事項。", dim: "money", files: ["isa-format", "isa-skill"] },
  { name: "推進", desc: "依理想狀態文件工作，按需使用技能、代理與研究，並在可判斷時提供提醒。", dim: "relationships", files: ["nudge-hook", "isasync-hook"] },
  { name: "驗證", desc: "每項要求都須有相符的工具證據；檢查機制會攔截未通過的操作。", dim: "ok", files: ["verification-gate", "verification-expanded", "checkpoint-hook"] },
  { name: "學習", desc: "留下理想狀態變更、反思與經驗，並歸檔到適當位置。", dim: "health", files: ["self-healing", "changelog"] },
  { name: "回應", desc: "先給結論；如有變更則附上變更與驗證證據，結束前再次檢查。", dim: "blue", files: ["system-prompt", "format-gate", "stop-gates"] },
];

const REFRESH_MS = 60_000;

function ago(ts: string | null | undefined): string {
  if (!ts) return "—";
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s} 秒前`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} 小時前` : `${Math.round(h / 24)} 天前`;
}
const kb = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(1)}k` : `${n}`);

export default function AlgorithmPage() {
  const [data, setData] = useState<AlgoData | null>(null);
  const [evals, setEvals] = useState<{ suite: string; passed: boolean; pass_to_k: number; cases: unknown[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("files");

  // files state
  const [selectedId, setSelectedId] = useState<string>("doctrine");
  const [file, setFile] = useState<FilePayload | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [rawView, setRawView] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // doctrine-specific state (versioned flow, lives inside the Files surface)
  const [doctrineVersion, setDoctrineVersion] = useState<string | null>(null); // null = current
  const [docBump, setDocBump] = useState<"patch" | "feature">("patch");
  const [docNote, setDocNote] = useState("");

  const [regenerating, setRegenerating] = useState(false);
  // The regenerate poll starts in a click handler, not an effect — hold its id
  // so unmount can clear it (it otherwise runs for up to 15 minutes).
  // ported from public PR #1735, @elhoim
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const load = useCallback(() => {
    fetch("/api/algorithm-tab")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const loadEvals = () => fetch("/api/evals")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEvals(d?.suites ?? []))
      .catch(() => {});
    loadEvals();
    const t = setInterval(loadEvals, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "how") setTab("how");
    else if (h) { setSelectedId(h); setTab("files"); }
  }, []);
  const switchTab = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", t === "files" ? window.location.pathname : "#how");
  };

  const isDoctrine = selectedId === "doctrine";

  // ── file loading ──
  const loadFile = useCallback((id: string, version?: string | null) => {
    setFileLoading(true);
    const qs = version ? `?id=${id}&version=${version}` : `?id=${id}`;
    return fetch(`/api/algorithm-tab/file${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .finally(() => setFileLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "files") return;
    setEditing(false);
    setSaveMsg(null);
    loadFile(selectedId, isDoctrine ? doctrineVersion : null)
      .then(setFile)
      .catch((e) => setSaveMsg(String(e?.message ?? e)));
  }, [tab, selectedId, doctrineVersion, isDoctrine, loadFile]);

  const selectedSpec = useMemo(() => data?.chain.find((c) => c.id === selectedId) ?? null, [data, selectedId]);

  const selectFile = (id: string) => {
    if (id !== "doctrine") setDoctrineVersion(null);
    setSelectedId(id);
    setTab("files");
    window.history.replaceState(null, "", `#${id}`);
  };

  // ── saves ──
  const saveInPlace = async () => {
    if (!file) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch("/api/algorithm-tab/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, content: draft, expectedMtime: file.mtime }),
      });
      const out = await r.json();
      if (!r.ok) { setSaveMsg(out.error ?? `HTTP ${r.status}`); return; }
      setSaveMsg(`已儲存 · 提交 ${out.commit?.detail ?? "無資料"}`);
      setEditing(false);
      const fresh = await loadFile(selectedId);
      setFile(fresh);
      load();
    } catch (e: any) {
      setSaveMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const saveDoctrine = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch("/api/algorithm-tab/doctrine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft, bump: docBump, note: docNote }),
      });
      const out = await r.json();
      if (!r.ok) { setSaveMsg(out.error ?? `HTTP ${r.status}`); return; }
      setSaveMsg(`v${out.previous} → v${out.version} · ${out.commit?.committed ? `提交 ${out.commit.detail}` : out.commit?.detail}`);
      setEditing(false);
      setDocNote("");
      setDoctrineVersion(null);
      const fresh = await loadFile("doctrine");
      setFile(fresh);
      load();
    } catch (e: any) {
      setSaveMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const r = await fetch("/api/algorithm-tab/summary/regenerate", { method: "POST" });
      if (!r.ok && r.status !== 202) {
        const out = await r.json().catch(() => ({}));
        setError(out.error ?? `重新產生失敗：HTTP ${r.status}`);
        setRegenerating(false);
        return;
      }
      const startedAt = Date.now();
      const poll = setInterval(async () => {
        try {
          const d = await fetch("/api/algorithm-tab").then((x) => x.json());
          setData(d);
          if (!d.generating || Date.now() - startedAt > 15 * 60_000) {
            clearInterval(poll);
            pollRef.current = null;
            setRegenerating(false);
          }
        } catch { /* keep polling */ }
      }, 5000);
      pollRef.current = poll;
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setRegenerating(false);
    }
  };

  const editorClass =
    "w-full h-[65vh] bg-surface-1 border border-line-2 rounded-lg p-4 text-[13px] leading-relaxed text-ink-1 mono resize-y focus:outline-none focus:border-line-3";

  const nextPatch = data?.version.replace(/\.(\d+)$/, (_, p) => `.${Number(p) + 1}`);
  const nextFeature = data?.version.replace(/^(\d+)\.(\d+)\..*$/, (_, a, f) => `${a}.${Number(f) + 1}.0`);

  return (
    <PageShell className="max-w-[1400px]">
      <PageHeader
        icon={Workflow}
        title={
          <span className="flex items-center gap-3">
            執行流程
            {data && <Pill dim="money">v{data.version}</Pill>}
            {data?.generating && (
              <span className="flex items-center gap-1.5 text-[11px] text-ink-3 normal-case tracking-normal">
                <RefreshCw className="w-3 h-3 animate-spin" /> 正在更新說明…
              </span>
            )}
          </span>
        }
        subtitle="閱讀、理解與編輯系統使用的規則、事件處理及準則檔案；檔案變更後會重新產生說明。"
      />

      <TabBar
        tabs={TABS}
        active={tab}
        onChange={switchTab}
        right={
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <span
              className={error ? "inline-block w-1.5 h-1.5 rounded-full" : "inline-block w-1.5 h-1.5 rounded-full animate-pulse"}
              style={{ background: error ? "var(--err)" : "var(--ok)" }}
            />
            <span className="whitespace-nowrap">{error ? "離線" : data ? `更新於 ${ago(data.generated_at)}` : "載入中…"}</span>
          </div>
        }
      />

      {error && <div className="text-warn text-sm">無法連線至執行流程 API： {error}</div>}
      {!data && !error && <div className="text-ink-3 text-sm">載入中…</div>}

      {/* ════ RULES & FILES — the primary surface ════ */}
      {data && tab === "files" && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* ── the chain, grouped ── */}
          <div className="flex flex-col gap-3">
            {data.stages.map((stage) => {
              const files = data.chain.filter((c) => c.stage === stage);
              if (!files.length) return null;
              const meta = STAGE_META[stage];
              return (
                <div key={stage}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <Pill dim={meta.dim} className="text-[10px] uppercase tracking-wider">{meta.label}</Pill>
                  </div>
                  <Panel className="p-1.5 flex flex-col gap-0.5">
                    {files.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => selectFile(f.id)}
                        className={`flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors ${selectedId === f.id ? "bg-surface-3 text-ink-1" : "text-ink-2 hover:bg-surface-3"}`}
                        title={f.rel}
                      >
                        {f.kind === "code" ? <Braces className="w-3.5 h-3.5 shrink-0 text-ink-3" /> : <FileText className="w-3.5 h-3.5 shrink-0 text-ink-3" />}
                        <span className="flex-1 truncate">{moduleLabel(f.name)}</span>
                        <span className="tabular-nums text-[10px] text-ink-3">{kb(f.bytes)}B</span>
                      </button>
                    ))}
                  </Panel>
                </div>
              );
            })}
            <p className="text-[11px] text-ink-3 px-1 leading-snug">
              所有檔案皆可編輯。Markdown 儲存後會更新時間並提交至所屬儲存庫；事件處理程式通過語法檢查後才會寫入；準則編輯一律建立新版本。
            </p>
          </div>

          {/* ── viewer / editor ── */}
          <div className="flex flex-col gap-3 min-w-0">
            {selectedSpec && (
              <>
                {/* per-file understanding card */}
                <Panel>
                  <PanelHeader
                    icon={Sparkles}
                    title={`${moduleLabel(selectedSpec.name)} — 用途說明`}
                    meta={selectedSpec.summary ? `產生於 ${ago(selectedSpec.summary.generated_at)}` : undefined}
                    actions={selectedSpec.summary?.stale ? <Pill dim="warn" title="此說明產生後檔案已有變更，將於下一次更新時重新產生">更新中</Pill> : undefined}
                  />
                  <div className="text-[12px] text-ink-3 mb-2 leading-snug">
                    {moduleLabel(selectedSpec.role)} <span className="text-ink-2">載入方式： {moduleLabel(selectedSpec.loaded)}。</span>
                  </div>
                  {selectedSpec.summary ? (
                    <div className="text-[13px] leading-relaxed text-ink-1"><Md content={selectedSpec.summary.markdown} /></div>
                  ) : (
                    <div className="text-[12px] text-ink-3 flex items-center gap-2">
                      <RefreshCw className={`w-3 h-3 ${data.generating ? "animate-spin" : ""}`} />
                      {data.generating ? "正在撰寫檔案摘要…" : "摘要尚未產生，將於下一次更新時顯示"}
                    </div>
                  )}
                </Panel>

                {/* doctrine version chips */}
                {isDoctrine && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-ink-3 mr-1">版本</span>
                    {data.versions.slice(0, 12).map((v) => {
                      const isCurrent = v.version === data.version;
                      const isViewing = doctrineVersion ? v.version === doctrineVersion : isCurrent;
                      return (
                        <button
                          key={v.version}
                          onClick={() => setDoctrineVersion(isCurrent ? null : v.version)}
                          className="mono text-[11px] px-2 py-0.5 rounded-full transition-colors"
                          style={dimStyle(isCurrent ? "money" : "neutral", isViewing)}
                          title={`封存於 ${ago(v.mtime)}`}
                        >
                          v{v.version}{isCurrent ? " ·目前版本" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Panel>
                  <PanelHeader
                    icon={selectedSpec.kind === "code" ? Braces : ScrollText}
                    title={
                      isDoctrine
                        ? doctrineVersion
                          ? `執行流程 v${doctrineVersion} — 封存快照`
                          : `執行流程 v${data.version} — 目前準則`
                        : moduleLabel(selectedSpec.name)
                    }
                    meta={file ? `${selectedSpec.rel} · 磁碟 ${ago(file.mtime)}` : selectedSpec.rel}
                    actions={
                      <div className="flex items-center gap-2">
                        {selectedSpec.kind === "markdown" && !editing && (
                          <button onClick={() => setRawView(!rawView)} className="text-[12px] px-2.5 py-1 rounded-full" style={dimStyle("neutral", rawView)}>
                            {rawView ? "閱讀檢視" : "原始內容"}
                          </button>
                        )}
                        {!editing && (!isDoctrine || !doctrineVersion) && (
                          <button
                            onClick={() => { setDraft(file?.content ?? ""); setEditing(true); setSaveMsg(null); }}
                            disabled={!file}
                            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={dimStyle(isDoctrine ? "money" : "ok", true)}
                          >
                            <Pencil className="w-3 h-3" /> {isDoctrine ? "編輯並建立新版本" : "編輯"}
                          </button>
                        )}
                      </div>
                    }
                  />

                  {isDoctrine && doctrineVersion && (
                    <div className="text-[12px] text-ink-3 mb-3 flex items-center gap-2">
                      <History className="w-3.5 h-3.5" />
                      已標記的版本不可變更；這是歷史紀錄。請選擇 v{data.version} 進行編輯。
                    </div>
                  )}

                  {saveMsg && (
                    <div className="text-[12px] mb-3 flex items-center gap-2" style={{ color: saveMsg.startsWith("已儲存") || saveMsg.startsWith("v") ? "var(--ok)" : "var(--warn)" }}>
                      <GitCommitHorizontal className="w-3.5 h-3.5" /> {saveMsg}
                    </div>
                  )}

                  {fileLoading && <div className="text-ink-3 text-sm">載入中…</div>}

                  {!editing && file && (
                    selectedSpec.kind === "code" || rawView ? (
                      <pre className="text-[12px] leading-relaxed text-ink-2 mono whitespace-pre-wrap bg-surface-1 border border-line-1 rounded-lg p-4 overflow-x-auto max-h-[70vh] overflow-y-auto">
                        {file.content}
                      </pre>
                    ) : (
                      <div className="max-h-[70vh] overflow-y-auto pr-2">
                        <Md content={file.content} />
                      </div>
                    )
                  )}

                  {editing && (
                    <div className="flex flex-col gap-3">
                      <textarea className={editorClass} value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
                      {isDoctrine ? (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {(["patch", "feature"] as const).map((b) => (
                                <button key={b} onClick={() => setDocBump(b)} className="text-[12px] px-2.5 py-1 rounded-full" style={dimStyle(b === "feature" ? "money" : "ok", docBump === b)}>
                                  {b === "patch" ? "修補" : "功能"} → v{b === "patch" ? nextPatch : nextFeature}
                                </button>
                              ))}
                            </div>
                            <input
                              value={docNote}
                              onChange={(e) => setDocNote(e.target.value)}
                              placeholder="變更紀錄：修改了什麼及原因（必填）"
                              className="flex-1 min-w-[280px] bg-surface-1 border border-line-2 rounded-lg px-3 py-1.5 text-[13px] text-ink-1 focus:outline-none focus:border-line-3"
                            />
                            <button
                              onClick={saveDoctrine}
                              disabled={saving || docNote.trim().length < 10}
                              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                              style={dimStyle("ok", true)}
                            >
                              <GitCommitHorizontal className="w-3.5 h-3.5" /> {saving ? "正在建立版本…" : "儲存為新版本"}
                            </button>
                            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-full text-ink-3 hover:text-ink-1">
                              <X className="w-3.5 h-3.5" /> 取消
                            </button>
                          </div>
                          <p className="text-[11px] text-ink-3">
                            儲存會執行完整流程：寫入 <span className="mono">v&#123;next&#125;.md</span> （更新主標題並保留舊版本）、新增變更紀錄、更新 <span className="mono">LATEST</span>，並將三者提交至 Git。
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={saveInPlace}
                            disabled={saving}
                            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={dimStyle("ok", true)}
                          >
                            <GitCommitHorizontal className="w-3.5 h-3.5" /> {saving ? "儲存中…" : "儲存並提交"}
                          </button>
                          <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-full text-ink-3 hover:text-ink-1">
                            <X className="w-3.5 h-3.5" /> 取消
                          </button>
                          <span className="text-[11px] text-ink-3">
                            {selectedSpec.kind === "code"
                              ? "伺服器會先檢查語法；有語法錯誤的事件處理程式不會寫入。若磁碟檔案已變更，回傳 409 防止覆寫。"
                              : "衝突保護：若載入後磁碟檔案已有變更，儲存時回傳 409，避免覆寫。"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ HOW IT WORKS ════ */}
      {data && tab === "how" && (
        <>
          <Panel>
            <PanelHeader
              icon={Sparkles}
              title="系統如何運作：持續更新的白話說明"
              meta={data.summary ? `產生於 ${ago(data.summary.generated_at)}，依目前檔案產生` : undefined}
              actions={
                <div className="flex items-center gap-2">
                  {data.summary?.stale && (
                    <Pill dim="warn" title="流程檔案已有變更，伺服器正自動重新產生說明">更新中</Pill>
                  )}
                  <button
                    onClick={regenerate}
                    disabled={regenerating || data.generating}
                    className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={dimStyle("blue", true)}
                  >
                    <RefreshCw className={`w-3 h-3 ${regenerating || data.generating ? "animate-spin" : ""}`} />
                    {regenerating || data.generating ? "重新產生中…" : "強制重新產生"}
                  </button>
                </div>
              }
            />
            {data.summary ? (
              <Md content={data.summary.markdown} />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="正在撰寫說明…"
                hint="伺服器會依目前流程檔案自動產生；若數分鐘後仍未出現，可按強制重新產生。"
              />
            )}
          </Panel>

          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">工作循環：訊息如何成為已驗證的成果</h2>
            <div className="flex flex-wrap items-stretch gap-2">
              {FLOW.map((step, i) => (
                <div key={step.name} className="contents">
                  <div className="flex-1 min-w-[170px] rounded-lg p-3 flex flex-col" style={dimStyle(step.dim, true)}>
                    <div className="text-[12px] font-semibold tracking-[0.12em] uppercase">{i + 1} · {step.name}</div>
                    <div className="text-[11px] text-ink-3 mt-1 leading-snug flex-1">{step.desc}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step.files.map((fid) => {
                        const f = data.chain.find((c) => c.id === fid);
                        return f ? (
                          <button
                            key={fid}
                            onClick={() => selectFile(fid)}
                            className="mono text-[10px] px-1.5 py-0.5 rounded bg-surface-1 border border-line-2 text-ink-2 hover:text-ink-1 hover:border-line-3 transition-colors"
                            title={f.rel}
                          >
                            {moduleLabel(f.name)}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="hidden xl:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-ink-3 mt-2">
              簡單回應會從判斷直接進入回應。系統依工作與驗證要求調整深度，可只花數秒，也可透過代理與審查持續執行。
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatTile icon={ScrollText} label="要求" value={data.claims.total} dim="money" sub="執行完成時必須成立的條件" />
            <StatTile icon={ShieldCheck} label="事件檢查" value={data.claims.hook} dim="err" sub="由機制直接攔截" />
            <StatTile icon={Eye} label="驗證" value={data.claims.check} dim="ok" sub="執行並記錄的檢查" />
            <StatTile icon={FileText} label="自我檢核" value={data.claims.self} dim="freedom" sub="誠實自評並追蹤品質變化" />
            <StatTile icon={History} label="版本" value={data.versions.length >= 20 ? "20+" : data.versions.length} dim="relationships" sub={`目前 v${data.version} · 每次編輯都建立封存版本`} />
          </div>

          {evals && evals.length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-1">評估：可選用的驗證套件</h2>
              <p className="text-[12px] text-ink-3 mb-3">
                以跨次試驗通過率檢查流程所選的行為回歸類型；設定變更時會自動執行指定套件。
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {evals.map((s) => (
                  <div key={s.suite} className="rounded-lg border border-line-1 bg-surface-2 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider text-ink-2 truncate">
                      <ShieldCheck size={12} className="shrink-0" />
                      <span className="truncate">{s.suite}</span>
                    </div>
                    <div className={`text-2xl font-semibold leading-none ${s.passed ? "text-emerald-400" : "text-red-400"}`}>
                      {Math.round((s.pass_to_k ?? 0) * 100)}%
                    </div>
                    <div className="text-[11px] text-ink-3 mt-1.5">
                      連續通過率 · {s.passed ? "通過" : "出現退步"} · {s.cases?.length ?? 0} 案例
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {data?.errors && (
        <div className="text-[11px] text-ink-3">異常檢查： {Object.keys(data.errors).join(", ")}</div>
      )}
    </PageShell>
  );
}
