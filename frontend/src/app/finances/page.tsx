"use client";
import { presentFinanceData, sectionLabel } from "../life/template-data";
import { displayLabel } from "@/lib/zh-TW";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DollarSign,
  Landmark,
  CreditCard,
  PiggyBank,
  Receipt,
  Target,
  Lock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Mail,
  Globe,
  BookOpen,
  Mic,
  Briefcase,
  Home,
  Users,
  Cpu,
  Server,
  Scissors,
  Trophy,
  Sparkles,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import {
  Sankey,
  Rectangle,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FreshnessIndicator, type FreshnessData } from "@/components/FreshnessIndicator";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  Pill,
  type Dim,
  type TabSpec,
} from "@/components/ui/chrome";

// ─── Types matching /api/life/finances v2 envelope ───

interface Section {
  heading: string;
  body: string;
}
interface Stream {
  label: string;
  annual: number;
}

interface ResolvedLine {
  id: string;
  name: string;
  scope: string;
  monthly_usd: number;
  annual_usd: number;
  source: "collector" | "manual" | "unconfigured";
  cadence: string;
  tags?: string[];
  notes?: string;
  collector?: string;
}

interface TrendPoint {
  month: string;
  income: number;
  outbound: number;
  net: number;
}

interface InsightLine {
  display: string;
  monthly_usd: number;
  annual_usd: number;
  observed_usd: number;
  cadence: string;
  confidence: "high" | "medium" | "low";
  scope: string;
  tags: string[];
  active_months: number;
  charge_count: number;
  last_seen: string;
  reason?: string;
}

interface SpendInsights {
  top_bills: InsightLine[];
  top_ai_services: InsightLine[];
  top_infrastructure_services: InsightLine[];
  cut_candidates: InsightLine[];
  by_category: { category: string; annual_usd: number; merchants: number }[];
  total_annualized: number;
  statement_spend: {
    generated_at: string | null;
    record_count: number;
    jsonl_path: string;
    tool: string;
  };
}

interface FinancesDataV2 {
  version?: number;
  income?: {
    streams: Stream[];
    annual: number;
    monthly: number;
    mrr_monthly: number;
    mrr_annual: number;
  };
  outbound?: {
    vendors: ResolvedLine[];
    obligations: ResolvedLine[];
    other: ResolvedLine[];
    annual: number;
    monthly: number;
    vendors_annual: number;
    obligations_annual: number;
    other_annual: number;
  };
  overall?: {
    net_pre_tax_annual: number;
    net_pre_tax_monthly: number;
    net_post_tax_annual: number;
    net_post_tax_monthly: number;
    effective_tax_rate: number;
    trend: TrendPoint[];
  };
  collector_status?: {
    configured_vendors: number;
    active_collectors: string[];
    jsonl_path: string;
  };
  insights?: SpendInsights;
  currency?: string;
  // v1 legacy fields (still populated)
  accounts?: Section[];
  goals?: Section[];
  expenses?: Section[];
  investments?: Section[];
  taxes?: Section[];
  overview?: Section[];
  plan?: {
    present: boolean;
    flywheel: { n: number; stage: string; text: string }[];
    targets: { headers: string[]; rows: string[][] } | null;
    sections: Section[];
  };
  incomeStreams?: Stream[];
  expenseCategories?: Stream[];
  annualIncome?: number;
  annualExpenses?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  net?: number;
  freshness?: FreshnessData;
  freshness_per_card?: {
    income?: FreshnessData;
    outbound?: FreshnessData;
    overall?: FreshnessData;
    accounts?: FreshnessData;
    investments?: FreshnessData;
    taxes?: FreshnessData;
    plan?: FreshnessData;
  };
}

// ─── Formatting ───

// Deterministic symbols for the currencies LifeOS ships sample data for —
// checked first so the default ("USD" when [principal].currency is unset)
// resolves to the exact literal this page always used, independent of the
// server's ICU/locale environment. Any other ISO 4217 code falls through to
// Intl as a best-effort lookup.
// ported from public PR #1777, @takanorinishida and public PR #1801, @prafed
const CURRENCY_SYMBOL_FALLBACK: Record<string, string> = { USD: "$", JPY: "¥", EUR: "€", GBP: "£" };

