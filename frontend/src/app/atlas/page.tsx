"use client";

import { displayLabel } from "@/lib/zh-TW";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Waypoints, Boxes, Share2, AlertTriangle, Clock, Database, Lightbulb, RefreshCw } from "lucide-react";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  Pill,
  EmptyState,
  type TabSpec,
} from "@/components/ui/chrome";
import { AtlasGraph, type GNode, type GEdge } from "./AtlasGraph";

/**
 * Atlas tab — the graph-based current-state asset management system.
 *
 * GRAPH    — live d3-force graph: drag nodes, zoom/pan, hover to isolate.
 * INSIGHTS — deterministic metrics + an Inference-generated narrative across
 *            system-operation / security / interconnection, regenerated on change.
 * BROWSE   — kind → asset table with per-source observations.
 * GAPS     — auth-curation gaps + stale assets + lifecycle events.
 *
 * Holds ZERO data: /api/atlas (snapshot) + /api/atlas/insights (metrics + narrative).
 */

interface Asset extends GNode { first_observed_at: string; last_observed_at: string }
interface Obs { asset_id: number; collector: string; fresh: number; last_seen: string }
interface Payload {
  available: boolean;
  error?: string;
  snapshot_age_ms?: number;
  assets?: Asset[];
  edges?: GEdge[];
  observations?: Obs[];
  lifecycle?: Array<{ asset_id: number; event: string; at: string; detail: string }>;
  unregistered?: Array<{ canonical_key: string; display_name: string; served_by: string }>;
}
interface InsightsPayload {
  available: boolean;
  metrics?: Record<string, any>;
  narrative?: string | null;
  narrative_generated_at?: string | null;
  stale?: boolean;
  generating?: boolean;
}

type Tab = "graph" | "insights" | "browse" | "gaps";
const TABS: TabSpec<Tab>[] = [
  { id: "graph", label: "關係圖", icon: Waypoints },
  { id: "insights", label: "洞察", icon: Lightbulb },
  { id: "browse", label: "瀏覽", icon: Boxes },
  { id: "gaps", label: "缺口", icon: AlertTriangle },
];

const GRAPH_KINDS = ["project", "worker", "domain", "target", "system", "repo", "service", "dns_record"];

