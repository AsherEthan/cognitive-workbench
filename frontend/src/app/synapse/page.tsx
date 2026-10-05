"use client";

import { moduleLabel } from "@/lib/module-labels-zh";

import { displayLabel } from "@/lib/zh-TW";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wikiPageUrl } from "@/lib/wiki-links";
import {
  Share2,
  ArrowRight,
  Library,
  Table2,
  Bookmark,
  Database,
  GitBranch,
  CircleDot,
  Sparkles,
  Radio,
  BarChart3,
  BookOpen,
  FileText,
  CircleCheck,
  Film,
  MessageCircle,
  ScrollText,
  StickyNote,
  Wrench,
  FolderGit2,
  Mail,
  ChevronRight,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  Panel,
  StatTile,
  TabBar,
  Pill,
  dimStyle,
  type Dim,
  type TabSpec,
} from "@/components/ui/chrome";

/**
 * Synapse tab — the input router (capture → journal → grade → route), made visible.
 *
 * Three tabs, stream-first:
 *   STREAM (default) — unified reverse-chron feed of new content from ALL
 *     sources (ledger captures, Knowledge notes, X-bookmark issues), origin
 *     filters, 60s auto-refresh.
 *   STATS  — the live numbers: tiles, knowledge by type, ledger by source,
 *     spreadsheet paths.
 *   SYSTEM — the documentation: the five-stage loop, the input catalog, and
 *     how this page gets its numbers.
 *
 * Holds ZERO data: everything comes from /api/synapse (the Pulse synapse module),
 * which composes the ledger worker, KNOWLEDGE scan, KV bookmark count, and
 * local _X state server-side. No secrets ever reach this bundle.
 */

interface RecentCapture {
  id: string;
  source: string;
  score: number | null;
  title: string | null;
  url: string | null;
  author: string | null;
  content_kind: string;
  excerpt: string | null;
  grade_version: string | null;
  routed_actions: string[] | null;
  captured_at: string;
  status: string;
  note: { category: string; slug: string } | null;
}
interface RecentNote {
  title: string;
  category: string;
  slug: string;
  type: string;
  created: string;
}
interface RecentIssue {
  issue: number;
  url: string;
  created_at: string;
}
interface SynapseInput {
  n: number;
  name: string;
  trigger: string;
  component: string;
  status: "live" | "roadmap";
  ledger_count: number | null;
}
interface SheetPath { name: string; count: number | null; note: string }
interface SynapseData {
  generated_at: string;
  ledger: {
    total: number;
    by_source: Record<string, number>;
    by_status: Record<string, number>;
    captured: number;
    routed: number;
    recent: RecentCapture[];
  } | null;
  knowledge: {
    total: number;
    last7d: number;
    last30d: number;
    amber_promoted: number;
    by_type: Record<string, { total: number; last7d: number; last30d: number }>;
    recent: RecentNote[];
  } | null;
  bookmarks: {
    cloud_parsed: number | null;
    local_seen: number;
    issues_created: number;
    issues_skipped: number;
    recent_issues: RecentIssue[];
  };
  sheet: { paths: SheetPath[] };
  inputs: SynapseInput[];
  errors: Record<string, string> | null;
}

type TabId = "stream" | "stats" | "system";
const TABS: TabSpec<TabId>[] = [
  { id: "stream", label: "動態", icon: Radio, dim: "money" },
  { id: "stats", label: "統計", icon: BarChart3, dim: "money" },
  { id: "system", label: "系統", icon: BookOpen, dim: "money" },
];

type StreamKind = "capture" | "note" | "issue";
interface StreamItem {
  kind: StreamKind;
  id: string; // capture uuid, note slug, or issue url — unique key + expand anchor
  origin: string; // ledger source, "knowledge", or "x-bookmarks"
  title: string;
  href: string | null; // external link
  internal: string | null; // in-Pulse link (knowledge wiki)
  contentKind: string | null; // article|video|tweet|paper|note|tool|project|newsletter|other (captures only)
  author: string | null;
  excerpt: string | null;
  gradeVersion: string | null;
  actions: string[] | null; // routed_actions — where routing actually sent it
  status: string | null; // captured | graded | routed (captures only)
  score: number | null;
  routed: boolean;
  note: { category: string; slug: string } | null;
  ts: string;
}

