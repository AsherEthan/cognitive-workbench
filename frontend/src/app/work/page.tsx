"use client";
import { displayLabel } from "@/lib/zh-TW";
import { useEffect, useRef, useState } from "react";
import { Archive, Briefcase, Compass, ExternalLink, GitBranch, Cpu, Kanban, RefreshCw, Rocket, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, List as ListIcon, Inbox, type LucideIcon } from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import ProjectsBoard, { type ProjectGroup } from "@/components/ProjectsBoard";
import { PageShell, PageHeader, Panel, TabBar, Pill, EmptyState } from "@/components/ui/chrome";
import type { Dim } from "@/components/ui/chrome";

interface AlgorithmSession {
  slug: string;
  task: string;
  phase: string;
  progress?: string;
  effort?: string;
}

interface WorkData {
  projects?: Array<{ name: string; path: string; url: string }>;
  currentFocus?: string;
  currentProject?: string;
  activeWorkstreams?: string;
  algorithmSessions?: AlgorithmSession[];
}

interface KanbanIssue {
  number: number;
  title: string;
  url: string;
  state: string;
  labels: string[];
  assignees: string[];
  ageHours: number;
  column: string;
  updatedAt: string;
  source?: string;
  principal_stated_goal?: string;
}

interface KanbanData {
  setup_required?: boolean;
  reason?: string;
  instructions?: string[];
  config?: { repo: string; columns: string[]; poll_interval_seconds: number };
  columns?: Record<string, KanbanIssue[]>;
  items?: KanbanIssue[];
  lastFetch?: string | null;
  stale?: boolean;
  stale_reason?: string;
}

// Algorithm phase hues use the v8 dimension palette.
const PHASE_COLOR: Record<string, string> = {
  OBSERVE: "#97bdd2",
  THINK: "#97bdd2",
  PLAN: "#b8b2cf",
  BUILD: "#e8aaa0",
  EXECUTE: "#d9c49e",
  VERIFY: "#8ec7bc",
  LEARN: "#b5e5d5",
  COMPLETE: "#b5e5d5",
  DEFERRED: "#a3b5b8",
};

// Effort pill accents use green for easy, gold for heavy, coral for heaviest.
const EFFORT_COLOR: Record<string, string> = {
  fast: "#b5e5d5",
  standard: "#b5e5d5",
  advanced: "#d9c49e",
  deep: "#d9c49e",
  extended: "#d9c49e",
  comprehensive: "#e8aaa0",
};

function progressPct(p?: string): number {
  if (!p) return 0;
  const m = p.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return 0;
  const [, done, total] = m;
  const d = parseInt(done, 10);
  const t = parseInt(total, 10);
  return t > 0 ? Math.round((d / t) * 100) : 0;
}