function resolveCurrencySymbol(currency: string): string {
  const known = CURRENCY_SYMBOL_FALLBACK[currency.toUpperCase()];
  if (known) return known;
  try {
    const parts = new Intl.NumberFormat(undefined, { style: "currency", currency }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

// Module-level rather than component state: fmtHero is also called from
// SankeyNode, a plain function recharts invokes directly (not a component in
// the tree), so it has no access to hooks or props threaded from FinancesPage.
// Defaults to "$" — the literal every version of this page has rendered — so
// an install with no [principal].currency configured, or a request that
// hasn't resolved yet, is byte-identical to before currency support existed.
let currencySymbol = "$";

function setCurrency(currency: string | undefined | null): void {
  currencySymbol = resolveCurrencySymbol(currency || "USD");
}

function fmtHero(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  // Threshold on magnitude, not the signed value. A negative net is a real,
  // common case here (the card renders red ink when spending exceeds income),
  // and it missed every `>=` check, falling through to the unabridged digit
  // string — "$-2,120,000" sitting next to a sibling KPI reading "$2.1M".
  // ported from public PR #1778, @takanorinishida
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${currencySymbol}${(abs / 1_000_000).toFixed(1)} 百萬`;
  if (abs >= 10_000) return `${sign}${currencySymbol}${Math.round(abs / 1000)} 千`;
  if (abs >= 1_000) {
    const k = abs / 1000;
    return k % 1 === 0 ? `${sign}${currencySymbol}${k.toFixed(0)} 千` : `${sign}${currencySymbol}${k.toFixed(1)} 千`;
  }
  return `${sign}${currencySymbol}${Math.round(abs).toLocaleString("zh-TW")}`;
}

function fmtExact(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return `${currencySymbol}${n.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`;
}

function fmtPct(rate: number | null | undefined): string {
  const n = Number(rate) || 0;
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Palette — chart color scales (kept as literals; the Sankey/line series
// coloring keys off these exact values). Semantic dimension/status/chrome
// colors elsewhere on the page come from the design tokens in globals.css. ───

const DIMENSION_PALETTE = ["#b5e5d5", "#d9c49e", "#97bdd2", "#e8aaa0", "#b8b2cf", "#8ec7bc"];
const SANKEY_INCOME_PALETTE = ["#b5e5d5", "#d9c49e"];
const SANKEY_OUTFLOW_PALETTE = ["#d9c49e", "#e8aaa0"];

const SANKEY_COLORS: Record<string, string> = {
  "總收入": "#d9c49e",
  "淨額": "#97bdd2",
  "支出": "#e8aaa0",
  "供應商": "#d9c49e",
  "固定支出": "#e8aaa0",
  "其他": "#d9c49e",
};

const INCOME_ICON: Record<string, LucideIcon> = {
  newsletter: Mail,
  podcast: Mic,
  sponsor: Mail,
  membership: Users,
  course: BookOpen,
  speaking: Mic,
  consulting: Briefcase,
  product: Globe,
};

const OUTBOUND_ICON: Record<string, LucideIcon> = {
  aws: Server,
  cloudflare: Server,
  anthropic: Cpu,
  openai: Cpu,
  elevenlabs: Cpu,
  mortgage: Home,
  property_tax: Home,
  home_insurance: Home,
  tesla_lease: TrendingDown,
  auto_insurance: TrendingDown,
  mobile_phone: Receipt,
  home_internet: Receipt,
};

function pickIcon(
  key: string,
  table: Record<string, LucideIcon>,
  fallback: LucideIcon,
): LucideIcon {
  const lower = key.toLowerCase();
  for (const k of Object.keys(table)) {
    if (lower.includes(k) || k.includes(lower)) return table[k];
  }
  return fallback;
}

function parseSubheadings(body: string): string[] {
  return body
    .split("\n")
    .filter((l) => l.startsWith("### "))
    .map((l) => l.replace(/^###\s*/, ""));
}

// ─── Shared bits ───

function KpiChip({
  label,
  value,
  tone,
  sensitive = true,
}: {
  label: string;
  value: string;
  tone: "income" | "outbound" | "net" | "neutral";
  sensitive?: boolean;
}) {
  const dim: Dim | undefined =
    tone === "income"
      ? "money"
      : tone === "outbound"
        ? "creative"
        : tone === "net"
          ? "freedom"
          : undefined;
  return (
    <StatTile
      label={label}
      dim={dim}
      value={sensitive ? <span data-sensitive>{value}</span> : value}
    />
  );
}

function SourceBadge({ source }: { source: string }) {
  return <Pill dim="rhythms">{displayLabel(source)}</Pill>;
}

function ScopeBadge({ scope }: { scope: string }) {
  return <Pill dim="money">{displayLabel(scope)}</Pill>;
}

function LineRow({ line, tone }: { line: ResolvedLine; tone: "income" | "outbound" }) {
  const Icon = pickIcon(
    line.id,
    tone === "income" ? INCOME_ICON : OUTBOUND_ICON,
    tone === "income" ? Wallet : Receipt,
  );
  const toneColor = tone === "income" ? "var(--money)" : "var(--creative)";
  const accentClass =
    tone === "income" ? "[border-left-color:var(--money)]" : "[border-left-color:var(--creative)]";
  return (
    <Panel className={`p-4 border-l-[3px] ${accentClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-1 shrink-0" color={toneColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{line.name}</span>
            <ScopeBadge scope={line.scope} />
            <SourceBadge source={line.source} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-lg font-medium tabular-nums"
              style={{ color: toneColor }}
              data-sensitive
            >
              {fmtHero(line.monthly_usd)}
            </span>
            <span className="text-xs text-ink-2">／月</span>
            <span className="ml-auto text-xs tabular-nums text-ink-2" data-sensitive>
              {fmtHero(line.annual_usd)}／年
            </span>
          </div>
          {line.notes && (
            <p className="mt-1 text-[12px] line-clamp-2 text-ink-2">{line.notes}</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  const Icon = pickIcon(stream.label, INCOME_ICON, Wallet);
  return (
    <Panel className="p-4 border-l-[3px] [border-left-color:var(--money)]">
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-1 shrink-0" color="var(--money)" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{stream.label}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-lg font-medium tabular-nums"
              style={{ color: "var(--money)" }}
              data-sensitive
            >
              {fmtHero(stream.annual)}
            </span>
            <span className="text-xs text-ink-2">／年</span>
            <span className="ml-auto text-xs tabular-nums text-ink-2" data-sensitive>
              {fmtHero(stream.annual / 12)}／月
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ─── Hero banners ───

function IncomeHero({
  data,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["income"]>;
  freshness?: FreshnessData;
}) {
  return (
    <Panel className="relative border-l-[3px] [border-left-color:var(--money)]">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[13px] font-medium uppercase tracking-wider text-ink-2">年度總收入</span>
      <div className="flex items-baseline gap-3 mt-1">
        <span
          className="text-5xl font-medium tabular-nums"
          style={{ color: "var(--money)", letterSpacing: "-0.02em" }}
          data-sensitive="strong"
        >
          {fmtHero(data.annual)}
        </span>
        <span className="text-sm text-ink-2" data-sensitive>
          {fmtHero(data.monthly)}／月
        </span>
      </div>
      <span className="text-sm mt-1 block text-ink-2">
        <Lock className="inline w-3 h-3 mr-1" /> 個人資料。可開啟隱藏內容，將資料模糊顯示。
      </span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <KpiChip label="每月經常性收入" value={fmtHero(data.mrr_monthly)} tone="income" />
        <KpiChip label="經常性收入年化值" value={fmtHero(data.mrr_annual)} tone="income" />
        <KpiChip label="收入來源" value={`${data.streams.length}`} tone="neutral" sensitive={false} />
        <KpiChip label="每月收入" value={fmtHero(data.monthly)} tone="income" />
      </div>
    </Panel>
  );
}

function OutboundHero({
  data,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["outbound"]>;
  freshness?: FreshnessData;
}) {
  return (
    <Panel className="relative border-l-[3px] [border-left-color:var(--creative)]">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[13px] font-medium uppercase tracking-wider text-ink-2">年度總支出</span>
      <div className="flex items-baseline gap-3 mt-1">
        <span
          className="text-5xl font-medium tabular-nums"
          style={{ color: "var(--creative)", letterSpacing: "-0.02em" }}
          data-sensitive
        >
          {fmtHero(data.annual)}
        </span>
        <span className="text-sm text-ink-2" data-sensitive>
          {fmtHero(data.monthly)}／月
        </span>
      </div>
      <span className="text-sm mt-1 block text-ink-2">
        <Lock className="inline w-3 h-3 mr-1" /> 供應商、個人固定支出與其他支出的合計。
      </span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <KpiChip label="供應商" value={fmtHero(data.vendors_annual)} tone="outbound" />
        <KpiChip label="固定支出" value={fmtHero(data.obligations_annual)} tone="outbound" />
        <KpiChip label="其他" value={fmtHero(data.other_annual)} tone="outbound" />
        <KpiChip
          label="已記錄項目"
          value={`${data.vendors.length + data.obligations.length + data.other.length}`}
          tone="neutral"
          sensitive={false}
        />
      </div>
    </Panel>
  );
}

function OverallHero({
  data,
  periodView,
  freshness,
}: {
  data: NonNullable<FinancesDataV2["overall"]>;
  periodView: "monthly" | "annual";
  freshness?: FreshnessData;
}) {
  const pre = periodView === "monthly" ? data.net_pre_tax_monthly : data.net_pre_tax_annual;
  const post = periodView === "monthly" ? data.net_post_tax_monthly : data.net_post_tax_annual;
  const preColor = pre >= 0 ? "var(--freedom)" : "var(--creative)";
  return (
    <Panel className="relative border-l-[3px] [border-left-color:var(--freedom)]">
      <div className="absolute top-5 right-5 md:top-6 md:right-6 z-10">
        <FreshnessIndicator freshness={freshness} />
      </div>
      <span className="text-[13px] font-medium uppercase tracking-wider text-ink-2">
        淨額（{periodView === "monthly" ? "每月" : "每年"}）
      </span>
      <div className="flex items-baseline gap-3 mt-1">
        <span
          className="text-5xl font-medium tabular-nums"
          style={{ color: preColor, letterSpacing: "-0.02em" }}
          data-sensitive
        >
          {fmtHero(pre)}
        </span>
        <span className="text-sm text-ink-2">稅前</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <KpiChip
          label="稅後淨額"
          value={fmtHero(post)}
          tone={post >= 0 ? "net" : "outbound"}
        />
        <KpiChip
          label="實際稅率"
          value={fmtPct(data.effective_tax_rate)}
          tone="neutral"
          sensitive={false}
        />
        <KpiChip
          label={periodView === "monthly" ? "年度稅前" : "每月稅前"}
          value={fmtHero(
            periodView === "monthly" ? data.net_pre_tax_annual : data.net_pre_tax_monthly,
          )}
          tone="net"
        />
        <KpiChip
          label={periodView === "monthly" ? "年度稅後" : "每月稅後"}
          value={fmtHero(
            periodView === "monthly" ? data.net_post_tax_annual : data.net_post_tax_monthly,
          )}
          tone="net"
        />
      </div>
    </Panel>
  );
}

// ─── Overall trend chart ───

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  return (
    <Panel className="border-l-[3px] [border-left-color:var(--money)]">
      <PanelHeader icon={ArrowLeftRight} title="收入與支出 · 近十二個月" />
      <div className="w-full h-64" data-sensitive>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" />
            <XAxis dataKey="month" stroke="var(--ink-3)" fontSize={11} />
            <YAxis
              stroke="var(--ink-3)"
              fontSize={11}
              tickFormatter={(v) => `${currencySymbol}${Math.round(v / 1000)} 千`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-1)",
                border: "1px solid var(--line-1)",
                borderRadius: 8,
                color: "var(--ink-1)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} />
            <Line type="monotone" dataKey="income" stroke="var(--money)" strokeWidth={2} dot={false} name="收入" />
            <Line type="monotone" dataKey="outbound" stroke="var(--creative)" strokeWidth={2} dot={false} name="支出" />
            <Line type="monotone" dataKey="net" stroke="var(--freedom)" strokeWidth={2} dot={false} name="淨額" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[12px] mt-2 text-ink-2">
        尚未累積歷史月份資料；目前顯示的是基準值。
      </p>
    </Panel>
  );
}

// ─── Sankey ───

interface SankeyNodePayload {
  name?: string;
  category?: string;
  colorIndex?: number;
  value?: number;
}

interface SankeyNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: SankeyNodePayload;
}

function SankeyNode(props: SankeyNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const name = payload?.name ?? "";
  const colorIndex = payload?.colorIndex ?? 0;
  const color =
    SANKEY_COLORS[name] ||
    (payload?.category === "income"
      ? SANKEY_INCOME_PALETTE[colorIndex % SANKEY_INCOME_PALETTE.length]
      : payload?.category === "outbound"
        ? SANKEY_OUTFLOW_PALETTE[colorIndex % SANKEY_OUTFLOW_PALETTE.length]
        : payload?.category === "net"
          ? DIMENSION_PALETTE[2]
        : "#a3b5b8");
  const isLeft = x < 300;
  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        radius={[3, 3, 3, 3]}
      />
      <text
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="central"
        fill="var(--ink-1)"
        fontSize={12}
        fontWeight={500}
      >
        {name}
      </text>
      <text
        x={isLeft ? x - 8 : x + width + 8}
        y={y + height / 2 + 16}
        textAnchor={isLeft ? "end" : "start"}
        dominantBaseline="central"
        fill="var(--ink-2)"
        fontSize={11}
        data-sensitive
      >
        {payload?.value != null ? `${fmtHero(payload.value / 12)}／月` : ""}
      </text>
    </g>
  );
}

interface SankeyLinkProps {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: {
    source?: SankeyNodePayload;
    target?: SankeyNodePayload;
  };
}

function SankeyLink(props: SankeyLinkProps) {
  const {
    sourceX = 0,
    sourceY = 0,
    sourceControlX = 0,
    targetX = 0,
    targetY = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
  } = props;
  const sourceName = payload?.source?.name ?? "";
  const targetName = payload?.target?.name ?? "";
  const color = SANKEY_COLORS[targetName] || SANKEY_COLORS[sourceName] || "#a3b5b8";
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={linkWidth}
      strokeOpacity={0.25}
    />
  );
}

interface SankeyNodeDatum {
  name: string;
  category: "income" | "outbound" | "pool" | "net";
  colorIndex?: number;
}

interface SankeyLinkDatum {
  source: number;
  target: number;
  value: number;
}

function FinancesSankey({
  incomeStreams,
  outbound,
  net,
}: {
  incomeStreams: Stream[];
  outbound: NonNullable<FinancesDataV2["outbound"]>;
  net: number;
}) {
  const data = useMemo<{ nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] }>(() => {
    const nodes: SankeyNodeDatum[] = [];
    const links: SankeyLinkDatum[] = [];
    incomeStreams.forEach((s, i) =>
      nodes.push({ name: s.label, category: "income", colorIndex: i }),
    );
    nodes.push({ name: "總收入", category: "pool" });
    const grossIdx = nodes.length - 1;
    incomeStreams.forEach((s, i) => {
      if (s.annual > 0) links.push({ source: i, target: grossIdx, value: s.annual });
    });
    nodes.push({ name: "支出", category: "pool" });
    const outboundIdx = nodes.length - 1;
    if (outbound.annual > 0)
      links.push({ source: grossIdx, target: outboundIdx, value: outbound.annual });
    if (net > 0) {
      nodes.push({ name: "淨額", category: "net" });
      links.push({ source: grossIdx, target: nodes.length - 1, value: net });
    }
    if (outbound.vendors_annual > 0) {
      nodes.push({ name: "供應商", category: "outbound" });
      links.push({ source: outboundIdx, target: nodes.length - 1, value: outbound.vendors_annual });
    }
    if (outbound.obligations_annual > 0) {
      nodes.push({ name: "固定支出", category: "outbound" });
      links.push({
        source: outboundIdx,
        target: nodes.length - 1,
        value: outbound.obligations_annual,
      });
    }
    if (outbound.other_annual > 0) {
      nodes.push({ name: "其他", category: "outbound" });
      links.push({ source: outboundIdx, target: nodes.length - 1, value: outbound.other_annual });
    }
    return { nodes, links };
  }, [incomeStreams, outbound, net]);

  if (data.nodes.length === 0) return null;

  return (
    <Panel className="p-4">
      <div className="w-full h-[460px]" data-sensitive>
        <Sankey
          width={1200}
          height={460}
          data={data}
          node={<SankeyNode />}
          link={<SankeyLink />}
          nodePadding={50}
          margin={{ top: 20, bottom: 20, left: 100, right: 100 }}
        >
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-1)",
              border: "1px solid var(--line-1)",
              borderRadius: 8,
              color: "var(--ink-1)",
            }}
            formatter={(v: number) => fmtExact(v)}
          />
        </Sankey>
      </div>
    </Panel>
  );
}

// ─── Tabs ───

type TabKey = "income" | "outbound" | "overall" | "plan";
const TABS: TabSpec<TabKey>[] = [
  { id: "income", label: "收入", icon: ArrowUpCircle, dim: "money", hint: "1" },
  { id: "outbound", label: "支出", icon: ArrowDownCircle, dim: "creative", hint: "2" },
  { id: "overall", label: "總覽", icon: ArrowLeftRight, dim: "freedom", hint: "3" },
  { id: "plan", label: "循環計畫", icon: TrendingUp, dim: "relationships", hint: "4" },
];

const PERIOD_TABS: TabSpec<"monthly" | "annual">[] = [
  { id: "monthly", label: "每月", dim: "freedom" },
  { id: "annual", label: "每年", dim: "freedom" },
];

// ─── Section renderers ───

function SectionGroup({
  title,
  items,
  icon: Icon,
  freshness,
}: {
  title: string;
  items?: Section[];
  icon: LucideIcon;
  freshness?: FreshnessData;
}) {
  if (!items || items.length === 0) return null;
  const accent =
    title === "投資" ? "var(--health)" : title === "目標" ? "var(--relationships)" : "var(--money)";
  const accentClass =
    title === "投資"
      ? "[border-left-color:var(--health)]"
      : title === "目標"
        ? "[border-left-color:var(--relationships)]"
        : "[border-left-color:var(--money)]";
  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
          <Icon className="w-4 h-4" color={accent} /> {title}
        </h2>
        {freshness && <FreshnessIndicator freshness={freshness} />}
      </div>
      <div className="prob-grid">
        {items.map((item, i) => (
          <Panel key={i} className={`border-l-[3px] ${accentClass}`}>
            <h3 className="text-sm font-medium mb-1">{item.heading}</h3>
            <div
              className="text-xs whitespace-pre-wrap line-clamp-5 text-ink-2"
              data-sensitive
            >
              {item.body}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function AccountCategory({ item }: { item: Section }) {
  const ACCOUNT_ICON: Record<string, LucideIcon> = {
    Banking: Landmark,
    "Credit Cards": CreditCard,
    "Investment Accounts": PiggyBank,
    Investments: PiggyBank,
    "Account Processing": Receipt,
  };
  const Icon = ACCOUNT_ICON[item.heading] || DollarSign;
  const subs = parseSubheadings(item.body);
  return (
    <Panel className="border-l-[3px] [border-left-color:var(--money)]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" color="var(--money)" />
        <h3 className="text-sm font-medium uppercase tracking-wider">{item.heading}</h3>
        <span className="ml-auto text-xs text-ink-2">
          {subs.length > 0 ? `${subs.length} 個項目` : ""}
        </span>
      </div>
      {subs.length > 0 ? (
        <div className="space-y-2" data-sensitive>
          {subs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: "var(--rhythms)", opacity: 0.6 }}
              />
              <span>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-xs whitespace-pre-wrap line-clamp-5 text-ink-2"
          data-sensitive
        >
          {item.body}
        </div>
      )}
    </Panel>
  );
}

// ─── Tabs ───

function IncomeTab({ data }: { data: FinancesDataV2 }) {
  const income = data.income;
  const streams = income?.streams ?? data.incomeStreams ?? [];
  const incomeFreshness = data.freshness_per_card?.income ?? data.freshness;
  return (
    <div className="space-y-6">
      {income && <IncomeHero data={income} freshness={incomeFreshness} />}
      {streams.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" color="var(--money)" /> 收入來源
          </h2>
          <div className="prob-grid">
            {streams.map((s) => (
              <StreamCard key={s.label} stream={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OutboundSubgroup({
  title,
  icon: Icon,
  lines,
}: {
  title: string;
  icon: LucideIcon;
  lines: ResolvedLine[];
}) {
  if (lines.length === 0) return null;
  const total = lines.reduce((s, l) => s + l.annual_usd, 0);
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
          <Icon className="w-4 h-4" color="var(--creative)" /> {title}
        </h3>
        <span className="text-xs tabular-nums text-ink-2" data-sensitive>
          {fmtHero(total / 12)}／月 · {fmtHero(total)}／年
        </span>
      </div>
      <div className="prob-grid">
        {lines.map((l) => (
          <LineRow key={l.id} line={l} tone="outbound" />
        ))}
      </div>
    </section>
  );
}

function InsightLineRow({ line, accent }: { line: InsightLine; accent: string }) {
  // Honest cadence labels — only true monthly_recurring shows /yr projection prominently.
  // observed_one_month and one_time show "$X observed (1mo)" so the user sees what we actually saw.
  const isUncertain = line.cadence === "observed_one_month" || (line.cadence === "one_time" && line.charge_count >= 2);
  const cadenceLabel =
    line.cadence === "monthly_recurring"
      ? `${line.active_months} 個月共 ${line.charge_count} 次 · 每月`
      : line.cadence === "annual_subscription"
        ? "年度訂閱"
        : line.cadence === "observed_one_month"
          ? `一個月內 ${line.charge_count} 次 · 僅實際觀察`
          : "單次";
  const confidenceColor =
    line.confidence === "high" ? "var(--health)" : line.confidence === "medium" ? "var(--money)" : "var(--ink-2)";
  return (
    <div
      className="bg-surface-2 border border-line-2 rounded-xl p-3.5 border-l-[3px]"
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium truncate">{line.display}</span>
        <span className="text-base font-medium tabular-nums" style={{ color: accent }} data-sensitive>
          {isUncertain ? fmtHero(line.observed_usd) : fmtHero(line.annual_usd)}
          <span className="text-[12px] text-ink-2 ml-1">{isUncertain ? "已觀察" : "／年"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-ink-2 flex-wrap mt-1">
        {!isUncertain && line.monthly_usd > 0 && (
          <>
            <span data-sensitive>{fmtHero(line.monthly_usd)}／月</span>
            <span>·</span>
          </>
        )}
        <span>{cadenceLabel}</span>
        <span>·</span>
        <span style={{ color: confidenceColor }}>可信度： {displayLabel(line.confidence)}</span>
        {line.tags.length > 0 && (
          <>
            <span>·</span>
            <span>{line.tags.slice(0, 3).map(displayLabel).join("／")}</span>
          </>
        )}
      </div>
      {line.reason && (
        <p className="text-[12px] mt-1" style={{ color: "var(--err)" }}>{line.reason}</p>
      )}
    </div>
  );
}

function InsightSection({
  title,
  icon: Icon,
  accent,
  description,
  lines,
  emptyHint,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  description?: string;
  lines: InsightLine[];
  emptyHint: string;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
            <Icon className="w-4 h-4" color={accent} /> {title}
          </h3>
          {description && <p className="text-[12px] text-ink-2 mt-1">{description}</p>}
        </div>
        {lines.length > 0 && (
          <span className="text-xs tabular-nums text-ink-2" data-sensitive>
            {fmtHero(lines.reduce((s, l) => s + l.annual_usd, 0))}／年 · {lines.length} 個項目
          </span>
        )}
      </div>
      {lines.length === 0 ? (
        <Panel className="p-4">
          <p className="text-xs text-ink-2">{emptyHint}</p>
        </Panel>
      ) : (
        <div className="prob-grid">
          {lines.map((l, i) => (
            <InsightLineRow key={`${l.display}-${i}`} line={l} accent={accent} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryBreakdown({ categories, total }: { categories: SpendInsights["by_category"]; total: number }) {
  if (categories.length === 0) return null;
  const max = Math.max(...categories.map(c => c.annual_usd), 1);
  const CATEGORY_LABEL: Record<string, string> = {
    taxes: "稅務", payroll: "薪資與承包商",
    ai: "AI", infrastructure: "基礎設施", saas: "軟體服務與訂閱",
    food: "餐飲", transportation: "交通", utilities: "水電與公共服務",
    entertainment: "娛樂", health: "健康", news: "新聞", shopping: "購物",
    travel: "旅行", "business-services": "商業服務", debt: "債務", advertising: "廣告",
    other: "其他",
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
          <PieChart className="w-4 h-4" color="var(--relationships)" /> 分類支出
        </h3>
        <span className="text-xs tabular-nums text-ink-2" data-sensitive>{fmtHero(total)}／年 · 已記錄總額</span>
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-2.5">
          {categories.map((c) => {
            const pct = total > 0 ? Math.round((c.annual_usd / total) * 100) : 0;
            const barPct = (c.annual_usd / max) * 100;
            return (
              <div key={c.category} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="tabular-nums text-ink-2" data-sensitive>
                    {fmtHero(c.annual_usd)}／年 · {c.merchants} {c.merchants === 1 ? "商家" : "商家"} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-1)" }}>
                  <div
                    className="h-full"
                    style={{ width: `${barPct}%`, background: "var(--money)", opacity: 0.8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

function SpendInsightsSection({ insights }: { insights: SpendInsights }) {
  return (
    <div className="space-y-6 pt-4" style={{ borderTop: "1px solid var(--line-1)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" color="var(--money)" /> 支出分析
          </h2>
          <p className="text-[12px] text-ink-2 mt-1">
            資料來自此處的對帳單 CSV： <code className="text-ink-1">FINANCES/Statements/*</code>。重新分析可執行： <code className="text-ink-1">bun ~/.config/LIFEOS/USER/FINANCES/Tools/StatementAnalyzer.ts</code>.
          </p>
        </div>
        {insights.statement_spend.generated_at && (
          <span className="text-[12px] text-ink-2">
            {insights.statement_spend.record_count} 個商家 · 產生於{" "}
            {new Date(insights.statement_spend.generated_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Shanghai",
              month: "short", day: "numeric", year: "numeric",
            })}
          </span>
        )}
      </div>

      <CategoryBreakdown categories={insights.by_category} total={insights.total_annualized} />

      <InsightSection
        title="主要帳單"
        icon={Trophy}
        accent="var(--money)"
        description="依所有來源的年化支出排列，排除帳戶間轉帳。"
        lines={insights.top_bills}
        emptyHint="尚無對帳單彙整資料。完成對帳單分析後即可查看。"
      />

      <InsightSection
        title="主要 AI 服務"
        icon={Cpu}
        accent="var(--relationships)"
        description="依年化支出排列 AI 服務的實際成本。"
        lines={insights.top_ai_services}
        emptyHint="尚未辨識到 AI 服務。可將更多對帳單 CSV 放入 FINANCES/Statements/。"
      />

      <InsightSection
        title="主要基礎設施服務"
        icon={Server}
        accent="var(--freedom)"
        description="雲端、代管、開發、監控與網路服務。"
        lines={insights.top_infrastructure_services}
        emptyHint="尚未辨識到基礎設施服務。"
      />

      <InsightSection
        title="可檢視的支出"
        icon={Scissors}
        accent="var(--creative)"
        description="可進一步檢視的訂閱：使用較少的年度方案、經常性費用與功能重疊的工具。"
        lines={insights.cut_candidates}
        emptyHint="目前未辨識出明顯可刪減項目，也可能是資料仍不足。"
      />
    </div>
  );
}

function OutboundTab({ data }: { data: FinancesDataV2 }) {
  const outbound = data.outbound;
  const outboundFreshness = data.freshness_per_card?.outbound ?? data.freshness;
  if (!outbound) {
    return (
      <Panel>
        <p className="text-sm text-center text-ink-2">
          暫時無法讀取支出資料，請檢查{" "}
          <code className="text-ink-1">
            ~/.config/LIFEOS/USER/FINANCES/vendors.yaml
          </code>
          .
        </p>
      </Panel>
    );
  }
  return (
    <div className="space-y-6">
      <OutboundHero data={outbound} freshness={outboundFreshness} />
      <OutboundSubgroup
        title="供應商與服務"
        icon={Server}
        lines={outbound.vendors}
      />
      <OutboundSubgroup
        title="個人固定支出"
        icon={Home}
        lines={outbound.obligations}
      />
      <OutboundSubgroup title="其他" icon={Receipt} lines={outbound.other} />
      {data.insights && <SpendInsightsSection insights={data.insights} />}
    </div>
  );
}

function OverallTab({
  data,
  periodView,
  onPeriodChange,
}: {
  data: FinancesDataV2;
  periodView: "monthly" | "annual";
  onPeriodChange: (v: "monthly" | "annual") => void;
}) {
  const overall = data.overall;
  const income = data.income;
  const outbound = data.outbound;
  if (!overall || !income || !outbound) {
    return (
      <Panel>
        <p className="text-sm text-center text-ink-2">暫時無法讀取財務總覽。</p>
      </Panel>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <TabBar tabs={PERIOD_TABS} active={periodView} onChange={onPeriodChange} />
      </div>
      <OverallHero
        data={overall}
        periodView={periodView}
        freshness={data.freshness_per_card?.overall ?? data.freshness}
      />
      <FinancesSankey
        incomeStreams={income.streams}
        outbound={outbound}
        net={overall.net_pre_tax_annual}
      />
      <TrendChart trend={overall.trend} />
      {data.accounts && data.accounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2 flex items-center gap-2">
              <Landmark className="w-4 h-4" color="var(--money)" /> 帳戶
            </h2>
            <FreshnessIndicator freshness={data.freshness_per_card?.accounts} />
          </div>
          <div className="prob-grid">
            {data.accounts.map((item, i) => (
              <AccountCategory key={i} item={item} />
            ))}
          </div>
        </section>
      )}
      <SectionGroup
        title="投資"
        items={data.investments}
        icon={PiggyBank}
        freshness={data.freshness_per_card?.investments}
      />
      <SectionGroup title="目標" items={data.goals} icon={Target} />
      <SectionGroup
        title="稅務"
        items={data.taxes}
        icon={Receipt}
        freshness={data.freshness_per_card?.taxes}
      />
    </div>
  );
}

// ─── Plan tab (forward financial model + flywheel) ───

// Minimal inline-markdown renderer: **bold**, `- bullets`, pipe-tables, and
// paragraphs. Presentation only — every string comes from PLAN.md via the API.
function boldify(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-ink-1">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function PlanBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("|")) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tbl.push(lines[i].trim()); i++; }
      const cells = (l: string) => l.split("|").slice(1, -1).map((c) => c.replace(/\*\*/g, "").trim());
      const isSep = (l: string) => /^\|[\s|:-]+\|?$/.test(l);
      const rows = tbl.filter((l) => !isSep(l)).map(cells);
      if (rows.length) {
        const [head, ...rest] = rows;
        blocks.push(
          <div key={key++} className="overflow-x-auto my-2">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>{head.map((h, j) => (
                  <th key={j} className="text-left px-2 py-1.5 text-xs uppercase tracking-wide text-ink-2" style={{ borderBottom: "1px solid var(--line-1)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>{rest.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => (
                  <td key={ci} className="px-2 py-1.5" style={{ color: ci === 0 ? "var(--ink-1)" : "var(--ink-2)", borderBottom: "1px solid var(--line-1)" }}>{c}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) { items.push(lines[i].trim().slice(2)); i++; }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-2 text-ink-2">
          {items.map((it, j) => <li key={j}>{boldify(it)}</li>)}
        </ul>
      );
      continue;
    }
    if (line.trim()) {
      blocks.push(<p key={key++} className="my-2 text-ink-2">{boldify(line.trim())}</p>);
    }
    i++;
  }
  return <>{blocks}</>;
}

function FlywheelLoop({ stages }: { stages: { n: number; stage: string; text: string }[] }) {
  if (!stages.length) return null;
  // Distinct per-stage loop colors (chart-style scale, not semantic tokens).
  const palette = ["#97bdd2", "#b5e5d5", "#d9c49e", "#b8b2cf", "#8ec7bc", "#e8aaa0"];
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4" color="var(--accent-blue)" />
        <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2">循環計畫</h2>
        <span className="text-[12px] text-ink-2 ml-1">↻ 每一輪帶動下一步</span>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {stages.map((s, i) => {
          const color = palette[i % palette.length];
          return (
            <div
              key={s.n}
              className="bg-surface-2 border border-line-2 rounded-xl p-5 border-t-[3px]"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
                  style={{ background: color, color: "var(--ground)" }}>{s.n}</span>
                <span className="font-medium text-ink-1">{s.stage}</span>
                <span className="ml-auto text-lg" style={{ color, opacity: 0.7 }}>
                  {i === stages.length - 1 ? "↻" : "→"}
                </span>
              </div>
              <p className="text-sm text-ink-2">{s.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlanTab({ data }: { data: FinancesDataV2 }) {
  const plan = data.plan;
  if (!plan || !plan.present) {
    return (
      <Panel>
        <p className="text-sm text-center text-ink-2">
          尚未建立計畫。加入 <code>USER/FINANCES/PLAN.md</code> 後，即可在這裡查看循環、目標與產品階梯。
        </p>
      </Panel>
    );
  }
  const special = /^(flywheel|targets)$/i;
  const about = plan.sections.find((s) => /^about/i.test(s.heading));
  const rest = plan.sections.filter((s) => !special.test(s.heading) && !/^about/i.test(s.heading));
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <FreshnessIndicator freshness={data.freshness_per_card?.plan} />
      </div>

      {about && (
        <Panel className="border-l-[3px] [border-left-color:var(--money)]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" color="var(--money)" />
            <span className="text-xs uppercase tracking-widest text-ink-2">{about.heading}</span>
          </div>
          <PlanBody body={about.body} />
        </Panel>
      )}

      <FlywheelLoop stages={plan.flywheel} />

      {plan.targets && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" color="var(--health)" />
            <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2">目標</h2>
          </div>
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>{plan.targets.headers.map((h, j) => (
                  <th key={j} className="text-left px-2 py-2 text-xs uppercase tracking-wide text-ink-2" style={{ borderBottom: "1px solid var(--line-1)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>{plan.targets.rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => (
                  <td key={ci} className="px-2 py-2" style={{ color: ci === 0 ? "var(--ink-1)" : "var(--ink-2)", borderBottom: "1px solid var(--line-1)" }}>{c}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </Panel>
        </section>
      )}

      {rest.map((s, i) => (
        <section key={i}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" color="var(--relationships)" />
            <h2 className="text-sm font-medium uppercase tracking-widest text-ink-2">{sectionLabel(s.heading)}</h2>
          </div>
          <Panel>
            <PlanBody body={s.body} />
          </Panel>
        </section>
      ))}
    </div>
  );
}

// ─── Page ───

export default function FinancesPage() {
  const [data, setData] = useState<FinancesDataV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("income");
  const [periodView, setPeriodView] = useState<"monthly" | "annual">("monthly");

  // Load data
  useEffect(() => {
    fetch("/api/life/finances")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: FinancesDataV2) => {
        setCurrency(json.currency);
        setData(presentFinanceData(json));
      })
      .catch((e) => setError("連線未完成，請檢查本機服務後再試。"));
  }, []);

  // Hash-routed tab state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const valid = (k: string): k is TabKey =>
      k === "income" || k === "outbound" || k === "overall" || k === "plan";
    const hash = window.location.hash.replace("#", "");
    if (valid(hash)) setTab(hash);
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (valid(h)) setTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Keyboard 1/2/3 cycles tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "1") changeTab("income");
      else if (e.key === "2") changeTab("outbound");
      else if (e.key === "3") changeTab("overall");
      else if (e.key === "4") changeTab("plan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeTab = (k: TabKey) => {
    setTab(k);
    if (typeof window !== "undefined") window.location.hash = k;
  };

  if (error) {
    return (
      <PageShell>
        <Panel className="border-l-[3px] [border-left-color:var(--err)]">
          <h2 className="font-medium text-err">財務資料讀取失敗</h2>
          <p className="text-sm text-err">{error}</p>
        </Panel>
      </PageShell>
    );
  }
  if (!data) return <div className="p-8 text-sm text-ink-2">正在讀取財務資料…</div>;

  const incomeAnnual = data.income?.annual ?? data.annualIncome ?? 0;
  const outboundAnnual = data.outbound?.annual ?? data.annualExpenses ?? 0;
  const incomeStreams = data.income?.streams ?? data.incomeStreams ?? [];
  const isFreshInstall =
    incomeAnnual === 0 &&
    outboundAnnual === 0 &&
    incomeStreams.length === 0 &&
    ([data.accounts, data.goals, data.expenses, data.investments, data.taxes, data.overview].every((sections) => !sections?.length)) &&
    !data.plan?.present &&
    !(data.collector_status?.active_collectors?.length) &&
    !(data.outbound && [...data.outbound.vendors, ...data.outbound.obligations, ...data.outbound.other].length > 0);

  return (
    <PageShell>
      <PageHeader
        icon={DollarSign}
        title="財務"
        subtitle="收入 · 支出 · 總覽 · 循環計畫；按 1／2／3／4 切換分頁"
      />
      {!isFreshInstall && <TabBar tabs={TABS} active={tab} onChange={changeTab} />}

      {isFreshInstall && (
        <EmptyStateGuide
          section="財務"
          description="尚未提供個人財務紀錄。安裝範例不會作為帳戶、收支或資產計算；加入自己的資料後，即可查看長期變化。"
          userDir="FINANCES"
          daPromptExample="協助我連接財務資料來源"
        />
      )}

      {!isFreshInstall && tab === "income" && <IncomeTab data={data} />}
      {!isFreshInstall && tab === "outbound" && <OutboundTab data={data} />}
      {!isFreshInstall && tab === "overall" && (
        <OverallTab data={data} periodView={periodView} onPeriodChange={setPeriodView} />
      )}
      {!isFreshInstall && tab === "plan" && <PlanTab data={data} />}
    </PageShell>
  );
}
