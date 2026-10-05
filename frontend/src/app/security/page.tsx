"use client";

import { displayLabel } from "@/lib/zh-TW";
import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldAlert, ShieldX, ShieldCheck, Eye, Lock,
  FileWarning, Server, Info, ChevronDown, ChevronRight, Terminal, Globe,
  BookOpen as BookIcon, Radar, Boxes, Clock, AlertTriangle, Cloud,
} from "lucide-react";
import {
  PageShell, PageHeader, Panel, PanelHeader, StatTile, Pill, dimStyle,
  type Dim,
} from "@/components/ui/chrome";
import type { LucideIcon } from "lucide-react";

// ── API shape (as of the 2026-05-06 minimal-v1 security model) ──
// GET /api/security             → { model, description, denyList, hooks }
// GET /api/security/hooks-detail → Record<command, HookDetail>
interface HookRegistration { type: string; matcher: string; command: string; status: "active" | "missing" }
interface HookDetail { description: string; behavior: string; event: string; canBlock: boolean }
interface SecurityData {
  model: string;
  description: string;
  denyList: string[];
  hooks: HookRegistration[];
}

// ── /api/security/attack-surface (PRIVATE — runtime-only, never in the static export) ──
interface SurfaceTarget { name: string; type: string; multiTenant?: boolean }
interface SurfaceFinding { target: string; category: string; check: string; evidence: string }
interface AttackSurfaceData {
  schedule: string;
  discovery: string;
  inventory: {
    lastSync: string | null;
    curated: number | null;
    discovered: number | null;
    dnsHosts: number | null;
    workerOrigins: number | null;
    targets: SurfaceTarget[];
  } | null;
  scan: {
    timestamp: string | null;
    summary: { pass: number; fail: number; error: number; skip: number } | null;
    targetsScanned: number;
    findingCounts: { critical: number; high: number; medium: number; low: number };
    findings: Record<string, SurfaceFinding[]>;
  } | null;
}

// ── /api/threatmodel (PRIVATE — risk-register posture, redacted) ──
interface RiskSummary {
  id: string; title: string; threat: string;
  level: "Critical" | "High" | "Medium" | "Low";
  score: number; likelihood: number; impact: number;
  status: string; assets: string[]; data_classes: string[];
  owner: string; response: string; review_by: string; overdue: boolean;
}
interface ThreatModelData {
  available: boolean;
  grade?: "red" | "orange" | "green";
  total?: number; open?: number; overdue_review?: number;
  byLevel?: Record<string, number>;
  byStatus?: Record<string, number>;
  risks?: RiskSummary[];
  updated?: string | null;
}

/**
 * State of a PRIVATE endpoint: null while the fetch is in flight, "unavailable"
 * once it has failed. The two private sections used to share `null` for both, so
 * an install that never serves those routes — the public payload has no
 * infrastructure scanner and no risk register — sat on "Loading…" forever
 * (public issue #1799, @jacobo-ortiz, follow-up to the /security route ship).
 */
type PrivateData<T> = T | "unavailable" | null;

/** Fetch a private endpoint, collapsing a bad status or a thrown error to "unavailable". */
function fetchPrivate<T>(path: string, set: (v: PrivateData<T>) => void): void {
  fetch(path)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
    .then(set)
    .catch(() => set("unavailable"));
}

/** Shared body for a section whose private source isn't part of this install. */
function NotConfigured({ what }: { what: string }) {
  return (
    <Panel>
      <p className="text-xs text-center py-6 text-ink-3">此安裝尚未設定： {what}</p>
    </Panel>
  );
}

