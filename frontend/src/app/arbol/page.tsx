"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Cloud, ArrowLeft, Box, GitBranch, Timer, ShieldCheck, ShieldAlert, ChevronRight } from "lucide-react";
import Link from "next/link";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  StatTile,
  Pill,
  type Dim,
} from "@/components/ui/chrome";

interface ArbolWorker {
  name: string;
  type: "action" | "pipeline" | "flow";
  cfName: string | null;
  lastModified: string;
}

interface ArbolDetail {
  name: string;
  type: "action" | "pipeline" | "flow";
  wrangler: string | null;
  source: string | null;
  lastModified: string;
}

const TYPE_CONFIG = {
  action: { icon: Box, color: "var(--creative)", label: "動作", prefix: "A_", dim: "creative" },
  pipeline: { icon: GitBranch, color: "var(--freedom)", label: "管線", prefix: "P_", dim: "freedom" },
  flow: { icon: Timer, color: "var(--rhythms)", label: "流程", prefix: "F_", dim: "rhythms" },
} as const;

// ── Security scan status strip (compact; links to the full Security view) ──
// Same private, runtime-only source as the Security page. Shows at-a-glance scan health
// here because the security scan runs on Arbol infrastructure — full detail lives on /security.
interface ScanSummary {
  scan: { timestamp: string | null; targetsScanned: number; findingCounts: { critical: number; high: number } } | null;
}

function relTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} 小時前` : `${Math.round(hrs / 24)} 天前`;
}

function SecurityScanStrip() {
  const { data } = useQuery<ScanSummary>({
    queryKey: ["arbol-security-scan"],
    queryFn: async () => {
      const response = await fetch("/api/security/attack-surface");
      if (!response.ok) throw new Error("尚無法確認掃描狀態");
      return response.json();
    },
    refetchInterval: 60_000,
  });
  const scan = data?.scan;
  const crit = scan?.findingCounts?.critical;
  const high = scan?.findingCounts?.high;
  const hasScan = !!scan?.timestamp && !Number.isNaN(Date.parse(scan.timestamp))
    && typeof crit === "number" && Number.isFinite(crit) && crit >= 0
    && typeof high === "number" && Number.isFinite(high) && high >= 0;
  const clean = hasScan && crit === 0 && high === 0;
  const Icon = clean ? ShieldCheck : ShieldAlert;

  return (
    <Link href="/security" className="block group">
      <Panel className="p-3 transition-colors hover:bg-[var(--surface-2)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${!hasScan ? "text-ink-3" : clean ? "text-ok" : "text-err"}`} />
            <span className="text-sm font-medium text-ink-1">攻擊面掃描</span>
            <Pill dim={!hasScan ? "neutral" : clean ? "ok" : "err"}>{!hasScan ? "未知" : clean ? "無異常" : `${crit} 項嚴重 · ${high} 項高風險`}</Pill>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span className="mono">{hasScan ? scan?.targetsScanned ?? "—" : "—"} 個目標</span>
            <span>{hasScan ? `最近掃描 · ${relTimeShort(scan?.timestamp)}` : "尚無掃描紀錄 · 排程未確認"}</span>
            <span className="flex items-center gap-0.5 text-ink-3 group-hover:text-ink-1">詳細內容 <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