// Minimal, dependency-free markdown → elements for the ## sections the narrative uses.
function Narrative({ md }: { md: string }) {
  const blocks = md.split(/\n(?=## )/);
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, i) => {
        const m = b.match(/^##\s+(.+)/);
        const heading = m?.[1];
        const body = heading ? b.replace(/^##\s+.+\n?/, "") : b;
        return (
          <div key={i}>
            {heading && <h3 className="text-ink-1 font-medium mb-1">{heading}</h3>}
            <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{body.trim()}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function AtlasPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>("graph");
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set(["project", "worker", "domain", "target", "system"]));
  const [tableKind, setTableKind] = useState<string | null>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [insights, setInsights] = useState<InsightsPayload | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/atlas").then((r) => r.json()).then((d) => live && setData(d)).catch(() => live && setData({ available: false, error: "讀取失敗" }));
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const loadInsights = useCallback(() => {
    fetch("/api/atlas/insights").then((r) => r.json()).then(setInsights).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "insights") return;
    loadInsights();
    const t = setInterval(loadInsights, 8000); // poll while a generation may be running
    return () => clearInterval(t);
  }, [tab, loadInsights]);

  const regenerate = useCallback(() => {
    fetch("/api/atlas/insights/regenerate", { method: "POST" }).then(() => setTimeout(loadInsights, 1500));
  }, [loadInsights]);

  const assets = data?.assets ?? [];
  const edges = data?.edges ?? [];
  const observations = data?.observations ?? [];
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) m.set(a.kind, (m.get(a.kind) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [assets]);
  const obsByAsset = useMemo(() => {
    const m = new Map<number, Obs[]>();
    for (const o of observations) (m.get(o.asset_id) ?? m.set(o.asset_id, []).get(o.asset_id)!).push(o);
    return m;
  }, [observations]);
  const staleAssets = assets.filter((a) => a.status !== "active");
  const toggleKind = (k: string) =>
    setKindFilter((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  if (!data) return <PageShell><EmptyState icon={Waypoints} title="正在載入資產圖譜…" /></PageShell>;
  if (!data.available) {
    return (
      <PageShell>
        <PageHeader title="資產圖譜" icon={Waypoints} subtitle="以關係圖管理資產現況" />
        <EmptyState icon={Database} title="尚無快照" hint={data.error ?? "請執行資產圖譜同步。"} />
      </PageShell>
    );
  }

  const ageMin = Math.round((data.snapshot_age_ms ?? 0) / 60000);

  return (
    <PageShell>
      <PageHeader title="資產圖譜" icon={Waypoints} subtitle={`資產關係與現況 · 快照更新於 ${ageMin} 分鐘前`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="資產" value={String(assets.length)} icon={Boxes} />
        <StatTile label="連結" value={String(edges.filter((e) => e.status === "active").length)} icon={Share2} />
        <StatTile label="未整理驗證邊界" value={String(data.unregistered?.length ?? 0)} icon={AlertTriangle} />
        <StatTile label="過期" value={String(staleAssets.length)} icon={Clock} />
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "graph" && (
        <Panel>
          <PanelHeader title="資產關係圖" meta="拖曳節點 · 滾動縮放 · 停留以查看相鄰關係" />
          <div className="flex flex-wrap gap-2 pb-3">
            {GRAPH_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => toggleKind(k)} className="cursor-pointer">
                <Pill className={kindFilter.has(k) ? "" : "opacity-40"}>{displayLabel(k)}</Pill>
              </button>
            ))}
          </div>
          <AtlasGraph nodes={assets} edges={edges} kindFilter={kindFilter} onSelect={setSelected} />
          {selected && (
            <div className="pt-3 text-sm">
              <span className="text-ink-1 font-medium">{selected.display_name}</span>
              <span className="text-ink-3"> · {displayLabel(selected.kind)} · {selected.canonical_key}</span>
            </div>
          )}
        </Panel>
      )}

      {tab === "insights" && (
        <div className="flex flex-col gap-4">
          {insights?.metrics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="已提供服務的工作單元"
                value={`${insights.metrics.worker_wiring?.served ?? "—"}/${insights.metrics.worker_wiring?.total ?? "—"}`}
                sub="網域 · workers.dev · 路由"
              />
              <StatTile label="尚未接通的工作單元" value={String(insights.metrics.unwired_workers ?? "—")} sub="尚無任何呼叫路徑" />
              <StatTile label="已整理的目標" value={String(insights.metrics.curated_targets ?? "—")} sub="已掃描驗證邊界" />
              <StatTile label="資料儲存" value={String((insights.metrics.data_stores ?? []).reduce((s: number, d: any) => s + d.n, 0))} sub="d1 · r2 · kv" />
            </div>
          )}
          <Panel>
            <PanelHeader
              title="AI 洞察"
              meta={
                insights?.generating
                  ? "產生中…"
                  : insights?.narrative_generated_at
                    ? `產生於 ${new Date(insights.narrative_generated_at).toLocaleString("zh-TW", { timeZone: "Asia/Shanghai" })}${insights?.stale ? " · 產生後關係圖已有變更" : ""}`
                    : "尚未產生"
              }
              actions={
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={insights?.generating}
                  className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${insights?.generating ? "animate-spin" : ""}`} /> 重新產生
                </button>
              }
            />
            {insights?.narrative ? (
              <Narrative md={insights.narrative} />
            ) : (
              <EmptyState
                icon={Lightbulb}
                title={insights?.generating ? "正在產生洞察…" : "尚無洞察"}
                hint={insights?.generating ? "正在分析目前的關係圖。" : "點選重新產生以開始分析。"}
              />
            )}
          </Panel>
          {insights?.metrics?.blast_zones && (
            <Panel>
              <PanelHeader title="影響範圍" meta="刪除後會失去最多關聯的項目，依所屬紀錄數排序" />
              <div className="text-sm">
                {insights.metrics.blast_zones.map((z: any) => (
                  <div key={z.zone} className="flex items-center justify-between border-b border-line-1 py-1">
                    <span className="text-ink-1">{z.zone}</span>
                    <span className="text-ink-3 font-mono text-xs">{z.owns} 個所屬項目</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {tab === "browse" && (
        <Panel>
          <PanelHeader title="依類型查看資產" meta="每項資產保留各來源的觀察紀錄" />
          <div className="flex flex-wrap gap-2 pb-3">
            {kinds.map(([k, n]) => (
              <button key={k} type="button" onClick={() => setTableKind(tableKind === k ? null : k)} className="cursor-pointer">
                <Pill className={tableKind === k ? "" : "opacity-50"}>{displayLabel(k)} · {n}</Pill>
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-3 border-b border-line-2">
                  <th className="py-1 pr-3 font-normal">資產</th>
                  <th className="py-1 pr-3 font-normal">識別碼</th>
                  <th className="py-1 pr-3 font-normal">狀態</th>
                  <th className="py-1 font-normal">觀察來源</th>
                </tr>
              </thead>
              <tbody>
                {assets.filter((a) => !tableKind || a.kind === tableKind).slice(0, 200).map((a) => (
                  <tr key={a.id} className="border-b border-line-1">
                    <td className="py-1 pr-3 text-ink-1">{a.display_name}</td>
                    <td className="py-1 pr-3 text-ink-3 font-mono text-xs">{a.canonical_key}</td>
                    <td className="py-1 pr-3"><span className={a.status === "active" ? "text-[color:var(--ok)]" : "text-[color:var(--warn)]"}>{displayLabel(a.status)}</span></td>
                    <td className="py-1 text-xs text-ink-2">{(obsByAsset.get(a.id) ?? []).map((o) => `${o.collector}${o.fresh ? "" : "（已移除）"}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "gaps" && (
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              title={`尚未整理驗證邊界覆蓋範圍 — ${data.unregistered?.length ?? 0}`}
              meta="這些網域每小時仍會接受基本掃描，但尚未建立驗證邊界目標；靜態網站可能不需要，需登入的應用則應補充。"
            />
            {(data.unregistered?.length ?? 0) === 0 ? (
              <EmptyState icon={AlertTriangle} title="完整覆蓋" />
            ) : (
              <div className="text-sm">
                {data.unregistered!.map((u) => (
                  <div key={u.canonical_key} className="flex justify-between border-b border-line-1 py-1">
                    <span className="text-ink-1">{u.display_name}</span>
                    <span className="text-ink-3 text-xs">服務來源 {u.served_by}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader title={`過期資產 — ${staleAssets.length}`} meta="過去曾觀察到，但最近沒有收集器再次觀察到" />
            {staleAssets.length === 0 ? (
              <EmptyState icon={Clock} title="沒有過期資產" />
            ) : (
              <div className="text-sm">
                {staleAssets.slice(0, 60).map((a) => (
                  <div key={a.id} className="flex justify-between border-b border-line-1 py-1">
                    <span className="text-ink-1">{a.display_name} <span className="text-ink-3 text-xs">({displayLabel(a.kind)})</span></span>
                    <span className="text-ink-3 text-xs">最近觀察 {a.last_observed_at.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
