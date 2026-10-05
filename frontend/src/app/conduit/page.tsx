"use client";

import { moduleLabel } from "@/lib/module-labels-zh";

import { displayLabel } from "@/lib/zh-TW";

import { useEffect, useState } from "react";
import { Radar, Circle, GitCommit, Cpu, MonitorSmartphone, Sparkles, Github } from "lucide-react";
import { PageShell, PageHeader, Panel, PanelHeader, StatTile, EmptyState } from "@/components/ui/chrome";

/**
 * Conduit tab — LifeOS's sensory layer. This component holds ZERO data; it fetches
 * everything live from /api/conduit/* (which reads USER/CONDUIT) and renders it.
 * Data/code separated by construction. The content-type read comes from a CACHED
 * hourly insight file — this component NEVER calls a model on load.
 */

interface Block { label: string; kind: "creation" | "consumption" | "neutral"; minutes: number }
interface DailyRecord {
  date: string;
  conduitVersion: string;
  totalMinutes: number;
  creationMinutes: number;
  consumptionMinutes: number;
  neutralMinutes: number;
  blocks: Block[];
  commits: number;
  sessions: number;
}
interface SourceStatus {
  id: string; label: string; captures: string; eventType: string;
  enabled: boolean; pollIntervalSec: number; eventsToday: number; lastEventTs: string | null;
}
interface SourcesReport { pollIntervalSec: number; date: string; sources: SourceStatus[] }
interface ContentType { label: string; share: number; evidence: string }
interface Insight {
  available: boolean; date: string; generatedAt?: string; level?: string; model?: string;
  eventsConsidered?: number; narrative: string; contentTypes: ContentType[];
  /** True while an on-demand run is in flight server-side. public PR #1647, @elhoim */
  building?: boolean;
}

const hm = (m: number) => `${Math.floor(m / 60)} 小時 ${Math.round(m % 60)} 分鐘`;
const ratioPct = (r: DailyRecord) =>
  r.creationMinutes + r.consumptionMinutes > 0
    ? Math.round((r.creationMinutes / (r.creationMinutes + r.consumptionMinutes)) * 100)
    : 0;

const kindColor: Record<string, string> = {
  creation: "text-ok",
  consumption: "text-warn",
  neutral: "text-ink-2",
};

const sourceIcon: Record<string, React.ReactNode> = {
  appFocus: <MonitorSmartphone className="w-4 h-4" />,
  git: <GitCommit className="w-4 h-4" />,
  claudeSession: <Cpu className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
};

// Cool→warm cycle for content-type bars, drawn from the life-dimension tokens.
const themeColors = [
  "var(--freedom)", "var(--health)", "var(--relationships)", "var(--money)", "var(--creative)", "var(--rhythms)",
];

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

class ConduitRequestError extends Error {}

async function requestConduit<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (response.status === 404) throw new ConduitRequestError("活動感知模組尚未啟用，或目前未提供此服務。");
  if (!response.ok) throw new ConduitRequestError(`暫時無法讀取活動感知資料（狀態碼 ${response.status}）。`);
  if (response.status === 204) return undefined as T;
  try {
    return await response.json();
  } catch {
    throw new ConduitRequestError("活動感知服務回傳的資料暫時無法讀取。");
  }
}

function conduitErrorMessage(error: unknown): string {
  return error instanceof ConduitRequestError ? error.message : "暫時無法連線至活動感知服務，請稍後再試。";
}