function Banner({
  focus,
  current,
  streams,
  sessionCount,
  projectCount,
}: {
  focus?: string;
  current?: string;
  streams?: string;
  sessionCount: number;
  projectCount: number;
}) {
  return (
    <Panel className="border-l-[3px] [border-left-color:var(--creative)]">
      <div className="flex items-start gap-6 flex-wrap">
        <Briefcase className="w-10 h-10 shrink-0" style={{ color: "var(--creative)" }} />
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] uppercase tracking-widest mb-2 text-ink-3"
          >
            目前重點
          </div>
          {focus ? (
            <p className="text-2xl lg:text-3xl font-medium leading-snug text-ink-1" data-sensitive="strong">
              {focus}
            </p>
          ) : (
            <p className="text-xl italic text-ink-2">尚未設定目前重點。</p>
          )}
          {current && (
            <p className="text-sm mt-3 text-ink-2" data-sensitive>
              <span>主要專案：</span> {current}
            </p>
          )}
          {streams && (
            <p className="text-xs mt-2 text-ink-2" data-sensitive>
              工作方向： {streams}
            </p>
          )}
          <div className="mt-4 flex gap-2 flex-wrap">
            <Pill dim="creative">{sessionCount} 個進行中的工作階段</Pill>
            <Pill dim="money">{projectCount} 個專案</Pill>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AlgorithmSessions({ sessions }: { sessions?: AlgorithmSession[] }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-widest text-ink-3 mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4" style={{ color: "var(--freedom)" }} /> 工作階段
        <span className="text-xs text-ink-3 font-normal">({sessions.length})</span>
      </h2>
      <Panel className="p-0">
        <div>
          {sessions.slice(0, 10).map((s, i) => {
            const phase = (s.phase || "unknown").toUpperCase();
            const phaseColor = PHASE_COLOR[phase] ?? "var(--ink-2)";
            const pct = progressPct(s.progress);
            const effort = s.effort?.toLowerCase();
            const effortColor = effort ? EFFORT_COLOR[effort] ?? "var(--ink-2)" : null;
            return (
              <div
                key={s.slug}
                className={`flex items-center gap-4 px-5 py-4 ${i === 0 ? "" : "border-t border-line-1"}`}
                data-sensitive
              >
                <span
                  className="pill shrink-0"
                  style={{
                    width: 90,
                    textAlign: "center",
                    color: phaseColor,
                    borderColor: phaseColor,
                  }}
                >
                  {displayLabel(phase)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate text-ink-1" title={s.task} data-sensitive>
                    {s.task}
                  </div>
                  <div className="text-[12px] font-mono mt-0.5 truncate text-ink-3">{s.slug}</div>
                </div>
                <div className="w-28 shrink-0">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: pct + "%" }} />
                  </div>
                  <div className="text-[12px] text-right tabular-nums mt-1 text-ink-3">{s.progress}</div>
                </div>
                {s.effort && effortColor && (
                  <span
                    className="pill shrink-0"
                    style={{ color: effortColor, borderColor: effortColor }}
                  >
                    {displayLabel(s.effort)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

// ── Work items (GitHub Issues, polled from /api/work) ──────────────────────
// One fetch lives in WorkItemsPanel and feeds BOTH the List and Kanban views —
// they are two renderings of one dataset, never two fetches.

const COLUMN_COLOR: Record<string, string> = {
  Inbox: "#a3b5b8",
  Queued: "#b8b2cf",
  Ready: "#97bdd2",
  "In-Progress": "#d9c49e",
  Blocked: "#e8aaa0",
  "In-Review": "#A855F7",
  Complete: "#b5e5d5",
  Done: "#b5e5d5",
};

// Canonical kanban pipeline order — Status sort uses this, NOT alphabetical.
const STATUS_ORDER = ["Inbox", "Queued", "Ready", "In-Progress", "Blocked", "In-Review", "Complete", "Done"];

function statusRank(col: string): number {
  const i = STATUS_ORDER.indexOf(col);
  return i === -1 ? 99 : i;
}

function ageStr(h: number): string {
  if (h < 1) return "剛剛";
  if (h < 24) return h + " 小時";
  const d = Math.floor(h / 24);
  if (d < 7) return d + " 天";
  return Math.floor(d / 7) + " 週";
}

function cleanTitle(t: string): string {
  return t
    .replace(/\s*\[slug:[^\]]+\]\s*$/, "")
    .replace(/\s*\[goal:[^\]]+\]\s*$/, "")
    .trim();
}

// Priority: parse "Priority:P0".."Priority:P3" or bare "P0-…"; no priority → 4 (sinks below P3).
function priorityRank(labels: string[]): number {
  for (const l of labels) {
    const m = l.match(/^Priority:P([0-3])$/i) || l.match(/^P([0-3])\b/i);
    if (m) return parseInt(m[1], 10);
  }
  return 4;
}

function priorityLabel(labels: string[]): string | null {
  const r = priorityRank(labels);
  return r < 4 ? "P" + r : null;
}

const PRIORITY_COLOR: Record<string, string> = {
  P0: "#e8aaa0",
  P1: "#d9c49e",
  P2: "#E5C07B",
  P3: "#6B7280",
};

function propValue(labels: string[]): string | null {
  for (const l of labels) {
    const m = l.match(/^Property:(.+)$/i);
    if (m) return m[1].toLowerCase();
  }
  for (const l of labels) {
    const lc = l.toLowerCase();
    if (["newsletter", "website", "youtube", "podcast", "community", "consulting", "open-source", "internal", "pai", "life"].includes(lc)) return lc;
  }
  return null;
}

const TYPE_COLOR: Record<string, string> = {
  feature: "#97bdd2",
  problem: "#e8aaa0",
  research: "#A855F7",
  project: "#d9c49e",
  decision: "#97bdd2",
  reminder: "#E5C07B",
  "metric-alert": "#FB923C",
  queue: "#6B7280",
};

// The canonical Type:* on an issue. Prefers a real type over the generic
// Type:queue when an issue still carries both.
function typeValue(labels: string[]): string | null {
  const types = labels
    .map((l) => { const m = l.match(/^Type:(.+)$/i); return m ? m[1].toLowerCase() : null; })
    .filter(Boolean) as string[];
  if (types.length === 0) return null;
  return types.find((t) => t !== "queue") ?? types[0];
}

function relativeUpdated(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return m + " 分鐘";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " 小時";
  const d = Math.floor(h / 24);
  if (d < 7) return d + " 天";
  return Math.floor(d / 7) + " 週";
}

// Internal sync-marker labels hidden from Kanban chips. A set (not a single
// literal) so a marker rename can't leak the chip onto every card — `pai-sync`
// is the legacy pre-rebrand name still emitted today (public issue #1497).
const HIDDEN_LABELS = new Set(["pai-sync", "lifeos-sync"]);

function workTagLabel(raw: string): string {
  const match = raw.match(/^(Type|Status|Priority|Property|Agent|Source):(.+)$/i);
  if (!match) return displayLabel(raw);
  const prefix: Record<string, string> = { type: "類型", status: "狀態", priority: "優先度", property: "所屬領域", agent: "代理", source: "來源" };
  return `${prefix[match[1].toLowerCase()]}：${displayLabel(match[2])}`;
}

// 下列英文僅用來辨識 API 的原始提示；畫面統一呈現中文。
function setupInstruction(text: string): string {
  if (text.startsWith("Bind a PRIVATE GitHub repo")) return "將私人 GitHub 儲存庫連接到工作追蹤，並在 ~/.config/LIFEOS/USER/WORK/work_repo.json 保存設定。系統會重新確認儲存庫確實為私人，通過後才能使用。";
  if (text.startsWith("Ensure the repo has these labels:")) return "依工作追蹤規格加入類型、狀態、優先度、所屬領域及代理標籤。原有標籤識別碼須保留，以供系統辨識。";
  if (text.startsWith("Restart Pulse")) return "設定完成後，讓工作台重新讀取 work_repo.json。";
  if (text.startsWith("Run an Algorithm session")) return "開始一個工作階段後，已設定的工作擷取功能才會建立對應項目。";
  return text;
}

function staleDescription(text?: string): string {
  if (text === "no cache yet — first poll pending") return "尚無快取，正在等待首次資料。";
  if (text === "gh fetch stale (offline or rate-limited?)") return "資料更新可能受連線或服務流量限制影響。";
  return text ? displayLabel(text) : "暫時無法取得最新資料，目前顯示快取內容";
}


function KanbanCard({ issue }: { issue: KanbanIssue }) {
  const labels = (issue.labels || []).filter((l) => !HIDDEN_LABELS.has(l));
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noreferrer"
      className="block no-underline bg-surface-2 border border-line-2 rounded-lg px-3 py-2.5 mb-2 transition-colors duration-200 hover:bg-surface-3 hover:border-line-3"
    >
      <div className="mono text-[12px] text-ink-3 mb-1">
        #{issue.number}
      </div>
      <div className="text-[13px] font-medium leading-snug mb-1.5 text-ink-1" title={issue.title} data-sensitive>
        {cleanTitle(issue.title)}
      </div>
      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {labels.slice(0, 4).map((l) => (
            <span key={l} className="pill" style={{ fontSize: 12, padding: "1px 6px" }}>{workTagLabel(l)}</span>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center mt-1.5 text-[12px] text-ink-3">
        <span style={{ color: "var(--freedom)" }}>
          {issue.assignees && issue.assignees.length > 0 ? "@" + issue.assignees.join(" @") : ""}
        </span>
        <span>{ageStr(issue.ageHours)}</span>
      </div>
    </a>
  );
}

// ── Kanban view (presentational — data comes from the panel) ───────────────

function KanbanView({ data }: { data: KanbanData }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const COLUMN_WIDTH = 220;
  const COLUMN_GAP = 12;

  const scrollByCol = (dir: -1 | 1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * (COLUMN_WIDTH + COLUMN_GAP), behavior: "smooth" });
  };

  const cols = data.config?.columns ?? [];
  const grouped = data.columns ?? {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
        <button
          onClick={() => scrollByCol(-1)}
          className="pill"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "2px 6px" }}
          aria-label="向左捲動欄位"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scrollByCol(1)}
          className="pill"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "2px 6px" }}
          aria-label="向右捲動欄位"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="kanban-scroll"
        style={{
          display: "flex",
          gap: COLUMN_GAP,
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: 16,
          scrollSnapType: "x proximity",
          scrollBehavior: "smooth",
        }}
      >
        {cols.map((col) => {
          const items = grouped[col] || [];
          const color = COLUMN_COLOR[col] ?? "var(--ink-2)";
          return (
            <div
              key={displayLabel(col)}
              className="bg-surface-2 border border-line-2 rounded-xl"
              style={{
                padding: 0,
                borderLeft: `3px solid ${color}`,
                display: "flex",
                flexDirection: "column",
                width: 220,
                flex: "0 0 220px",
                maxHeight: "70vh",
                scrollSnapAlign: "start",
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line-1">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-1">
                  {displayLabel(col)}
                </span>
                <span className="text-[12px] text-ink-3 ml-auto">{items.length}</span>
              </div>
              <div style={{ padding: 8, minHeight: 80, overflowY: "auto", flex: 1 }}>
                {items.length === 0 ? (
                  <div className="text-[12px] italic text-center text-ink-3 py-4">
                    暫無項目
                  </div>
                ) : (
                  items.map((issue) => <KanbanCard key={issue.number} issue={issue} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List view (sortable flat list — the default tab) ───────────────────────

type SortKey = "updated" | "priority" | "status" | "age" | "title" | "number";
type SortDir = 1 | -1;

// First-click direction per key — one click always does the obvious thing.
const SORT_FIRST_DIR: Record<SortKey, SortDir> = {
  updated: -1, // newest first
  priority: 1, // P0 first
  status: 1, // pipeline order Inbox→Complete
  age: -1, // oldest first
  title: 1, // A→Z
  number: -1, // highest # first
};

function compareBy(a: KanbanIssue, b: KanbanIssue, key: SortKey): number {
  switch (key) {
    case "updated": return (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
    case "priority": return priorityRank(a.labels || []) - priorityRank(b.labels || []);
    case "status": return statusRank(a.column) - statusRank(b.column);
    case "age": return (a.ageHours || 0) - (b.ageHours || 0);
    case "title": return cleanTitle(a.title).localeCompare(cleanTitle(b.title), undefined, { sensitivity: "base", numeric: true });
    case "number": return a.number - b.number;
  }
}

const SORT_STORAGE_KEY = "pulse.work.list.sort";

function SortHeader({
  label,
  col,
  active,
  dir,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={() => onSort(col)}
      className={active ? "" : "text-ink-3"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: "none",
        border: "none",
        cursor: "pointer",
        font: "inherit",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontWeight: 600,
        color: active ? "var(--accent-soft)" : undefined,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        width: "100%",
        padding: 0,
      }}
    >
      {label}
      {active ? (
        dir === -1 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3" style={{ opacity: 0.25 }} />
      )}
    </button>
  );
}

const LIST_GRID = "16px 28px 48px minmax(190px, 1fr) 96px 104px 96px 52px 66px 20px";

function WorkList({ data }: { data: KanbanData }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Restore persisted sort once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SORT_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p.key === "string") setSortKey(p.key);
        if (p && (p.dir === 1 || p.dir === -1)) setSortDir(p.dir);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => {
        const nd = (d === 1 ? -1 : 1) as SortDir;
        try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: k, dir: nd })); } catch { /* ignore */ }
        return nd;
      });
    } else {
      const nd = SORT_FIRST_DIR[k];
      setSortKey(k);
      setSortDir(nd);
      try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key: k, dir: nd })); } catch { /* ignore */ }
    }
  };

  const allItems = data.items ?? [];
  const typesPresent = Array.from(
    new Set(allItems.map((i) => typeValue(i.labels || [])).filter(Boolean) as string[]),
  ).sort();
  const typeCount = (t: string) => allItems.filter((i) => typeValue(i.labels || []) === t).length;
  const items = typeFilter === "all" ? allItems : allItems.filter((i) => typeValue(i.labels || []) === typeFilter);
  const sorted = items.slice().sort((a, b) => {
    const c = compareBy(a, b, sortKey) * sortDir;
    if (c !== 0) return c;
    return a.number - b.number; // stable tiebreak so re-sorts don't jitter
  });

  if (allItems.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Inbox} title="目前沒有待處理的工作。" />
      </Panel>
    );
  }

  return (
    <Panel className="p-0 overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-line-1 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-3">類型</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-surface-1 text-ink-1 border border-line-2 rounded px-2 py-[3px] text-[12px] cursor-pointer"
        >
          <option value="all">全部（{allItems.length}）</option>
          {typesPresent.map((t) => (
            <option key={t} value={t}>{displayLabel(t)}（{typeCount(t)}）</option>
          ))}
        </select>
        {typeFilter !== "all" && (
          <button
            onClick={() => setTypeFilter("all")}
            className="pill"
            style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer" }}
          >
            清除
          </button>
        )}
        <span className="flex-1" />
        <span className="text-[11px] mono text-ink-3">{sorted.length} 筆已顯示</span>
      </div>
      {/* Header row */}
      <div
        className="grid items-center px-3.5 py-2.5 border-b border-line-2 sticky top-0 z-[1] bg-surface-1"
        style={{ gridTemplateColumns: LIST_GRID, gap: 10 }}
      >
        <span />
        <SortHeader label="優先" col="priority" active={sortKey === "priority"} dir={sortDir} onSort={onSort} />
        <SortHeader label="#" col="number" active={sortKey === "number"} dir={sortDir} onSort={onSort} align="right" />
        <SortHeader label="標題" col="title" active={sortKey === "title"} dir={sortDir} onSort={onSort} />
        <span className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-3">類型</span>
        <SortHeader label="狀態" col="status" active={sortKey === "status"} dir={sortDir} onSort={onSort} />
        <span className="text-[11px] uppercase tracking-[0.05em] font-semibold text-ink-3">所屬領域</span>
        <SortHeader label="建立時間" col="age" active={sortKey === "age"} dir={sortDir} onSort={onSort} align="right" />
        <SortHeader label="更新於" col="updated" active={sortKey === "updated"} dir={sortDir} onSort={onSort} align="right" />
        <span />
      </div>

      {/* Rows */}
      <div>
        {sorted.length === 0 && (
          <div className="text-ink-3 text-center text-[12px] italic px-4 py-6">
            沒有 {displayLabel(typeFilter)} 項目符合篩選條件。
          </div>
        )}
        {sorted.map((it) => {
          const isClosed = it.state === "CLOSED";
          const color = COLUMN_COLOR[it.column] ?? "#a3b5b8";
          const prio = priorityLabel(it.labels || []);
          const prop = propValue(it.labels || []);
          const tv = typeValue(it.labels || []);
          const isExpanded = expanded === it.number;
          const hasGoal = !!it.principal_stated_goal;
          return (
            <div key={it.number}>
              <div
                onClick={() => setExpanded(isExpanded ? null : it.number)}
                style={{
                  display: "grid",
                  gridTemplateColumns: LIST_GRID,
                  gap: 10,
                  alignItems: "center",
                  padding: "7px 14px",
                  borderBottom: "1px solid var(--line-1)",
                  borderLeft: hasGoal ? "2px solid var(--money)" : "2px solid transparent",
                  cursor: "pointer",
                  opacity: isClosed ? 0.55 : 1,
                  background: isExpanded ? "var(--surface-3)" : undefined,
                }}
                className="work-row"
              >
                {/* status dot */}
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: isClosed ? "transparent" : color,
                    border: isClosed ? `2px solid ${color}` : "none",
                    boxSizing: "border-box",
                  }}
                />
                {/* priority square */}
                <span style={{ display: "inline-flex", justifyContent: "center" }}>
                  {prio ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 700,
                        color: PRIORITY_COLOR[prio],
                      }}
                    >
                      {prio}
                    </span>
                  ) : null}
                </span>
                {/* number */}
                <span className="text-ink-3" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, textAlign: "right" }}>
                  #{it.number}
                </span>
                {/* title */}
                <span className="text-ink-1" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }} title={cleanTitle(it.title)} data-sensitive>
                  {cleanTitle(it.title)}
                </span>
                {/* type pill */}
                <span style={{ display: "flex", minWidth: 0 }}>
                  {tv ? (
                    <span
                      className="pill"
                      style={{ fontSize: 10, padding: "1px 7px", color: TYPE_COLOR[tv] ?? "#a3b5b8", borderColor: `${TYPE_COLOR[tv] ?? "#a3b5b8"}55`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {displayLabel(tv)}
                    </span>
                  ) : null}
                </span>
                {/* status pill */}
                <span
                  className="pill"
                  style={{ fontSize: 11, padding: "1px 8px", color, borderColor: `${color}55`, justifySelf: "start" }}
                >
                  {displayLabel(it.column)}
                </span>
                {/* property */}
                <span className="text-ink-3" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayLabel(prop)}
                </span>
                {/* age */}
                <span className="text-ink-3" style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", textAlign: "right" }}>
                  {ageStr(it.ageHours)}
                </span>
                {/* updated */}
                <span className="text-ink-3" style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", textAlign: "right" }}>
                  {relativeUpdated(it.updatedAt)}
                </span>
                {/* open in github */}
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-ink-3 hover:text-ink-1 transition-colors"
                  style={{ display: "inline-flex", justifyContent: "center" }}
                  aria-label="在 GitHub 開啟"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Expanded detail — leads with the principal-stated goal (the "why"). */}
              {isExpanded && (
                <div className="border-b border-line-1 bg-surface-1" style={{ padding: "10px 16px 14px 16px" }}>
                  {it.principal_stated_goal && (
                    <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--freedom)", marginBottom: 8 }} data-sensitive>
                      🎯 目的： {it.principal_stated_goal}
                    </p>
                  )}
                  <p className="text-ink-1" style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.4 }} data-sensitive>{cleanTitle(it.title)}</p>
                  {(it.labels || []).filter((l) => !HIDDEN_LABELS.has(l)).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(it.labels || []).filter((l) => !HIDDEN_LABELS.has(l)).map((l) => (
                        <span key={l} className="pill" style={{ fontSize: 11, padding: "1px 6px" }}>{workTagLabel(l)}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-ink-3" style={{ fontSize: 11, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <span>狀態： {displayLabel(it.state)}</span>
                    {it.assignees && it.assignees.length > 0 && <span>@{it.assignees.join(" @")}</span>}
                    {it.source && <span>來源： {displayLabel(it.source)}</span>}
                    <span>距今 {ageStr(it.ageHours)}</span>
                    <a href={it.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-soft)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <ExternalLink className="w-3 h-3" /> 在 GitHub 開啟
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Work items panel — owns the single /api/work fetch + List/Kanban tabs ──

function WorkItemsPanel() {
  const [data, setData] = useState<KanbanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"list" | "kanban">("list");

  const load = async () => {
    try {
      const r = await fetch("/api/work", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setData(await r.json());
      setError(null);
    } catch (e) {
      setError("連線未完成，請檢查本機服務後再試。");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/work/refresh", { method: "POST" });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-ink-3 mb-4 flex items-center gap-2">
          <Kanban className="w-4 h-4" style={{ color: "var(--freedom)" }} /> 任務與工作
        </h2>
        <Panel className="border-l-[3px] [border-left-color:var(--err)]">
          <p className="text-sm text-err">工作資料讀取失敗 · {error}</p>
        </Panel>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-ink-3 mb-4 flex items-center gap-2">
          <Kanban className="w-4 h-4" style={{ color: "var(--freedom)" }} /> 任務與工作
        </h2>
        <div className="text-sm text-ink-2">正在讀取工作項目…</div>
      </section>
    );
  }

  if (data.setup_required) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-widest text-ink-3 mb-4 flex items-center gap-2">
          <Kanban className="w-4 h-4" style={{ color: "var(--freedom)" }} /> 任務與工作 · 尚待設定
        </h2>
        <Panel className="border-l-[3px] [border-left-color:var(--warn)]">
          <p className="text-sm text-ink-2">工作追蹤來源尚未完成設定。</p>
          <ol className="text-sm mt-3 ml-5 space-y-1 text-ink-1" style={{ listStyle: "decimal" }}>
            {(data.instructions || []).map((s, i) => <li key={i}>{setupInstruction(s)}</li>)}
          </ol>
        </Panel>
      </section>
    );
  }

  const total = data.items?.length ?? 0;

  const meta = (
    <>
      <span className="text-xs text-ink-3 mono hidden sm:inline">
        {total} 個工作項目 · <span data-sensitive>{data.config?.repo}</span> · 更新間隔 {data.config?.poll_interval_seconds} 秒
        {data.lastFetch && ` · 最近更新 ${new Date(data.lastFetch).toLocaleTimeString("zh-TW", { timeZone: "Asia/Shanghai" })}`}
      </span>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="pill"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
      >
        <RefreshCw className="w-3 h-3" style={{ animation: refreshing ? "spin 1s linear infinite" : undefined }} />
        {refreshing ? "正在更新" : "重新整理"}
      </button>
    </>
  );

  return (
    <section>
      <TabBar<"list" | "kanban">
        className="mb-4"
        tabs={[
          { id: "list", label: "清單", icon: ListIcon },
          { id: "kanban", label: "看板", icon: Kanban },
        ]}
        active={tab}
        onChange={setTab}
        right={meta}
      />

      {data.stale && (
        <Panel className="border-l-[3px] [border-left-color:var(--warn)] mb-3 py-3">
          <p className="text-xs text-warn">
            ⚠ 資料尚未更新 · {staleDescription(data.stale_reason)}
          </p>
        </Panel>
      )}

      {tab === "list" ? <WorkList data={data} /> : <KanbanView data={data} />}
    </section>
  );
}

// ── Page-level area tabs ─────────────────────────────────────────────────────
// Board and Sessions are fixed areas; every group /api/projects returns becomes
// its own tab (live / telos / retired today — new source files appear with no
// code change here beyond an optional icon mapping).

type AreaTab = string;

/** Per-group tab chrome — generic fallback for groups this map doesn't know. */
const GROUP_TAB_META: Record<string, { icon: LucideIcon; dim: Dim }> = {
  live: { icon: Rocket, dim: "blue" },
  telos: { icon: Compass, dim: "money" },
  retired: { icon: Archive, dim: "neutral" },
};

export default function WorkPage() {
  const [data, setData] = useState<WorkData | null>(null);
  const [projectsData, setProjectsData] = useState<{ groups?: ProjectGroup[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AreaTab>("board");

  // ?tab= deep link (/work?tab=telos) — read after hydration; an initializer
  // that reads window.location diverges from the static prerender and loses.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t) setTab(t);
  }, []);

  useEffect(() => {
    fetch("/api/life/work")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch((e) => setError("連線未完成，請檢查本機服務後再試。"));
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setProjectsData)
      .catch(() => setProjectsData(null));
  }, []);

  // Keep ?tab= in the URL so tabs are linkable/refresh-stable without a nav.
  const selectTab = (t: AreaTab) => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === "board") u.searchParams.delete("tab");
    else u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u.toString());
  };

  if (error) {
    return (
      <PageShell>
        <PageHeader title="任務與工作" icon={Briefcase} subtitle="聚焦目前重點、工作項目、工作階段與專案。" />
        <Panel className="border-l-[3px] [border-left-color:var(--err)]">
          <h2 className="font-medium text-err">工作資料讀取失敗</h2>
          <p className="text-sm text-err">{error}</p>
        </Panel>
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell>
        <PageHeader title="任務與工作" icon={Briefcase} subtitle="聚焦目前重點、工作項目、工作階段與專案。" />
        <div className="text-sm text-ink-2">正在讀取工作資料…</div>
      </PageShell>
    );
  }

  const groups = projectsData?.groups ?? [];
  const sessionCount = data.algorithmSessions?.length ?? 0;
  const liveCount = groups.find((g) => g.key === "live")?.count ?? 0;
  const showEmptyGuide = sessionCount === 0 && liveCount === 0 && !data.currentFocus && !data.currentProject;
  const activeGroup = groups.find((g) => g.key === tab);

  return (
    <PageShell>
      <PageHeader title="任務與工作" icon={Briefcase} subtitle="聚焦目前重點、工作項目、工作階段與專案。" />
      {showEmptyGuide && (
        <EmptyStateGuide
          section="工作中心"
          description="整理進行中的任務、專案與協作。連接 GitHub Issues、Linear、ClickUp 或其他專案工具後，即可查看。"
          hideInterview
          daPromptExample="將工作中心連接到我的專案管理工具"
        />
      )}
      <Banner
        focus={data.currentFocus}
        current={data.currentProject}
        streams={data.activeWorkstreams}
        sessionCount={sessionCount}
        projectCount={liveCount}
      />

      <TabBar<AreaTab>
        active={activeGroup ? tab : tab === "sessions" ? "sessions" : "board"}
        onChange={selectTab}
        tabs={[
          { id: "board", label: "工作看板", icon: Kanban, dim: "blue" },
          { id: "sessions", label: "工作階段", icon: Cpu, dim: "creative", hint: sessionCount || undefined },
          ...groups.map((g) => ({
            id: g.key,
            label: displayLabel(g.label),
            icon: GROUP_TAB_META[g.key]?.icon ?? GitBranch,
            dim: GROUP_TAB_META[g.key]?.dim ?? ("blue" as Dim),
            hint: g.count,
          })),
        ]}
      />

      {activeGroup ? (
        <ProjectsBoard group={activeGroup} />
      ) : tab === "sessions" ? (
        <AlgorithmSessions sessions={data.algorithmSessions} />
      ) : (
        <>
          <WorkItemsPanel />
          <AlgorithmSessions sessions={data.algorithmSessions} />
        </>
      )}
    </PageShell>
  );
}
