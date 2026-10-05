"use client";

/**
 * Hermes core files — read and edit the sidecar's brain from Pulse.
 *
 * The three planes are rendered as three panels because they are governed
 * differently, and a flat file list would hide that: `source` is the principal's
 * content and the real lever, `runtime` is the mounted install (mostly generated,
 * therefore read-only here), `code` ships publicly and refuses writes that carry
 * a home path or a credential.
 *
 * Generated files are shown, never edited. A hand edit to SOUL.md survives until
 * the next mount, so offering the edit would be offering an undo the operator
 * doesn't know is coming — the row links to its sources instead.
 *
 * Server contract: `LIFEOS/PULSE/modules/hermes.ts`.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApiCall } from "@/lib/local-api";
import { formatDate, formatDateTime } from "@/lib/zh-TW";
import { Panel, PanelHeader, Pill } from "@/components/ui/chrome";
import {
  FileText, Lock, RefreshCw, Save, X, ChevronRight, ChevronDown,
  Cpu, User, Boxes, AlertTriangle, Check,
} from "lucide-react";

// ── Types (mirror modules/hermes.ts) ──

type Plane = "runtime" | "source" | "code";

export interface HermesFileEntry {
  id: string;
  label: string;
  plane: Plane;
  language: string;
  role: string;
  displayPath: string;
  exists: boolean;
  sealed: boolean;
  editable: boolean;
  generatedBy: string | null;
  sourceIds: string[];
  bytes: number | null;
  lines: number | null;
  modified: string | null;
}

interface HermesOverview {
  health: {
    status: "absent" | "down" | "flapping" | "degraded" | "up";
    summary: string;
    installed: boolean;
  } | null;
  hermesHome: string;
  mount: { stale: boolean; detail: string; probed: boolean };
  files: HermesFileEntry[];
  planes: Record<Plane, string>;
}

// ── Guard friction (mirrors LIFEOS/HERMES/LogAnalysis.ts) ──

interface GuardFinding {
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  count: number;
  recommendation: string;
}

interface GuardLogAnalysis {
  available: boolean;
  windowDays: number;
  totalBlocks: number;
  lastTs: string | null;
  byClass: Record<string, number>;
  byDay: Array<{ day: string; total: number; taint: number; other: number }>;
  topRules: Array<{ rule: string; cls: string; count: number; lastTs: string }>;
  taintSources: Array<{ source: string; count: number; zeroShape: number }>;
  findings: GuardFinding[];
}

const SEVERITY_DIM: Record<string, "err" | "warn" | "neutral"> = { high: "err", medium: "warn", low: "neutral" };
const SEVERITY_LABEL: Record<GuardFinding["severity"], string> = { high: "高", medium: "中", low: "低" };
const GUARD_CLASS_LABEL: Record<string, string> = {
  taint: "不可信輸入",
  "deny-rule": "禁止規則",
  "cron-read": "排程檔案讀取",
  credential: "憑證保護",
  "policy-unavailable": "規則無法載入",
  other: "其他",
};

function guardClassLabel(value: string): string {
  return GUARD_CLASS_LABEL[value] ?? value;
}

/**
 * The guard's audit trail, analyzed — which blocks are protection and which are
 * friction. This panel is the improvement loop the principal asked for: every
 * refused call is classified, retry loops and zero-evidence taints surface as
 * findings, and each finding names its deterministic next step.
 */