const REFRESH_MS = 60_000;

function ago(ts: string | null | undefined): string {
  if (!ts) return "—";
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${displayLabel(s)} 秒前`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} 小時前` : `${Math.round(h / 24)} 天前`;
}

const nf = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString());

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Synapse's own hue (money token) marks captures; notes ride the ok token, issues the relationships token.
const KIND_DIM: Record<StreamKind, Dim> = {
  capture: "money",
  note: "ok",
  issue: "relationships",
};

// One icon per ledger content_kind — the at-a-glance "what is this" signal.
const CONTENT_KIND_ICON: Record<string, LucideIcon> = {
  article: FileText,
  video: Film,
  tweet: MessageCircle,
  paper: ScrollText,
  note: StickyNote,
  tool: Wrench,
  project: FolderGit2,
  newsletter: Mail,
  other: CircleDot,
};

// routed_actions values → human labels + tint. Unknown actions prettify from snake_case.
const ACTION_META: Record<string, { label: string; dim: Dim }> = {
  create_knowledge_idea_entry: { label: "知識想法", dim: "ok" },
  create_knowledge_research_entry: { label: "知識研究", dim: "ok" },
  create_work_issue: { label: "工作議題", dim: "relationships" },
  create_blog_seed: { label: "文章種子", dim: "creative" },
  add_feed_source: { label: "資訊來源", dim: "freedom" },
  send_to_newsletter_sheet: { label: "電子報試算表", dim: "freedom" },
};
function actionMeta(a: string): { label: string; dim: Dim } {
  return ACTION_META[a] ?? { label: displayLabel(a).replace(/_/g, " "), dim: "neutral" };
}

// Score bands: what routing considers worth acting on reads green, the middle amber, the rest muted.
function scoreDim(score: number): Dim {
  return score >= 8 ? "ok" : score >= 5 ? "warn" : "neutral";
}

/** The capture lifecycle as a 3-segment track: captured → graded → routed.
 *  Filled segments show how far the item got; the next segment pulses while
 *  the 30-min router hasn't picked it up yet. */
function LifecycleTrack({ status, score }: { status: string; score: number | null }) {
  const stage = status === "routed" ? 3 : status === "graded" || score !== null ? 2 : 1;
  const segs: { dim: Dim; label: string }[] = [
    { dim: "money", label: "已擷取" },
    { dim: "relationships", label: "已評分" },
    { dim: "ok", label: "已分流" },
  ];
  return (
    <span
      className="inline-flex items-center gap-[3px] shrink-0"
      title={`${segs[stage - 1].label}：擷取 → 評分 → 分流`}
    >
      {segs.map((s, i) => (
        <span
          key={s.label}
          className={i === stage ? "w-3 h-[5px] rounded-full animate-pulse" : "w-3 h-[5px] rounded-full"}
          style={{
            background: i < stage ? `var(--${s.dim === "ok" ? "ok" : s.dim})` : "var(--line-2)",
            opacity: i < stage ? 0.9 : 1,
          }}
        />
      ))}
    </span>
  );
}

// The five-stage loop, rendered as a horizontal flow with live counts.
function FlowStage({ name, desc, count, dim }: { name: string; desc: string; count?: string; dim: Dim }) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg p-3" style={dimStyle(dim, true)}>
      <div className="text-[12px] font-semibold tracking-[0.12em] uppercase">{name}</div>
      <div className="text-[11px] text-ink-3 mt-1 leading-snug">{desc}</div>
      {count && <div className="text-lg font-semibold text-ink-1 mt-1.5 tabular-nums">{count}</div>}
    </div>
  );
}

