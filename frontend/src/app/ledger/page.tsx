"use client";

import { displayLabel } from "@/lib/zh-TW";

/**
 * Ledger — the change-tracking read surface.
 * What changed, when, at what version, verified how — system edits and estate deploys.
 * Data: GET /api/ledger (modules/ledger.ts). This page holds zero data logic.
 */

import { useEffect, useState } from "react";
import {
  GitCommitVertical,
  Package,
  Rocket,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PageShell,
  Panel,
  PanelHeader,
  Pill,
  StatTile,
  type Dim,
} from "@/components/ui/chrome";

interface LedgerPayload {
  generated_at: string;
  versions: { lifeos: string | null; algorithm: string | null; system_prompt: string | null };
  registry: {
    last_updated: string | null;
    total_updates: number | null;
    recent: {
      timestamp: string;
      title: string;
      significance: string | null;
      change_type: string | null;
      version: string | null;
      files: number;
    }[];
  } | null;
  deploys: {
    ts: string;
    project: string;
    target: string;
    domain: string | null;
    sha: string | null;
    version: string | null;
    ok: boolean;
  }[];
  integrity: {
    last_run: { ts: string; exitCode: number; blocking: number; info?: number } | null;
    clean: boolean | null;
  };
  drift: { ts: string; count: number; tag: string } | null;
  errors: string[];
}

const SIG_DIM: Record<string, Dim> = {
  critical: "err",
  major: "warn",
  moderate: "blue",
  minor: "neutral",
  trivial: "neutral",
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/ledger")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        // Clear the error on success — the 60s poll recovers, but the error
        // branch renders first and never released the page once it was set.
        // ported from public PR #1735, @elhoim
        .then((j) => { if (alive) { setData(j); setError(null); } })
        .catch((e) => alive && setError(String(e)));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (error) {
    return (
      <PageShell>
        <PageHeader title="變更紀錄" icon={ScrollText} subtitle="追蹤變更" />
        <EmptyState icon={ScrollText} title="無法連線至變更紀錄 API" hint={error} />
      </PageShell>
    );
  }

  const integrityClean = data?.integrity?.clean;
  const driftCount = data?.drift?.count ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="變更紀錄"
        icon={ScrollText}
        subtitle="追蹤何時、以哪個版本完成系統編輯與專案部署"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="LifeOS" value={data?.versions?.lifeos ?? "—"} icon={Package} />
        <StatTile label="執行流程" value={data?.versions?.algorithm ?? "—"} icon={Workflow} />
        <StatTile label="提示詞" value={data?.versions?.system_prompt ?? "—"} icon={ScrollText} />
        <StatTile
          label="更新"
          value={data?.registry?.total_updates ?? "—"}
          icon={GitCommitVertical}
          sub={data?.registry?.last_updated ? `最近 ${timeAgo(data.registry.last_updated)}` : undefined}
        />
        <StatTile
          label="完整性"
          value={integrityClean == null ? "—" : integrityClean ? "無異常" : "已攔截"}
          dim={integrityClean == null ? "neutral" : integrityClean ? "ok" : "err"}
          icon={ShieldCheck}
          sub={data?.integrity?.last_run ? timeAgo(data.integrity.last_run.ts) : "尚無執行紀錄"}
        />
        <StatTile
          label="差異"
          value={driftCount}
          unit="檔案"
          dim={driftCount >= 10 ? "warn" : "ok"}
          icon={Rocket}
          sub={data?.drift?.tag ? `起始於${data.drift.tag}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader
            title="系統更新"
            icon={GitCommitVertical}
            meta={data?.registry ? `最新${data.registry.recent.length}` : undefined}
          />
          {data?.registry?.recent?.length ? (
            <ul className="flex flex-col divide-y divide-line-2">
              {data.registry.recent.map((u, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <Pill dim={SIG_DIM[u.significance ?? ""] ?? "neutral"}>{displayLabel(u.significance ?? "?")}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-1 truncate">{u.title}</div>
                    <div className="text-[12px] text-ink-3 mono">
                      {timeAgo(u.timestamp)}
                      {u.version ? ` · v${u.version}` : ""}
                      {u.change_type ? ` · ${displayLabel(u.change_type)}` : ""}
                      {u.files ? ` · ${u.files} 個檔案` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={GitCommitVertical} title="尚無可讀取的登錄項目" />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="專案部署"
            icon={Rocket}
            meta={data ? `最新 ${data.deploys.length}` : undefined}
          />
          {data?.deploys?.length ? (
            <ul className="flex flex-col divide-y divide-line-2">
              {data.deploys.map((d, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <Pill dim={d.ok ? "ok" : "err"}>{d.ok ? "成功" : "失敗"}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-1 truncate">
                      {d.project}
                      {d.domain ? <span className="text-ink-3"> · {d.domain}</span> : null}
                    </div>
                    <div className="text-[12px] text-ink-3 mono">
                      {timeAgo(d.ts)} · {d.target}
                      {d.version ? ` · v${d.version}` : d.sha ? ` · ${d.sha}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Rocket}
              title="尚無部署事件"
              hint="每次通過檢查的部署都會透過 LedgerDeployEvent 記錄於此，隨專案發布持續累積。"
            />
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