function ArbolLanding({
  workers,
  actions,
  pipelines,
  flows,
}: {
  workers: ArbolWorker[];
  actions: number;
  pipelines: number;
  flows: number;
}) {
  const grouped = {
    action: workers.filter((w) => w.type === "action"),
    pipeline: workers.filter((w) => w.type === "pipeline"),
    flow: workers.filter((w) => w.type === "flow"),
  };

  return (
    <PageShell>
      <PageHeader
        title="雲端工作流程"
        subtitle="在 Cloudflare Workers 執行雲端工作：動作是單次工作，管線串接工作，流程則定時連接來源與目的地。"
        icon={Cloud}
        actions={<Pill dim="relationships">雲端網絡</Pill>}
      />

      <SecurityScanStrip />

      {workers.length === 0 && (
        <EmptyStateGuide
          section="Arbol 管線"
          description="以雲端動作與管線組成多步驟工作流程。"
          hideInterview
          daPromptExample="協助我建立第一個 Arbol 動作"
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="總計" value={workers.length} icon={Cloud} dim="relationships" />
        {(["action", "pipeline", "flow"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const count = type === "action" ? actions : type === "pipeline" ? pipelines : flows;
          return (
            <StatTile
              key={type}
              label={cfg.label}
              value={count}
              icon={cfg.icon}
              dim={cfg.dim as Dim}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["action", "pipeline", "flow"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const typeWorkers = grouped[type];

          return (
            <div key={type} className="flex flex-col gap-3">
              <h2
                className="text-sm font-medium uppercase tracking-wider flex items-center gap-2 text-ink-3"
              >
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                {cfg.label}
                <span className="text-ink-3 text-[12px]">({typeWorkers.length})</span>
              </h2>
              <div className="flex flex-col gap-2">
                {typeWorkers.map((worker) => (
                  <Link
                    key={worker.name}
                    href={`/arbol?name=${encodeURIComponent(worker.name)}`}
                    className="flex items-center gap-2 bg-surface-2 border border-line-2 rounded-xl px-3.5 py-2.5 transition-colors duration-200 hover:bg-surface-3 hover:border-line-3"
                    style={{ borderLeft: `3px solid ${cfg.color}` }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                    <span className="mono truncate text-ink-1 text-[13px]">
                      {worker.name.replace(/^_(A|P|F)_/, "")}
                    </span>
                    <Pill dim={cfg.dim as Dim} className="ml-auto">
                      {cfg.label}
                    </Pill>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

function ArbolDetailView({ detail }: { detail: ArbolDetail }) {
  const cfg = TYPE_CONFIG[detail.type];
  const Icon = cfg.icon;

  return (
    <PageShell className="max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/arbol" className="text-ink-2 hover:text-ink-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            <Pill dim={cfg.dim as Dim}>{cfg.label}</Pill>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1 text-ink-1">{detail.name}</h1>
          <p className="mt-0.5 text-ink-3 text-[13px]">
            {new Date(detail.lastModified).toLocaleDateString("zh-TW", { timeZone: "Asia/Shanghai", 
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {detail.wrangler && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
            wrangler.jsonc
          </h2>
          <Panel className="p-0 overflow-hidden">
            <pre
              className="text-xs mono overflow-x-auto leading-relaxed p-4 text-ink-2"
              style={{ background: "var(--ground)", margin: 0 }}
            >
              <code>{detail.wrangler}</code>
            </pre>
          </Panel>
        </div>
      )}

      {detail.source && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
            src/index.ts
          </h2>
          <Panel className="p-0 overflow-hidden">
            <pre
              className="text-xs mono overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed p-4 text-ink-2"
              style={{ background: "var(--ground)", margin: 0 }}
            >
              <code>{detail.source}</code>
            </pre>
          </Panel>
        </div>
      )}

      {!detail.wrangler && !detail.source && (
        <p className="text-ink-2 text-sm">此工作單元中找不到可讀取的檔案。</p>
      )}
    </PageShell>
  );
}

function ArbolPageInner() {
  const searchParams = useSearchParams();
  const workerName = searchParams.get("name");
  const isViewing = !!workerName;

  const { data: listData } = useQuery<{
    workers: ArbolWorker[];
    total: number;
    actions: number;
    pipelines: number;
    flows: number;
  }>({
    queryKey: ["arbol-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/arbol");
      if (!res.ok) throw new Error("無法取得 Arbol 工作單元");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData } = useQuery<ArbolDetail>({
    queryKey: ["arbol-detail", workerName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/arbol/${encodeURIComponent(workerName!)}`);
      if (!res.ok) throw new Error("無法取得工作單元");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <ArbolDetailView detail={detailData} />;
  }

  if (!isViewing && listData) {
    return (
      <ArbolLanding
        workers={listData.workers}
        actions={listData.actions}
        pipelines={listData.pipelines}
        flows={listData.flows}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-ink-3 text-sm">載入中…</div>
    </div>
  );
}

export default function ArbolPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-ink-3 text-sm">載入中…</div>
        </div>
      }
    >
      <ArbolPageInner />
    </Suspense>
  );
}