export default function ConduitPage() {
  const [today, setToday] = useState<DailyRecord | null>(null);
  const [recent, setRecent] = useState<DailyRecord[]>([]);
  const [sources, setSources] = useState<SourcesReport | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Locally-known "a run is in flight". The server is the authority (it reports
  // `building` on /insight), but the button has to respond to the click before the
  // first poll comes back. public PR #1647, @elhoim
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    requestConduit<DailyRecord>("/api/conduit/today").then(setToday).catch((e) => setError(conduitErrorMessage(e)));
    requestConduit<DailyRecord[]>("/api/conduit/recent?days=7").then((d) => Array.isArray(d) && setRecent(d)).catch(() => {});
    requestConduit<SourcesReport>("/api/conduit/sources").then(setSources).catch(() => {});
    requestConduit<Insight>("/api/conduit/insight").then(setInsight).catch(() => {});
  }, []);

  // Poll while a run is in flight; stop as soon as the server says it's done.
  // The insight job is an inference call — seconds, not milliseconds — so the
  // POST returns 202 immediately and the result arrives through this poll.
  useEffect(() => {
    if (!building) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const next = await requestConduit<Insight>("/api/conduit/insight");
        if (cancelled) return;
        setInsight(next);
        if (!next.building) setBuilding(false);
      } catch {
        /* transient — keep polling until the timeout below */
      }
    }, 3000);
    // Hard stop so a server-side crash can't leave the button spinning forever.
    const timeout = setTimeout(() => setBuilding(false), 180_000);
    return () => { cancelled = true; clearInterval(id); clearTimeout(timeout); };
  }, [building]);

  async function runInsight() {
    setError(null);
    setBuilding(true);
    try {
      await requestConduit<unknown>("/api/conduit/insight/build", { method: "POST" });
    } catch (e) {
      setBuilding(false);
      setError(conduitErrorMessage(e));
    }
  }

  const pollSec = sources?.pollIntervalSec;

  return (
    <PageShell className="max-w-[1100px]">
      <PageHeader
        icon={Radar}
        title="活動感知"
        subtitle={
          <>
            查看已啟用的本機活動紀錄{pollSec ? `，每 ${pollSec} 秒讀取` : ""}，並依固定規則彙整。資料均位於 USER/CONDUIT，保留在本機。
          </>
        }
      />

      {error && <Panel><p className="text-ink-2 text-sm" role="status">{error}</p></Panel>}
      {!today && !error && <div className="text-ink-3 text-sm">載入中…</div>}

      {today && (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="創作比例" value={`${ratioPct(today)}%`} dim="ok" />
            <StatTile label="今日追蹤時間" value={hm(today.totalMinutes)} />
            <StatTile label="LifeOS 對話" value={String(today.sessions)} />
            <StatTile label="提交次數" value={String(today.commits)} />
          </div>

          {/* What's flowing in — the hourly content-type read */}
          <Panel>
            <PanelHeader
              icon={Sparkles}
              title="目前接收的內容"
              actions={
                <span className="flex items-center gap-3">
                  <span className="text-[12px] text-ink-3 mono">
                    {insight?.available
                      ? `每小時讀取 · ${displayLabel(insight.level ?? "low")} · 更新於 ${ago(insight.generatedAt)}`
                      : "每小時讀取"}
                  </span>
                  <button
                    type="button"
                    onClick={runInsight}
                    disabled={building}
                    className="text-[12px] mono px-2 py-1 rounded border border-ink-3/30 text-ink-2 hover:text-ink-1 hover:border-ink-3/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {building ? "讀取中…" : "立即執行"}
                  </button>
                </span>
              }
            />
            {!insight && <div className="text-ink-3 text-sm">載入中…</div>}
            {insight && (
              <>
                <p className="text-ink-1 text-sm leading-relaxed mb-4">{insight.available ? insight.narrative : moduleLabel(insight.narrative)}</p>
                {insight.contentTypes.length > 0 ? (
                  <div className="space-y-2.5">
                    {insight.contentTypes.map((t, i) => (
                      <ThemeBar key={t.label} t={t} color={themeColors[i % themeColors.length]} />
                    ))}
                  </div>
                ) : (
                  !insight.available && (
                    <div className="text-xs text-ink-3">
                      洞察工作每整點執行。可使用上方的 <span className="text-ink-2 mono">立即執行</span> ，或執行指令：{" "}
                      <code className="text-ink-2 mono">bun ~/.codex/LIFEOS/PULSE/Conduit/BuildInsight.ts</code>
                    </div>
                  )
                )}
              </>
            )}
          </Panel>

          {/* Sources & cadence */}
          <Section title="來源與頻率">
            {!sources && <Row left="—" right="載入中…" />}
            {sources?.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span style={{ color: s.enabled ? "var(--accent-blue)" : "var(--ink-3)" }}>{sourceIcon[s.id]}</span>
                  <span className="min-w-0">
                    <span className="text-ink-1 flex items-center gap-2">
                      {moduleLabel(s.label)}
                      <span className={`inline-flex items-center gap-1 text-[10px] ${s.enabled ? "text-ok" : "text-ink-3"}`}>
                        <Circle className="w-1.5 h-1.5" style={{ fill: s.enabled ? "var(--ok)" : "var(--ink-3)" }} />
                        {s.enabled ? "開啟" : "關閉"}
                      </span>
                    </span>
                    <span className="block text-xs text-ink-3 truncate">{moduleLabel(s.captures)}</span>
                  </span>
                </span>
                <span className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-ink-3 text-xs">每 {s.pollIntervalSec}秒</span>
                  <span className="text-ink-2 tabular-nums w-20">{s.eventsToday} 今日</span>
                  <span className="text-ink-3 text-xs w-16">{ago(s.lastEventTs)}</span>
                </span>
              </div>
            ))}
          </Section>

          {/* Creation vs consumption bar */}
          <div>
            <div className="flex justify-between text-xs mb-1 gap-2">
              <span className="text-ok whitespace-nowrap">創作 {hm(today.creationMinutes)}</span>
              <span className="text-warn whitespace-nowrap">瀏覽 {hm(today.consumptionMinutes)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface-3)" }}>
              <div style={{ width: `${ratioPct(today)}%`, background: "var(--ok)" }} />
              <div className="flex-1" style={{ background: "var(--warn)" }} />
            </div>
          </div>

          {/* Where the time went */}
          <Section title="今日時間分配">
            {today.blocks.length === 0 && <Row left="—" right="尚無應用焦點紀錄" />}
            {today.blocks.map((b) => (
              <Row key={b.label} left={moduleLabel(b.label)} right={hm(b.minutes)} note={displayLabel(b.kind)} noteClass={kindColor[b.kind]} />
            ))}
          </Section>

          {/* Recent days */}
          {recent.length > 0 && (
            <Section title="最近幾天">
              {recent.map((r) => (
                <Row key={r.date} left={r.date} right={`${hm(r.totalMinutes)} · ${ratioPct(r)}％創作 · ${r.sessions} 次對話`} />
              ))}
            </Section>
          )}

          <div className="text-xs text-ink-3">
            Conduit v{today.conduitVersion} · 本機收集 · 資料均位於 USER/CONDUIT
          </div>
        </>
      )}
    </PageShell>
  );
}

function ThemeBar({ t, color }: { t: ContentType; color: string }) {
  const pct = Math.round(t.share * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs mb-1.5">
        <span className="text-ink-1 whitespace-nowrap">{t.label}</span>
        <span className="text-ink-2 tabular-nums shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", background: color }} />
      </div>
      {t.evidence && <div className="text-[11px] text-ink-3 mt-1.5 truncate">{t.evidence}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <PanelHeader title={title} className="mb-0" />
      </div>
      <div className="divide-y divide-line-1">{children}</div>
    </Panel>
  );
}

function Row({ left, right, note, noteClass }: { left: string; right: string; note?: string; noteClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-ink-2 truncate mr-3">{left}</span>
      <span className="flex items-center gap-3 shrink-0">
        {note && <span className={`text-xs ${noteClass ?? "text-ink-3"}`}>{note}</span>}
        <span className="text-ink-2 tabular-nums whitespace-nowrap">{right}</span>
      </span>
    </div>
  );
}