export default function SynapsePage() {
  const [data, setData] = useState<SynapseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("stream");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<"all" | "waiting" | "routed">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    fetch("/api/synapse")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError(null);
        setFetchedAt(Date.now());
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  // Initial load + 60s auto-refresh (module cache is 60s, so this is cheap).
  useEffect(() => {
    load();
    timer.current = setInterval(() => {
      load();
      forceTick((n) => n + 1); // re-render ages even if payload is cache-identical
    }, REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  // Hash deep-links: /synapse#stats, /synapse#system. Read once on mount.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "stats" || h === "system" || h === "stream") setTab(h as TabId);
  }, []);
  const switchTab = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", t === "stream" ? window.location.pathname : `#${t}`);
  };

  const L = data?.ledger;
  const K = data?.knowledge;
  const B = data?.bookmarks;
  const sourceEntries = Object.entries(L?.by_source ?? {}).sort((a, b) => b[1] - a[1]);

  // ── Unified stream: captures + notes + issues, merged reverse-chron ──
  const stream = useMemo<StreamItem[]>(() => {
    if (!data) return [];
    const items: StreamItem[] = [];
    const promotedSlugs = new Set<string>();
    for (const c of data.ledger?.recent ?? []) {
      if (c.note) promotedSlugs.add(c.note.slug);
      items.push({
        kind: "capture",
        id: c.id,
        origin: c.source,
        title: c.title || c.url || "（文字筆記）",
        href: c.url,
        internal: null,
        contentKind: c.content_kind || "other",
        author: c.author,
        excerpt: c.excerpt,
        gradeVersion: c.grade_version,
        actions: c.routed_actions,
        status: c.status,
        score: c.score,
        routed: c.status === "routed",
        note: c.note,
        ts: c.captured_at,
      });
    }
    for (const n of data.knowledge?.recent ?? []) {
      // A promoted note already rides on its capture row — don't show it twice.
      if (promotedSlugs.has(n.slug)) continue;
      items.push({
        kind: "note",
        id: `note:${n.category}/${n.slug}`,
        origin: "knowledge",
        title: n.title,
        href: null,
        internal: wikiPageUrl(encodeURIComponent(n.category), encodeURIComponent(n.slug)),
        contentKind: null,
        author: null,
        excerpt: null,
        gradeVersion: null,
        actions: null,
        status: null,
        score: null,
        routed: false,
        note: null,
        ts: n.created,
      });
    }
    for (const i of data.bookmarks?.recent_issues ?? []) {
      items.push({
        kind: "issue",
        id: `issue:${i.issue}`,
        origin: "x-bookmarks",
        title: `X 書籤 → 工作議題 #${i.issue}`,
        href: i.url,
        internal: null,
        contentKind: null,
        author: null,
        excerpt: null,
        gradeVersion: null,
        actions: null,
        status: null,
        score: null,
        routed: false,
        note: null,
        ts: i.created_at,
      });
    }
    return items.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  }, [data]);

  const origins = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of stream) counts.set(it.origin, (counts.get(it.origin) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [stream]);

  const visible = stream.filter((i) => {
    if (originFilter !== "all" && i.origin !== originFilter) return false;
    if (stateFilter === "waiting") return i.kind === "capture" && !i.routed;
    if (stateFilter === "routed") return i.kind === "capture" && i.routed;
    return true;
  });

  return (
    <PageShell className="max-w-[1200px]">
      {/* ── Header ── */}
      <PageHeader
        icon={Share2}
        title={
          <span className="flex items-center gap-3">
            想法收集
            <Pill dim="money">Synapse · 輸入分流器</Pill>
          </span>
        }
        subtitle="統一接收，再送往適合的位置：擷取 → 琥珀紀錄 → 評分 → 分流 → 再次呈現。"
      />

      {/* ── Tab bar ── */}
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
            <span className="whitespace-nowrap">
              {error ? "離線" : fetchedAt ? `更新於${ago(new Date(fetchedAt).toISOString())} · 每 60 秒自動更新` : "載入中…"}
            </span>
          </div>
        }
      />

      {error && <div className="text-warn text-sm">無法連線至 Synapse API： {error}</div>}
      {!data && !error && <div className="text-ink-3 text-sm">載入中…</div>}

      {/* ════ STREAM ════ */}
      {data && tab === "stream" && (
        <>
          {/* Compact stat strip */}
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px] text-ink-3">
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(L?.total ?? null)}</span> 已保留</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(L?.routed ?? 0)}</span> 已分流 · <span className="text-ink-1 tabular-nums font-medium">{nf(L?.captured ?? 0)}</span> 等待中</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(K?.last7d ?? null)}</span> 筆記／七日</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(B?.cloud_parsed ?? null)}</span> 書籤／90 日</span>
          </div>

          {/* Origin + state filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setOriginFilter("all")}
              className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
              style={dimStyle("money", originFilter === "all")}
            >
              全部 <span className="tabular-nums opacity-70">{stream.length}</span>
            </button>
            {origins.map(([o, n]) => (
              <button
                key={o}
                onClick={() => setOriginFilter(originFilter === o ? "all" : o)}
                className="text-[11px] px-2.5 py-1 rounded-full mono transition-colors"
                style={dimStyle("money", originFilter === o)}
              >
                {displayLabel(o)} <span className="tabular-nums opacity-70">{n}</span>
              </button>
            ))}
            <span className="w-px h-4 bg-line-2 mx-1" />
            {(["waiting", "routed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStateFilter(stateFilter === s ? "all" : s)}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                style={dimStyle(s === "routed" ? "ok" : "warn", stateFilter === s)}
              >
                {displayLabel(s)}
              </button>
            ))}
          </div>

          {/* The feed */}
          <Panel className="p-0 divide-y divide-line-1 overflow-hidden">
            {visible.length === 0 && <div className="p-4 text-sm text-ink-3">尚未擷取內容。</div>}
            {visible.map((it) => {
              const KindIcon =
                it.kind === "note" ? Library : it.kind === "issue" ? Bookmark : CONTENT_KIND_ICON[it.contentKind ?? "other"] ?? CircleDot;
              const domain = domainOf(it.href);
              const isOpen = expanded === it.id;
              const expandable = it.kind === "capture";
              const titleLink = it.href ?? it.internal;
              return (
                <div key={it.id} className={isOpen ? "bg-surface-3" : "transition-colors hover:bg-surface-3"}>
                  {/* ── Row ── */}
                  <div
                    className={expandable ? "flex items-center gap-3 px-4 py-2.5 min-w-0 cursor-pointer select-none" : "flex items-center gap-3 px-4 py-2.5 min-w-0"}
                    onClick={expandable ? () => setExpanded(isOpen ? null : it.id) : undefined}
                  >
                    {/* kind badge */}
                    <span
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={dimStyle(KIND_DIM[it.kind], true)}
                      title={it.kind === "capture" ? `${displayLabel(it.contentKind)} 擷取` : displayLabel(it.kind)}
                    >
                      <KindIcon className="w-3.5 h-3.5" />
                    </span>

                    {/* title + meta, two lines */}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm text-ink-1 leading-tight">
                        {titleLink ? (
                          <a
                            href={titleLink}
                            target={it.href ? "_blank" : undefined}
                            rel={it.href ? "noreferrer" : undefined}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {it.title}
                          </a>
                        ) : (
                          it.title
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-3 mt-0.5 min-w-0 overflow-hidden whitespace-nowrap">
                        <span className="mono shrink-0">{displayLabel(it.origin)}</span>
                        {it.contentKind && it.contentKind !== "other" && (
                          <><span className="opacity-50">·</span><span className="shrink-0">{displayLabel(it.contentKind)}</span></>
                        )}
                        {domain && <><span className="opacity-50">·</span><span className="truncate">{domain}</span></>}
                        {it.author && <><span className="opacity-50">·</span><span className="truncate">{it.author}</span></>}
                        {/* routing destinations, inline */}
                        {(it.actions?.length ?? 0) > 0 &&
                          it.actions!.map((a) => {
                            const m = actionMeta(a);
                            return (
                              <span key={a} className="hidden sm:inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap" style={{ color: `var(--${m.dim === "neutral" ? "ink-2" : m.dim})` }}>
                                <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                                {m.label}
                              </span>
                            );
                          })}
                        {it.routed && it.actions !== null && it.actions.length === 0 && (
                          <span className="hidden sm:inline shrink-0 whitespace-nowrap opacity-70">→ 保存在琥珀紀錄中</span>
                        )}
                      </div>
                    </div>

                    {/* note promotion */}
                    {it.note && (
                      <a
                        href={wikiPageUrl(encodeURIComponent(it.note.category), encodeURIComponent(it.note.slug))}
                        className="shrink-0 hidden sm:flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
                        style={dimStyle("ok", true)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Library className="w-3 h-3" />
                        筆記
                      </a>
                    )}

                    {/* score */}
                    {it.score !== null && (
                      <span
                        className="shrink-0 text-[11px] tabular-nums font-medium px-1.5 py-0.5 rounded"
                        style={dimStyle(scoreDim(it.score), true)}
                        title={`依 TELOS 評分 ${it.score}／10`}
                      >
                        {it.score}
                      </span>
                    )}

                    {/* lifecycle */}
                    {it.kind === "capture" && it.status ? (
                      <LifecycleTrack status={it.status} score={it.score} />
                    ) : (
                      <span className="shrink-0 hidden md:flex items-center gap-1 text-[11px]" style={{ color: `var(--${it.kind === "note" ? "ok" : "relationships"})` }}>
                        <CircleCheck className="w-3 h-3" />
                        {it.kind === "note" ? "已整理" : "議題"}
                      </span>
                    )}

                    <span className="shrink-0 whitespace-nowrap text-[12px] text-ink-3 tabular-nums w-14 text-right">{ago(it.ts)}</span>
                    {expandable && (
                      <ChevronRight className={isOpen ? "w-3.5 h-3.5 shrink-0 text-ink-3 rotate-90 transition-transform" : "w-3.5 h-3.5 shrink-0 text-ink-3 transition-transform"} />
                    )}
                  </div>

                  {/* ── Expanded detail ── */}
                  {isOpen && (
                    <div className="px-4 pb-3.5 pl-14 flex flex-col gap-2.5 text-[12px]">
                      {it.excerpt && (
                        <p className="text-ink-2 leading-relaxed max-w-3xl border-l-2 border-line-2 pl-3">
                          {it.excerpt}
                          {it.excerpt.length >= 240 ? "…" : ""}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-ink-3">
                        <span>
                          狀態{" "}
                          <span className="text-ink-1 font-medium">{displayLabel(it.status)}</span>
                        </span>
                        <span>
                          分數{" "}
                          <span className="text-ink-1 font-medium tabular-nums">{it.score !== null ? `${it.score}/10` : "尚未評分"}</span>
                          {it.gradeVersion && <span className="opacity-70"> · {it.gradeVersion}</span>}
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          分流至{" "}
                          {(it.actions?.length ?? 0) > 0 ? (
                            it.actions!.map((a) => {
                              const m = actionMeta(a);
                              return (
                                <span key={a} className="px-1.5 py-0.5 rounded text-[11px]" style={dimStyle(m.dim, true)}>
                                  {m.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-ink-2">{it.routed ? "尚無目的地，保留於琥珀紀錄中（未達行動門檻）" : "尚未分流"}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-ink-3">
                        <span className="mono text-[11px] opacity-70">{it.id}</span>
                        {it.href && (
                          <a href={it.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink-1" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-3 h-3" /> 開啟來源
                          </a>
                        )}
                        {it.note && (
                          <a
                            href={wikiPageUrl(encodeURIComponent(it.note.category), encodeURIComponent(it.note.slug))}
                            className="flex items-center gap-1 hover:text-ink-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Library className="w-3 h-3" /> 開啟知識筆記
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Panel>
          <p className="text-[12px] text-ink-3">
            即時合併三個來源：最近 50 筆擷取紀錄、近 30 日知識筆記，以及近 30 日 X 書籤工作議題。未保留逐筆紀錄的路徑（如瀏覽器快捷鍵送往試算表）不會出現在此；原因見「系統」。
          </p>
        </>
      )}

      {/* ════ STATS ════ */}
      {data && tab === "stats" && (
        <>
          {/* ── What each number is ── */}
          <Panel className="text-[13px] leading-relaxed text-ink-2 space-y-1.5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 mb-2">各項數字的意義</div>
            <div><span className="font-medium text-dim-money">紀錄</span> ：琥珀紀錄是 Synapse 的永久儲存庫，使用 D1 資料庫。每次擷取都會在評分前立即寫入；「已保留」是其中的資料筆數。</div>
            <div><span className="font-medium text-ok">知識筆記</span> ：知識資料庫中經整理的 Markdown 筆記（想法、研究、人物等）。數值統計由各種流程在 <em>整個資料庫</em> 建立的筆記；「經 Synapse」只統計由 Synapse 從琥珀紀錄提升而來的筆記。</div>
            <div><span className="font-medium text-dim-freedom">試算表</span> ：摘要工作單元 持續寫入的電子報擷取表格。數量按已設計數據追蹤的路徑計算；瀏覽器快捷鍵路徑尚無計數器。</div>
            <div><span className="font-medium text-dim-relationships">X 書籤</span> ：雲端排程每分鐘從 X 取得書籤，摘要後送至試算表（滾動 90 日），另加本機的 <span className="mono">tb</span> 掃描，將書籤轉為工作議題。</div>
          </Panel>

          {/* ── Stats tiles ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatTile
              icon={Database}
              label="已保留"
              value={nf(L?.total ?? null)}
              dim="money"
              sub="只增不減的 D1 紀錄筆數"
            />
            <StatTile
              icon={GitBranch}
              label="已分流／等待中"
              value={`${nf(L?.routed ?? 0)} / ${nf(L?.captured ?? 0)}`}
              sub="已送至目的地／已擷取但尚未分流"
            />
            <StatTile
              icon={Library}
              label="知識筆記"
              value={nf(K?.last7d ?? null)}
              dim="ok"
              sub={`七日內建立，整個資料庫 · ${nf(K?.last30d ?? null)} 筆／30 日 · 經 Synapse：${nf(K?.amber_promoted ?? null)}`}
            />
            <StatTile
              icon={Table2}
              label="送至試算表"
              value={nf((B?.cloud_parsed ?? 0) + (L?.by_source?.["surface"] ?? 0))}
              dim="freedom"
              sub="觀測近 90 日：書籤排程與 Surface 儲存（快捷鍵路徑尚未追蹤）"
            />
            <StatTile
              icon={Bookmark}
              label="X 書籤"
              value={nf(B?.cloud_parsed ?? null)}
              dim="relationships"
              sub={`雲端排程，近 90 日 · ${nf(B?.local_seen ?? 0)} 筆經本機 tb · ${nf(B?.issues_created ?? 0)} 筆轉為議題`}
            />
          </div>

          {/* ── Knowledge base breakdown ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-1">知識庫：儲存了什麼</h2>
            <p className="text-[12px] text-ink-3 mb-3">
              知識資料庫中的新增筆記，依類型統計，涵蓋 <em>所有</em> 流程。Synapse 自身的貢獻列於「經 Synapse 分流」一列： {nf(K?.amber_promoted ?? 0)} 筆筆記，由每 30 分鐘執行的分流排程從紀錄中提升。
            </p>
            <Panel className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-3 border-b border-line-2">
                    <th className="px-4 py-2.5 font-medium">筆記類型</th>
                    <th className="px-4 py-2.5 font-medium text-right">七日</th>
                    <th className="px-4 py-2.5 font-medium text-right">30 日</th>
                    <th className="px-4 py-2.5 font-medium text-right">累計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-1">
                  {Object.entries(K?.by_type ?? {})
                    .sort((a, b) => b[1].last30d - a[1].last30d || b[1].total - a[1].total)
                    .map(([type, c]) => (
                      <tr key={type}>
                        <td className="px-4 py-2.5 text-ink-1">{displayLabel(type)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{nf(c.last7d)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{nf(c.last30d)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-3">{nf(c.total)}</td>
                      </tr>
                    ))}
                  <tr className="border-t border-line-2">
                    <td className="px-4 py-2.5 text-ok">經 Synapse 分流（所有類型）</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ok" colSpan={3}>{nf(K?.amber_promoted ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </Panel>
          </div>

          {/* ── Ledger by source + sheet paths ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">依來源統計紀錄</h2>
              <Panel className="p-0 divide-y divide-line-1">
                {sourceEntries.length === 0 && <div className="p-4 text-sm text-ink-3">尚無擷取內容。</div>}
                {sourceEntries.map(([source, n]) => (
                  <div key={source} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink-2 mono">{displayLabel(source)}</span>
                    <span className="text-ink-1 tabular-nums">{nf(n)}</span>
                  </div>
                ))}
              </Panel>
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">傳送至試算表（依路徑）</h2>
              <Panel className="p-0 divide-y divide-line-1">
                {data.sheet.paths.map((p) => (
                  <div key={p.name} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-2 whitespace-nowrap">{moduleLabel(p.name)}</span>
                      <span className="text-ink-1 tabular-nums shrink-0">{nf(p.count)}</span>
                    </div>
                    <div className="text-[11px] text-ink-3 mt-1 leading-snug">{moduleLabel(p.note)}</div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        </>
      )}

      {/* ════ SYSTEM ════ */}
      {data && tab === "system" && (
        <>
          <Panel className="text-[13px] leading-relaxed text-ink-2 max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 mb-2">Synapse 是什麼</div>
            <p className="mb-2">
              Synapse 是輸入分流器：值得保留的網頁、貼文、口述想法或資訊項目，都由最近的入口擷取，先寫入琥珀紀錄， <em>然後</em> 才依 TELOS 評分，送至適合的位置：知識筆記、工作議題、文章種子或電子報試算表。
            </p>
            <p>
              名稱來自突觸的加權傳遞機制：評分決定權重，分流傳遞達到門檻的內容。紀錄沿用「琥珀」之名，因為原始擷取會在任何判斷之前保存，如同琥珀中的昆蟲。
            </p>
          </Panel>

          {/* ── The flow ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">同一個循環</h2>
            <div className="flex flex-wrap items-stretch gap-2 mb-3">
              <FlowStage
                name="擷取"
                desc="八個現有入口、三個規劃中入口：快捷鍵、書籤、收集、語音、資訊流、Surface 與 CLI"
                count={`${data.inputs.filter((i) => i.status === "live").length} 個現有入口`}
                dim="freedom"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="記錄"
                desc="評分前先寫入琥珀紀錄，保留原始內容"
                count={nf(L?.total ?? null)}
                dim="money"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="評分"
                desc="依 TELOS 評分：是否有助於使用者目前的工作？"
                dim="relationships"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="分流"
                desc="送往知識筆記、佇列／專案議題、文章種子與電子報"
                count={`${nf(L?.routed ?? 0)} 筆已分流`}
                dim="ok"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="再次呈現"
                desc="琥珀搜尋、此頁，以及將優質紀錄提升為整理過的筆記"
                dim="creative"
              />
            </div>
            <p className="text-[12px] text-ink-3">
              目的地：知識庫 <span className="text-ink-2">想法</span> 筆記 · 工作議題{" "}
              <span className="text-ink-2">Type:queue / Type:project</span> · 電子報試算表 · 文章種子 · 資訊來源登錄。每 30 分鐘自動分流（<span className="text-ink-2">com.lifeos.amberroute</span>），也可按需執行： <span className="text-ink-2">amber route</span>.
            </p>
          </div>

          {/* ── Inputs catalog ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">輸入：捕捉想法的各種方式</h2>
            <Panel className="p-0 overflow-x-auto mb-2">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-3 border-b border-line-2">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">輸入</th>
                    <th className="px-4 py-2.5 font-medium">觸發方式</th>
                    <th className="px-4 py-2.5 font-medium">元件</th>
                    <th className="px-4 py-2.5 font-medium text-right">紀錄筆數</th>
                    <th className="px-4 py-2.5 font-medium text-right">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-1">
                  {data.inputs.map((i) => (
                    <tr key={i.n} className={i.status === "roadmap" ? "opacity-60" : ""}>
                      <td className="px-4 py-2.5 text-ink-3 tabular-nums">{i.n}</td>
                      <td className="px-4 py-2.5 text-ink-1">{moduleLabel(i.name)}</td>
                      <td className="px-4 py-2.5 text-ink-2">{moduleLabel(i.trigger)}</td>
                      <td className="px-4 py-2.5 text-ink-2 mono text-[12px]">{moduleLabel(i.component)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{i.ledger_count === null ? "—" : nf(i.ledger_count)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Pill dim={i.status === "live" ? "ok" : "neutral"} className="text-[11px] uppercase tracking-wider px-2 py-0.5">
                          {displayLabel(i.status)}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <p className="text-[12px] text-ink-3">
              「紀錄筆數」統計其 <span className="mono">source</span> 標籤對應該入口的擷取內容。仍僅送至試算表的入口（快捷鍵與雲端書籤排程）會顯示「—」，直到第三階段接入擷取介面。
            </p>
          </div>

          {/* ── How this page works ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">此頁如何取得數字</h2>
            <Panel className="text-[13px] leading-relaxed text-ink-2 space-y-1.5 max-w-3xl">
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-dim-money" /><span><span className="text-ink-1">紀錄工作單元</span> — <span className="mono">/stats</span> 與 <span className="mono">/captures</span> ：D1 琥珀紀錄工作單元 的介面，由伺服器以權杖驗證。</span></div>
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-ok" /><span><span className="text-ink-1">知識資料庫</span> ：掃描筆記檔案的前置資料，位置為 <span className="mono">MEMORY/KNOWLEDGE</span> （<span className="mono">created:</span>, <span className="mono">source_amber_id:</span>).</span></div>
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-dim-relationships" /><span><span className="text-ink-1">X 書籤</span> ：透過 Cloudflare API 計算 SEEN_BOOKMARKS 的 KV 鍵數，加上本機 <span className="mono">_X</span> 狀態檔案，用於 <span className="mono">tb</span> 掃描與建立議題。</span></div>
              <div className="pt-1">
                所有資料均由伺服器端的 Pulse <span className="mono">synapse</span> 模組彙整（快取 60 秒），機密資訊不會傳入瀏覽器。每個數字都來自實際執行的即時探測；尚未追蹤的路徑會明確標示，不予估算。
              </div>
            </Panel>
          </div>
        </>
      )}

      {data && (
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <Sparkles className="w-3 h-3" />
          <span>
            產生於 {ago(data.generated_at)} · 快取 60 秒
            {data.errors ? ` · 受限的資料探測：${Object.keys(data.errors).join(", ")}` : ""}
          </span>
        </div>
      )}
    </PageShell>
  );
}