function GuardFrictionPanel() {
  const { data } = useQuery<GuardLogAnalysis>({
    queryKey: ["hermes-log-analysis"],
    queryFn: () => localApiCall("/api/hermes/log-analysis?days=14"),
    refetchInterval: 120_000,
  });

  if (!data || !data.available) return null;

  const classes = Object.entries(data.byClass).sort(([, a], [, b]) => b - a);
  const maxDay = Math.max(1, ...data.byDay.map((d) => d.total));

  return (
    <Panel>
      <PanelHeader
        title="安全檢查的阻礙"
        icon={AlertTriangle}
        meta={<span className="whitespace-nowrap">{data.totalBlocks} 次攔截 · {data.windowDays} 天</span>}
      />
      <div className="text-[12px] text-ink-3 mb-3">
        依據 <code className="mono">blocked.jsonl</code>分類工具呼叫的攔截紀錄，整理重試迴圈、缺少依據的標記與反覆觸發的規則。
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {classes.map(([cls, n]) => (
          <Pill key={cls} dim={cls === "taint" ? "warn" : cls === "credential" ? "ok" : "neutral"}>
            {guardClassLabel(cls)} {n}
          </Pill>
        ))}
      </div>

      {data.byDay.length > 1 && (
        <div className="flex items-end gap-[3px] h-16 mb-4">
          {data.byDay.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col justify-end" title={`${formatDate(d.day)}：${d.total} 次攔截（${d.taint} 次涉及不可信輸入）`}>
              <div className="bg-amber-500/70 rounded-t-sm" style={{ height: `${(d.taint / maxDay) * 100}%` }} />
              <div className="bg-line-2 rounded-b-sm" style={{ height: `${(d.other / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
      )}

      {data.findings.length === 0 ? (
        <div className="flex items-center gap-2 text-[12px] text-ink-2">
          <Check className="w-3.5 h-3.5" /> 這段期間沒有發現額外阻礙；其餘攔截可能屬於正常保護。
        </div>
      ) : (
        <div className="space-y-2">
          {data.findings.map((f) => (
            <div key={`${f.kind}-${f.title}`} className="p-3 rounded-md bg-surface-1 border border-line-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill dim={SEVERITY_DIM[f.severity] ?? "neutral"}>{SEVERITY_LABEL[f.severity] ?? f.severity}</Pill>
                <span className="text-[12px] font-medium">{f.title}</span>
                <span className="text-[11px] text-ink-3 mono">×{f.count}</span>
              </div>
              <div className="mt-1 text-[12px] text-ink-2">{f.detail}</div>
              <div className="mt-1 text-[12px] text-ink-3 flex items-start gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 mt-[1px] shrink-0" />
                <span>{f.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.topRules.length > 0 && (
        <details className="mt-4">
          <summary className="text-[12px] text-ink-3 cursor-pointer select-none">最常觸發的規則</summary>
          <table className="mt-2 w-full text-[12px]">
            <tbody>
              {data.topRules.map((r) => (
                <tr key={r.rule} className="border-t border-line-2">
                  <td className="py-1 pr-3 mono break-all">{r.rule}</td>
                  <td className="py-1 pr-3 text-ink-3 whitespace-nowrap">{guardClassLabel(r.cls)}</td>
                  <td className="py-1 text-right mono">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </Panel>
  );
}

const PLANE_META: Record<Plane, { title: string; icon: typeof Cpu }> = {
  source: { title: "來源 · 個人設定與素材", icon: User },
  runtime: { title: "執行環境 · 已載入的設定", icon: Boxes },
  code: { title: "程式 · 可公開的共用實作", icon: Cpu },
};

const PLANE_ORDER: Plane[] = ["source", "runtime", "code"];

// Display-only translations of the fixed registry metadata in PULSE/modules/hermes.ts.
// File ids and API values remain unchanged; unrecognized files keep their supplied role.
const FILE_ROLE_LABEL: Record<string, string> = {
  soul: "助理的系統提示詞：包含核心原則、身分與入口說明，每輪對話都會載入。",
  config: "服務入口設定：模型、代理、通道、技能載入與核准規則。Mount.ts 管理其中四個欄位，其餘由你設定。",
  policy: "安全檢查使用的禁止清單，決定哪些檔案讀取與終端機指令會被拒絕。",
  "guard-installed": "已安裝的安全檢查程式，攔截可能攜帶憑證的工具呼叫。",
  "plugin-manifest": "安全檢查外掛的宣告檔，讓 Hermes 找到並載入 LifeOS 外掛。",
  "cron-jobs": "助理的排程設定；這些工作會以 Hermes 來源顯示在工作台。",
  "hermes-env": "助理憑證與允許寫入的根目錄。受保護：只列出檔案，不讀取內容。",
  "hermes-auth": "OAuth 授權權杖。受保護：只列出檔案，不讀取內容。",
  "system-prompt": "系統的核心原則；除命令列輸出格式章節外，原文會納入 SOUL.md。",
  "da-identity": "助理的身分、性格、書寫風格與互動關係，會提供給助理使用。",
  "da-memory": "助理運作的近期記憶，會在篇幅上限內納入 SOUL.md。",
  "principal-identity": "主理人的身分資料；產生設定時會移除個人識別資訊所在的行。",
  "principal-memory": "關於主理人的近期記憶，會在篇幅上限內納入 SOUL.md。",
  telos: "使命、目標、問題與挑戰，讓助理理解主理人想前往的方向。",
  projects: "專案索引；只有名稱會納入 SOUL.md，不包含路徑。",
  "render-soul": "產生 SOUL.md，處理兩層內容、個人資訊與機密清理，以及各章節的篇幅上限。",
  mount: "安裝程式：產生 SOUL.md、安裝安全檢查、更新 config.yaml，並設定可寫入的範圍。",
  "policy-src": "定義助理不得讀取的內容與原因，是產生 policy.json 的來源。",
  health: "唯讀狀態檢查程式，提供工作台與選單列顯示的 Hermes 狀態。",
  "guard-src": "安全檢查原始碼，攔截會將機密帶入助理脈絡的工具呼叫。",
  "plugin-manifest-src": "外掛宣告檔的來源，由 Mount.ts 複製到安裝位置。",
  "plugin-init": "外掛入口，向 Hermes 註冊安全檢查的觸發程序。",
  "bunker-config": "將助理登錄到 Bunker，讓狀態檢查由應用監測系統執行。",
  isa: "助理的狀態依據，包含待驗證的陳述、反證條件與驗證證據。",
};

const PLANE_DESCRIPTION: Record<Plane, string> = {
  source: "你的個人設定與素材。SOUL.md 由這些來源產生；修改這裡會改變助理使用的內容。",
  runtime: "已載入的執行環境，位於 LifeOS 儲存庫之外。自動產生的檔案在此僅供閱讀。",
  code: "各安裝環境共用、可公開發布的程式。包含私人目錄路徑或憑證的修改無法儲存。",
};

function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} 位元組`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "時間未知";
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 0) return formatDateTime(iso);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)} 小時前`;
  return `${Math.round(mins / 1440)} 天前`;
}

// ── One file row, expand-to-edit ──

function FileRow({
  file,
  open,
  onToggle,
  byId,
  onJump,
}: {
  file: HermesFileEntry;
  open: boolean;
  onToggle: () => void;
  byId: Map<string, HermesFileEntry>;
  onJump: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<{ content: string; meta: HermesFileEntry }>({
    queryKey: ["hermes-file", file.id],
    queryFn: () => localApiCall(`/api/hermes/file/${encodeURIComponent(file.id)}`),
    enabled: open && !file.sealed && file.exists,
    refetchOnWindowFocus: false,
  });

  // The draft is seeded once per open, from whatever the server last returned.
  // Re-seeding on every render would fight the operator's cursor.
  useEffect(() => {
    if (open && data && draft === null) setDraft(data.content);
    if (!open) {
      setDraft(null);
      setError(null);
      setSaved(false);
    }
  }, [open, data, draft]);

  const save = useMutation({
    mutationFn: (content: string) =>
      localApiCall(`/api/hermes/file/${encodeURIComponent(file.id)}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["hermes-file", file.id] });
      queryClient.invalidateQueries({ queryKey: ["hermes-overview"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: Error) => setError(err.message || "儲存失敗，請稍後再試。"),
  });

  const dirty = draft !== null && data !== undefined && draft !== data.content;
  const statusColor = !file.exists ? "var(--ink-3)" : file.sealed ? "var(--warn)" : file.editable ? "var(--ok)" : "var(--ink-2)";

  return (
    <div className="border-b border-line-2 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-surface-3 rounded transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-ink-3 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-3 shrink-0" />}
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
        <span className="text-[13px] mono text-ink-1 shrink-0">{file.label}</span>
        {file.sealed && (
          <span className="flex items-center gap-1 text-[10px] text-ink-3 shrink-0">
            <Lock className="w-3 h-3" /> 受保護
          </span>
        )}
        {file.generatedBy && !file.sealed && (
          <span className="text-[10px] text-ink-3 shrink-0">自動產生</span>
        )}
        <span className="text-[12px] text-ink-3 flex-1 truncate">{FILE_ROLE_LABEL[file.id] ?? file.role}</span>
        <span className="text-[11px] mono text-ink-3 shrink-0 whitespace-nowrap w-14 text-right">
          {file.lines !== null ? `${file.lines} 行` : formatBytes(file.bytes)}
        </span>
        <span className="text-[11px] mono text-ink-3 shrink-0 whitespace-nowrap text-right" title={file.modified ? formatDateTime(file.modified) : undefined}>{formatWhen(file.modified)}</span>
      </button>

      {open && (
        <div className="pb-4 pl-7 pr-1 space-y-2">
          <div className="text-[11px] mono text-ink-3">{file.displayPath}</div>

          {!file.exists && <div className="text-[12px] text-ink-3">本機尚無此檔案。</div>}

          {file.sealed && (
            <div className="text-[12px] text-ink-2 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
              <span>
                此檔案包含憑證。工作台只列出其存在，不讀取內容；請在本機終端機中編輯。
              </span>
            </div>
          )}

          {file.generatedBy && !file.sealed && (
            <div className="text-[12px] text-ink-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
              <span>
                產生工具： <code className="mono">{file.generatedBy}</code>。手動修改會在下次載入設定時被覆蓋。
                {file.sourceIds.length > 0 && (
                  <>
                    {" "}請修改來源：{" "}
                    {file.sourceIds.map((sid, i) => {
                      const src = byId.get(sid);
                      if (!src) return null;
                      return (
                        <span key={sid}>
                          {i > 0 && ", "}
                          <button
                            type="button"
                            onClick={() => onJump(sid)}
                            className="mono underline decoration-dotted hover:text-ink-1"
                          >
                            {src.label}
                          </button>
                        </span>
                      );
                    })}
                  </>
                )}
              </span>
            </div>
          )}

          {file.plane === "code" && file.editable && (
            <div className="text-[12px] text-ink-3">
              此程式會公開發布；含有私人路徑或憑證的修改無法儲存。
            </div>
          )}

          {!file.sealed && file.exists && (
            <>
              {isLoading && <div className="text-[12px] text-ink-3">載入中…</div>}
              {draft !== null && (
                <textarea
                  aria-label={`${file.label} 的檔案內容`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  readOnly={!file.editable}
                  spellCheck={false}
                  className="w-full mono text-[12px] leading-[1.55] p-3 rounded-md bg-surface-1 border border-line-2 text-ink-1 focus:outline-none focus:border-line-3"
                  style={{ minHeight: "22rem", resize: "vertical" }}
                />
              )}
              {error && (
                <div className="text-[12px]" style={{ color: "var(--err)" }}>
                  {error}
                </div>
              )}
              {file.editable && draft !== null && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!dirty || save.isPending}
                    onClick={() => save.mutate(draft)}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" /> {save.isPending ? "儲存中…" : "儲存"}
                  </button>
                  <button
                    type="button"
                    disabled={!dirty}
                    onClick={() => data && setDraft(data.content)}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" /> 還原
                  </button>
                  {dirty && <span className="text-[11px] text-ink-3">尚未儲存</span>}
                  {saved && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ok)" }}>
                      <Check className="w-3.5 h-3.5" /> 已儲存 · 已保留備份
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── The tab ──

export default function HermesFiles() {
  const queryClient = useQueryClient();
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [remountResult, setRemountResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery<HermesOverview>({
    queryKey: ["hermes-overview"],
    queryFn: () => localApiCall("/api/hermes"),
    refetchInterval: 60_000,
  });

  const remount = useMutation({
    mutationFn: () => localApiCall<{ ok: boolean; output: string; error: string | null }>("/api/hermes/remount", { method: "POST" }),
    onSuccess: (r) => {
      setRemountResult(r.ok ? r.output : (r.error ?? "設定載入失敗，請稍後再試。"));
      queryClient.invalidateQueries({ queryKey: ["hermes-overview"] });
      queryClient.invalidateQueries({ queryKey: ["hermes-file"] });
    },
    onError: (err: Error) => setRemountResult(err.message || "設定載入失敗，請稍後再試。"),
  });

  if (isLoading) return <div className="text-[13px] text-ink-3">正在載入助理核心檔案…</div>;
  if (!data) return <div className="text-[13px] text-ink-3">暫時無法取得助理檔案。</div>;

  const byId = new Map(data.files.map((f) => [f.id, f]));

  function jump(id: string) {
    setOpenFile(id);
    // The panels are ordered source → runtime → code, so a jump from a generated
    // runtime file scrolls up. Without this the row opens off-screen.
    requestAnimationFrame(() => {
      document.getElementById(`hermes-file-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="space-y-6">
      {/* Mount state — the one thing that makes every other row trustworthy. */}
      <Panel>
        <PanelHeader
          title="設定載入"
          icon={RefreshCw}
          meta={data.hermesHome}
          actions={
            <button
              type="button"
              disabled={remount.isPending || !data.health?.installed}
              onClick={() => remount.mutate()}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${remount.isPending ? "animate-spin" : ""}`} />
              {remount.isPending ? "載入設定中…" : "重新載入設定"}
            </button>
          }
        />
        <div className="flex items-center gap-3 flex-wrap">
          <Pill dim={data.mount.stale ? "warn" : data.mount.probed ? "ok" : "neutral"}>
            {data.mount.stale ? "需要更新" : data.mount.probed ? "已是最新" : "尚未檢查"}
          </Pill>
          <span className="text-[12px] text-ink-2">
            {data.mount.stale
              ? "SOUL.md 或 config.yaml 與來源不同；請重新載入設定以產生最新版本。"
              : data.mount.probed ? "產生的檔案與來源一致。" : "尚未確認產生的檔案是否與來源一致。"}
          </span>
        </div>
        {data.mount.detail && (
          <pre className="mt-3 text-[11px] mono text-ink-3 whitespace-pre-wrap">{data.mount.detail}</pre>
        )}
        {remountResult && (
          <pre className="mt-3 text-[11px] mono text-ink-2 whitespace-pre-wrap p-3 rounded-md bg-surface-1 border border-line-2">
            {remountResult}
          </pre>
        )}
      </Panel>

      <GuardFrictionPanel />

      {PLANE_ORDER.map((plane) => {
        const files = data.files.filter((f) => f.plane === plane);
        if (files.length === 0) return null;
        const { title, icon } = PLANE_META[plane];
        return (
          <Panel key={plane}>
            <PanelHeader title={title} icon={icon} meta={<span className="whitespace-nowrap">{files.length} 份檔案</span>} />
            <div className="text-[12px] text-ink-3 mb-3">{PLANE_DESCRIPTION[plane] ?? data.planes[plane]}</div>
            <div>
              {files.map((f) => (
                <div key={f.id} id={`hermes-file-${f.id}`}>
                  <FileRow
                    file={f}
                    open={openFile === f.id}
                    onToggle={() => setOpenFile(openFile === f.id ? null : f.id)}
                    byId={byId}
                    onJump={jump}
                  />
                </div>
              ))}
            </div>
          </Panel>
        );
      })}

      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <FileText className="w-3.5 h-3.5" />
        每次儲存都會將舊版本備份至 <code className="mono">LIFEOS/MEMORY/STATE/hermes-edits/</code>。
      </div>
    </div>
  );
}