const LEVEL_DIM: Record<string, Dim> = { Critical: "err", High: "warn", Medium: "freedom", Low: "rhythms" };
const GRADE_DIM: Record<string, Dim> = { red: "err", orange: "warn", green: "ok" };

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.round(hrs / 24)} 天前`;
}

// ── Section Header ──
function SectionHeader({ icon: Icon, title, count, accentClass = "text-dim-freedom" }: {
  icon: LucideIcon; title: string; count?: number; accentClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-8 first:mt-0">
      <Icon className={`w-5 h-5 shrink-0 ${accentClass}`} />
      <h2 className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap text-ink-1">{title}</h2>
      {count !== undefined && <span className="text-xs text-ink-3 ml-1 shrink-0">({count})</span>}
    </div>
  );
}

// ── Deny-rule grouping ──
// Deny entries look like `Bash(rm -rf /)`, `Write(~/.claude/**/memory/**)`, `Edit(...)`.
// Group by the leading tool so the list reads as policy, not a wall of regex.
interface DenyGroup { tool: string; icon: LucideIcon; dim: Dim; entries: string[] }

function groupDenyList(denyList: string[]): DenyGroup[] {
  const toolMeta: Record<string, { icon: LucideIcon; dim: Dim }> = {
    Bash: { icon: Terminal, dim: "err" },
    Write: { icon: FileWarning, dim: "warn" },
    Edit: { icon: FileWarning, dim: "warn" },
    Read: { icon: Eye, dim: "freedom" },
    WebFetch: { icon: Globe, dim: "freedom" },
    WebSearch: { icon: Globe, dim: "freedom" },
  };
  const groups = new Map<string, DenyGroup>();
  for (const raw of denyList) {
    const m = raw.match(/^(\w+)\((.*)\)$/);
    const tool = m ? m[1] : "其他";
    const arg = m ? m[2] : raw;
    const meta = toolMeta[tool] ?? { icon: Lock, dim: "neutral" as Dim };
    if (!groups.has(tool)) groups.set(tool, { tool, icon: meta.icon, dim: meta.dim, entries: [] });
    groups.get(tool)!.entries.push(arg);
  }
  // Bash/Write/Edit first (the destructive ones), then the rest alphabetically.
  const order = ["Bash", "Write", "Edit", "Read", "WebFetch", "WebSearch"];
  return [...groups.values()].sort((a, b) => {
    const ai = order.indexOf(a.tool), bi = order.indexOf(b.tool);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.tool.localeCompare(b.tool);
  });
}

function DenyGroupCard({ group }: { group: DenyGroup }) {
  const color = dimStyle(group.dim, true).color as string;
  return (
    <Panel className="flex flex-col gap-2">
      <PanelHeader
        icon={group.icon}
        title={<span style={{ color }}>{group.tool}</span>}
        meta={`(${group.entries.length})`}
      />
      <div className="space-y-1">
        {group.entries.map((entry, i) => (
          <code
            key={i}
            className="block text-xs mono rounded px-2 py-1 bg-surface-1 text-ink-2"
            style={{ wordBreak: "break-all" }}
          >
            {entry}
          </code>
        ))}
      </div>
    </Panel>
  );
}

// ── Hook Detail Row ──
function HookDetailRow({ hook, detail }: { hook: HookRegistration; detail?: HookDetail }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = hook.status === "active";
  const Arrow = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="border-b border-line-1 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 py-2.5 w-full text-left px-2 rounded transition-colors hover:bg-surface-1"
      >
        <Arrow className="w-3 h-3 shrink-0 text-ink-3" />
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isActive ? "var(--ok)" : "var(--err)" }}
        />
        <span className="text-xs mono flex-1 truncate text-ink-1">{hook.command}</span>
        <span className="text-xs text-ink-3">{displayLabel(hook.type)} · {hook.matcher}</span>
        {detail?.canBlock && <Pill dim="err">可攔截</Pill>}
        {detail && !detail.canBlock && <Pill dim="neutral">僅提供建議</Pill>}
        {!isActive && <Pill dim="err">缺少檔案</Pill>}
      </button>
      {expanded && detail && (
        <div className="pl-10 pr-4 pb-3 space-y-2">
          <div>
            <div className="text-xs tracking-wider uppercase mb-0.5 text-ink-3">說明</div>
            <div className="text-xs text-ink-1">{detail.description}</div>
          </div>
          <div>
            <div className="text-xs tracking-wider uppercase mb-0.5 text-ink-3">行為</div>
            <div className="text-xs text-ink-2">{detail.behavior}</div>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-xs text-ink-3">事件： </span>
              <span className="text-xs mono text-dim-freedom">{detail.event}</span>
            </div>
            <div>
              <span className="text-xs text-ink-3">可攔截： </span>
              <span className={`text-xs ${detail.canBlock ? "text-err" : "text-ink-2"}`}>
                {detail.canBlock ? "是（可拒絕呼叫）" : "否（僅提供建議）"}
              </span>
            </div>
          </div>
        </div>
      )}
      {expanded && !detail && (
        <div className="pl-10 pr-4 pb-3">
          <p className="text-xs text-ink-3">此事件處理尚未登記詳細說明。</p>
        </div>
      )}
    </div>
  );
}

// ── Defense-layer card (the three-layer model) ──
function LayerCard({ n, icon: Icon, title, where, body, dim }: {
  n: number; icon: LucideIcon; title: string; where: string; body: string; dim: Dim;
}) {
  const color = dimStyle(dim, true).color as string;
  return (
    <div className="px-3 py-3 rounded-lg bg-surface-1 border border-line-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="mono text-xs text-ink-3">{n}</span>
        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
        <span className="text-xs font-semibold whitespace-nowrap text-ink-1">{title}</span>
      </div>
      <code className="text-xs mono block mb-1" style={{ color }}>{where}</code>
      <p className="text-xs text-ink-2">{body}</p>
    </div>
  );
}

// ══════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════

// ── Attack Surface Monitoring section ──
function TypePill({ type, multiTenant }: { type: string; multiTenant?: boolean }) {
  const dim: Dim = type === "api" ? "freedom" : type === "worker" ? "rhythms" : "creative";
  return (
    <span className="inline-flex items-center gap-1">
      <Pill dim={dim}>{displayLabel(type)}</Pill>
      {multiTenant && <Pill dim="warn">多租戶</Pill>}
    </span>
  );
}

function AttackSurfaceSection({ surface }: { surface: PrivateData<AttackSurfaceData> }) {
  const [showTargets, setShowTargets] = useState(false);
  if (surface === "unavailable") {
    return (
      <div>
        <SectionHeader icon={Radar} title="攻擊面監測" />
        <NotConfigured what="此區塊讀取與 Pulse 一同執行的私人基礎設施掃描器。" />
      </div>
    );
  }
  if (!surface) {
    return (
      <div>
        <SectionHeader icon={Radar} title="攻擊面監測" />
        <Panel><p className="text-xs text-center py-6 text-ink-3">正在載入掃描狀態…</p></Panel>
      </div>
    );
  }
  const inv = surface.inventory;
  const scan = surface.scan;
  const fc = scan?.findingCounts;
  const hasScan = !!scan?.timestamp && !Number.isNaN(Date.parse(scan.timestamp)) && !!fc;
  const clean = hasScan && fc?.critical === 0 && fc?.high === 0;
  const critHigh = [...(scan?.findings?.critical ?? []), ...(scan?.findings?.high ?? [])];

  return (
    <div>
      <SectionHeader icon={Radar} title="攻擊面監測" count={scan?.targetsScanned} accentClass="text-dim-freedom" />
      <p className="text-xs mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {hasScan ? `最近掃描 · ${relTime(scan?.timestamp)}` : "尚無掃描紀錄 · 排程未確認"}</span>
        <span className="flex items-center gap-1.5"><Cloud className="w-3 h-3" /> {inv?.lastSync ? `最近探索 · ${relTime(inv.lastSync)}` : "尚無探索紀錄"}</span>
        <span className="flex items-center gap-1.5 text-ink-3"><Lock className="w-3 h-3" /> 私人資料，僅從本機即時讀取，不隨程式發行</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile icon={Globe} label="已掃描目標" value={scan?.targetsScanned ?? "—"} dim="freedom" />
        <StatTile icon={Shield} label="已整理" value={inv?.curated ?? "—"} dim="ok" />
        <StatTile icon={Radar} label="已發現網站" value={inv?.dnsHosts ?? "—"} dim="creative" />
        <StatTile icon={Boxes} label="工作單元來源" value={inv?.workerOrigins ?? "—"} dim="rhythms" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile icon={ShieldX} label="嚴重" value={hasScan ? fc?.critical ?? "—" : "—"} dim={!hasScan ? "neutral" : fc?.critical ? "err" : "ok"} />
        <StatTile icon={ShieldAlert} label="高" value={hasScan ? fc?.high ?? "—" : "—"} dim={!hasScan ? "neutral" : fc?.high ? "warn" : "ok"} />
        <StatTile icon={Eye} label="中" value={hasScan ? fc?.medium ?? "—" : "—"} dim="freedom" />
        <StatTile icon={Info} label="低" value={hasScan ? fc?.low ?? "—" : "—"} dim="rhythms" />
      </div>

      {critHigh.length > 0 ? (
        <Panel className="p-2 mb-3">
          {critHigh.map((f, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 text-xs border-b last:border-b-0 border-[var(--hairline)]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-err" />
              <span className="mono text-ink-1">{f.target}</span>
              <span className="text-ink-3">{displayLabel(f.category)}/{f.check}</span>
              <span className="text-ink-2 truncate">{f.evidence}</span>
            </div>
          ))}
        </Panel>
      ) : clean ? (
        <p className="text-xs mb-3 flex items-center gap-1.5 text-ink-2">
          <ShieldCheck className="w-3.5 h-3.5 text-ok" /> 目前掃描範圍沒有嚴重或高風險項目。
        </p>
      ) : (
        <p className="text-xs mb-3 text-ink-3">{hasScan ? "掃描結果的詳細項目尚未提供。" : "掃描狀態未知，尚無可判讀的結果。"}</p>
      )}

      <button
        onClick={() => setShowTargets((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink-1 mb-2"
      >
        {showTargets ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        自動發現的目標（{inv?.targets?.length ?? "—"}）
      </button>
      {showTargets && (
        <Panel className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
            {(inv?.targets ?? []).map((t) => (
              <div key={t.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="mono truncate text-ink-2">{t.name}</span>
                <TypePill type={t.type} multiTenant={t.multiTenant} />
              </div>
            ))}
          </div>
        </Panel>
      )}
      <p className="text-xs mt-3 ml-1 text-ink-3">
        準則： <code className="text-ink-2">LIFEOS/DOCUMENTATION/Security/README.md</code>
      </p>
    </div>
  );
}

function RiskRegisterSection({ tm }: { tm: PrivateData<ThreatModelData> }) {
  if (tm === "unavailable") {
    return (
      <div>
        <SectionHeader icon={FileWarning} title="風險清單" accentClass="text-warn" />
        <NotConfigured what="風險清單由執行 Pulse 的電腦上的 ThreatModel 技能提供。" />
      </div>
    );
  }
  if (!tm) {
    return (
      <div>
        <SectionHeader icon={FileWarning} title="風險清單" accentClass="text-warn" />
        <Panel><p className="text-xs text-center py-6 text-ink-3">正在載入風險清單…</p></Panel>
      </div>
    );
  }
  if (!tm.available) {
    return (
      <div>
        <SectionHeader icon={FileWarning} title="風險清單" accentClass="text-warn" />
        <Panel>
          <p className="text-xs text-center py-6 text-ink-3">
            尚無風險清單，請執行 <code className="mono text-ink-2">bun ~/.codex/skills/ThreatModel/Tools/RiskRegister.ts init</code>
          </p>
        </Panel>
      </div>
    );
  }
  const bl = tm.byLevel ?? {};
  const risks = (tm.risks ?? []).filter(r => r.status !== "closed");
  const gradeDim = GRADE_DIM[tm.grade ?? "green"] ?? "neutral";
  const gradeLabel = { red: "紅色", orange: "橙色", green: "綠色" }[tm.grade ?? "green"];

  return (
    <div>
      <SectionHeader icon={FileWarning} title="風險清單" count={tm.open ?? 0} accentClass="text-warn" />
      <p className="text-xs mb-3 flex items-center gap-1.5 text-ink-2">
        <Info className="w-3 h-3" /> 防禦威脅模型的風險，以可能性乘以影響程度評分。由 ThreatModel 技能管理，資料為私人內容。
      </p>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
        <StatTile icon={Shield} label="評級" value={gradeLabel ?? "—"} dim={gradeDim} />
        <StatTile icon={ShieldX} label="嚴重" value={bl.Critical ?? 0} dim={bl.Critical ? "err" : "ok"} />
        <StatTile icon={ShieldAlert} label="高" value={bl.High ?? 0} dim={bl.High ? "warn" : "ok"} />
        <StatTile icon={Eye} label="中" value={bl.Medium ?? 0} dim="freedom" />
        <StatTile icon={Info} label="低" value={bl.Low ?? 0} dim="rhythms" />
        <StatTile icon={Clock} label="逾期" value={tm.overdue_review ?? 0} dim={tm.overdue_review ? "warn" : "ok"} />
      </div>
      {risks.length === 0 ? (
        <Panel><p className="text-xs text-center py-6 text-ink-3">沒有未結案風險。</p></Panel>
      ) : (
        <Panel className="p-0 overflow-hidden">
          {risks.map((r, i) => (
            <div key={r.id} className={`flex items-start gap-3 p-3 ${i > 0 ? "border-t border-line" : ""}`}>
              <Pill dim={LEVEL_DIM[r.level] ?? "neutral"} title={`分數 ${r.score}＝可能性 ${r.likelihood}×影響 ${r.impact}`}>
                {displayLabel(r.level)} · {r.score}
              </Pill>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="mono text-xs text-ink-3">{r.id}</span>
                  <span className="text-sm text-ink-1">{r.title}</span>
                  {r.overdue && <Pill dim="warn" title="複查已逾期"><Clock className="w-3 h-3 inline" /> 逾期</Pill>}
                </div>
                <p className="text-xs mt-1 text-ink-3">{r.threat}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {r.data_classes.map(dc => <Pill key={dc} dim="creative">{displayLabel(dc)}</Pill>)}
                  {r.assets.slice(0, 3).map(a => <span key={a} className="mono text-[10px] text-ink-3">{a}</span>)}
                  {r.assets.length > 3 && <span className="text-[10px] text-ink-3">+{r.assets.length - 3}</span>}
                </div>
              </div>
              <div className="text-right shrink-0 text-[10px] text-ink-3">
                <div>{r.owner || "—"}</div>
                <div>複查 {r.review_by || "—"}</div>
              </div>
            </div>
          ))}
        </Panel>
      )}
      <p className="text-xs mt-3 ml-1 text-ink-3">
        技能： <code className="text-ink-2">skills/ThreatModel</code> · 資料： <code className="text-ink-2">LIFEOS/USER/SECURITY/THREATMODEL</code>
      </p>
    </div>
  );
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [hookDetails, setHookDetails] = useState<Record<string, HookDetail>>({});
  const [surface, setSurface] = useState<PrivateData<AttackSurfaceData>>(null);
  const [threatModel, setThreatModel] = useState<PrivateData<ThreatModelData>>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchData = useCallback(() => {
    fetch("/api/security")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setFailed(true); setLoading(false); });
    fetch("/api/security/hooks-detail").then(r => r.json()).then(setHookDetails).catch(() => {});
    fetchPrivate<AttackSurfaceData>("/api/security/attack-surface", setSurface);
    fetchPrivate<ThreatModelData>("/api/threatmodel", setThreatModel);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-ink-2">
        <Shield className="w-6 h-6 animate-pulse mr-2 text-dim-freedom" /> 正在載入安全模型…
      </div>
    );
  }
  if (failed || !data) {
    return (
      <div className="flex items-center justify-center h-96 text-err">
        <ShieldAlert className="w-6 h-6 mr-2" /> 無法載入安全資料
      </div>
    );
  }

  const denyGroups = groupDenyList(data.denyList ?? []);
  const hooks = data.hooks ?? [];
  const activeHooks = hooks.filter(h => h.status === "active").length;
  const missingHooks = hooks.length - activeHooks;

  return (
    <PageShell>
      <PageHeader
        icon={Shield}
        title="安全"
        subtitle="Claude Code 參考架構：核心安全規則、原生拒絕清單與安全分類事件處理。此處呈現設定資料，不代表這些防護已在 Codex 啟用。"
        actions={<span className="text-xs mono text-ink-3">{data.model}</span>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={ShieldCheck} label="防護層" value={3} dim="ok" />
        <StatTile icon={ShieldX} label="拒絕規則" value={data.denyList?.length ?? 0} dim="err" />
        <StatTile icon={Server} label="啟用的事件處理" value={activeHooks} dim="freedom" />
        {missingHooks > 0 && <StatTile icon={ShieldAlert} label="缺少的事件處理" value={missingHooks} dim="warn" />}
      </div>

      {/* Attack Surface Monitoring (private, runtime-only) */}
      <AttackSurfaceSection surface={surface} />

      {/* Risk Register (private — ThreatModel skill) */}
      <RiskRegisterSection tm={threatModel} />

      {/* Three-layer model */}
      <div>
        <SectionHeader icon={Shield} title="安全機制如何運作" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <LayerCard
            n={1} icon={BookIcon} title="核心規則" dim="freedom"
            where="LIFEOS_SYSTEM_PROMPT.md"
            body="系統提示詞中的安全協定：外部內容是唯讀資料，不能當作指令。這是核心防護，在背景壓縮後仍有效，並約束所有模式與代理。"
          />
          <LayerCard
            n={2} icon={ShieldX} title="Claude Code 原生拒絕清單" dim="err"
            where="settings.json · permissions.deny"
            body="此處呈現 Claude Code 的拒絕規則；符合規則的呼叫由 Claude Code 宿主攔截。其設定位於 Claude Code 的 settings.json。"
          />
          <LayerCard
            n={3} icon={ShieldAlert} title="安全事件處理" dim="warn"
            where="hooks/Safety.hook.ts"
            body="一個整合的事件處理，對應兩種事件。PostToolUse 在網頁查詢結果送入模型前標示為資料；PermissionRequest 依結構分類傳出的工具呼叫。此機制提供建議，強制約束由核心規則負責。"
          />
        </div>
        <p className="text-xs mb-2 ml-1 text-ink-2">
          完整模型： <code className="text-ink-2">LIFEOS/DOCUMENTATION/Security/README.md</code>
        </p>
      </div>

      {/* Deny List */}
      <div>
        <SectionHeader icon={ShieldX} title="Claude Code 原生拒絕清單" count={data.denyList?.length ?? 0} accentClass="text-err" />
        <p className="text-xs mb-3 flex items-center gap-1.5 text-ink-2">
          <Info className="w-3 h-3" /> 由 Claude Code 宿主強制執行。此處僅供閱讀；請編輯 Claude Code 的 <code className="mono text-ink-2">settings.json</code> <code className="mono text-ink-2">permissions.deny</code> 以變更。
        </p>
        {denyGroups.length === 0 ? (
          <Panel>
            <p className="text-xs text-center py-6 text-ink-3">拒絕清單為空。</p>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {denyGroups.map((g) => <DenyGroupCard key={g.tool} group={g} />)}
          </div>
        )}
      </div>

      {/* Hooks */}
      <div>
        <SectionHeader icon={Server} title="安全事件處理" count={hooks.length} />
        <p className="text-xs mb-3 flex items-center gap-1.5 text-ink-2">
          <Info className="w-3 h-3" /> 點選事件處理可查看用途及是否能攔截呼叫。綠色代表已登記且檔案存在。
        </p>
        {hooks.length === 0 ? (
          <Panel>
            <p className="text-xs text-center py-6 text-ink-3">尚未登記安全事件處理。</p>
          </Panel>
        ) : (
          <Panel className="p-2">
            {hooks.map((hook, i) => (
              <HookDetailRow key={i} hook={hook} detail={hookDetails[hook.command]} />
            ))}
          </Panel>
        )}
        <p className="text-xs mt-3 ml-1 text-ink-3">
          Claude Code 事件處理設定儲存於 <code className="text-ink-2">~/.claude/settings.json</code>.
        </p>
      </div>
    </PageShell>
  );
}
