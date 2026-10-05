"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge, Coins, MessagesSquare } from "lucide-react";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  EmptyState,
  type Dim,
} from "@/components/ui/chrome";

/**
 * Usage tab — Anthropic subscription utilization + durable token/cost/model usage.
 * Zero data here; fetches /api/usage/{summary,trend,models}. The durable per-day
 * store behind trend/models is written nightly by LIFEOS/TOOLS/UsageAggregator.ts.
 */

interface Totals { totalTokens: number; costUsd: number; messages: number }
interface Summary {
  ts: string | null;
  subscription: { fiveHourPct: number | null; sevenDayPct: number | null };
  monthUsedUsd: number | null;
  monthUsedSource: string | null;
  today: Totals; week: Totals; month: Totals;
  hasDaily: boolean; daysTracked: number;
}
interface TrendPoint { label: string; totalTokens: number; costUsd: number; messages: number }
interface ModelRow { model: string; messages: number; totalTokens: number; costUsd: number; pct: number }

type Range = "daily" | "weekly" | "monthly";

const fmtTokens = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
const fmtUsd = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

// Model → dimension token for the mix bars.
const MODEL_COLOR = (m: string) =>
  /fable/i.test(m) ? "var(--relationships)" : /opus/i.test(m) ? "var(--accent-blue)" : /sonnet/i.test(m) ? "var(--ok)" : /haiku/i.test(m) ? "var(--warn)" : "var(--ink-3)";

const RANGE_TABS: { id: Range; label: string }[] = [
  { id: "daily", label: "每日" },
  { id: "weekly", label: "每週" },
  { id: "monthly", label: "每月" },
];

export default function UsagePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [range, setRange] = useState<Range>("daily");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage/summary", { cache: "no-store" }).then((r) => r.json()).then(setSummary).catch((e) => setError(String(e)));
    fetch("/api/usage/models?window=all", { cache: "no-store" }).then((r) => r.json()).then((d) => setModels(d.models ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/usage/trend?range=${range}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setTrend(d.points ?? [])).catch(() => {});
  }, [range]);

  const maxCost = useMemo(() => Math.max(1e-6, ...trend.map((p) => p.costUsd)), [trend]);

  return (
    <PageShell className="max-w-[1400px]">
      <PageHeader
        icon={Gauge}
        title="用量"
        subtitle={
          <>
            Anthropic 訂閱使用率與 Claude 歷史用量：模型、詞元及費用。
            {summary?.daysTracked ? ` ${summary.daysTracked} 天追蹤紀錄。` : ""}
            <span className="block text-[12px] text-ink-3 mt-1">
              <strong className="text-ink-2">費用＝假設未使用訂閱，按 API 定價計算此用量的金額</strong> ，當 Fable 用量超出方案時，這個數字便具有參考價值。下方列出各模型明細。「API 費用」卡片呈現訂閱之外已計費的金額（管理員費用報表）。
            </span>
          </>
        }
      />

      {error && <div className="text-warn text-sm">無法連線至用量 API： {error}</div>}
      {!summary && !error && <div className="text-ink-3 text-sm">載入中…</div>}

      {summary && (
        <>
          {/* Subscription gauges */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GaugeCard label="五小時額度" pct={summary.subscription.fiveHourPct} />
            <GaugeCard label="七日額度" pct={summary.subscription.sevenDayPct} />
            <StatTile icon={Coins} dim="money" label="API 費用（本月）" value={fmtUsd(summary.monthUsedUsd)} sub={summary.monthUsedSource ?? ""} />
            <StatTile icon={MessagesSquare} dim="ok" label="訊息（30 日）" value={summary.month.messages.toLocaleString()} sub={`${fmtTokens(summary.month.totalTokens)} 詞元`} />
          </div>

          {/* Today / week / month token+cost */}
          <div className="grid gap-3 sm:grid-cols-3">
            <PeriodCard label="今日" t={summary.today} />
            <PeriodCard label="本週" t={summary.week} />
            <PeriodCard label="本月" t={summary.month} />
          </div>

          {!summary.hasDaily && (
            <div
              className="text-[13px] rounded-lg px-3 py-2"
              style={{ color: "var(--warn)", border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}
            >
              尚無每日彙總。請執行 <code className="mono text-warn">bun ~/.codex/LIFEOS/TOOLS/UsageAggregator.ts</code> （或等待夜間排程）以填入詞元與費用歷史。
            </div>
          )}

          {/* Trend */}
          <Panel>
            <PanelHeader
              title="費用趨勢"
              actions={<TabBar tabs={RANGE_TABS} active={range} onChange={setRange} />}
            />
            {trend.length === 0 ? (
              <EmptyState title="此期間尚無資料。" />
            ) : (
              <div className="flex items-end gap-1 h-48">
                {trend.map((p) => (
                  <div key={p.label} className="flex-1 flex flex-col items-center justify-end group min-w-0" title={`${p.label}: ${fmtUsd(p.costUsd)} · ${fmtTokens(p.totalTokens)} 詞元 · ${p.messages} 則訊息`}>
                    <div
                      className="w-full rounded-t transition-colors"
                      style={{ height: `${Math.max(2, (p.costUsd / maxCost) * 100)}%`, background: "var(--accent-blue)" }}
                    />
                    <div className="text-[9px] text-ink-3 mt-1 truncate w-full text-center">{p.label.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Model mix */}
          <Panel>
            <PanelHeader title="模型分布（累計）" />
            {models.length === 0 ? (
              <EmptyState title="尚無模型資料。" />
            ) : (
              <div className="flex flex-col gap-3">
                {models.map((m) => (
                  <div key={m.model} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink-1 font-medium">{m.model}</span>
                      <span className="text-ink-3">
                        {m.pct}% · {m.messages.toLocaleString()} 則訊息 · {fmtTokens(m.totalTokens)} 詞元 · {fmtUsd(m.costUsd)}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-surface-3 overflow-hidden">
                      <div className="h-full" style={{ width: `${Math.max(1, m.pct)}%`, background: MODEL_COLOR(m.model) }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </PageShell>
  );
}

function GaugeCard({ label, pct }: { label: string; pct: number | null }) {
  const v = pct ?? 0;
  const dim: Dim = v >= 85 ? "err" : v >= 60 ? "warn" : "ok";
  const color = dim === "err" ? "var(--err)" : dim === "warn" ? "var(--warn)" : "var(--ok)";
  return (
    <Panel className="p-4 flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</span>
      <div className="text-[28px] leading-none font-semibold mono text-ink-1">{pct == null ? "—" : `${pct}%`}</div>
      <div className="h-2 rounded bg-surface-3 overflow-hidden mt-1">
        <div className="h-full transition-all" style={{ width: `${Math.min(100, v)}%`, background: color }} />
      </div>
    </Panel>
  );
}

function PeriodCard({ label, t }: { label: string; t: Totals }) {
  return (
    <Panel className="p-4 flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold mono text-ink-1">{fmtUsd(t.costUsd)}</span>
        <span className="text-[12px] text-ink-3">{fmtTokens(t.totalTokens)} 詞元 · {t.messages} 則訊息</span>
      </div>
    </Panel>
  );
}
