"use client";

import { useState, useEffect, useCallback } from "react";
import { localOnlyApiCall } from "@/lib/local-api";
import { Volume2, Terminal, FileText, Zap } from "lucide-react";

// ─── System Health Vitals (Widget 18) ───
// Persistent bar at top of Activity page, visible across all tabs.
// Polls voice, hooks, docs, and session health every 30s.

interface HealthData {
  voiceHealth: { rate: number | null; status: "healthy" | "degraded" | "failing" | "unknown" };
  hookReliability: {
    failsPerHour: number | null;
    status: "healthy" | "degraded" | "failing" | "unknown";
  };
  docFreshness: {
    status: "healthy" | "degraded" | "failing" | "unknown";
    label: string;
  };
  activeSessions: {
    count: number | null;
    status: "healthy" | "degraded" | "failing" | "unknown";
  };
}

const STATUS_COLORS: Record<string, string> = {
  unknown: "text-ink-3",
  healthy: "text-emerald-400",
  degraded: "text-amber-400",
  failing: "text-rose-400",
};

const STATUS_DOTS: Record<string, string> = {
  unknown: "bg-ink-3",
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  failing: "bg-rose-400",
};

export default function SystemHealthVitals() {
  const [health, setHealth] = useState<HealthData | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      // Fetch voice events
      const voice = await localOnlyApiCall<{
        summary?: { successRate?: number };
      }>("/api/observability/voice-events").catch(() => null);
      const reportedRate = voice?.summary?.successRate;
      const voiceRate = typeof reportedRate === "number" && Number.isFinite(reportedRate) && reportedRate >= 0 && reportedRate <= 100 ? reportedRate : null;

      // Fetch tool failures
      const failures = await localOnlyApiCall<{
        summary?: { recent24h?: number };
      }>("/api/observability/tool-failures").catch(() => null);
      const recentFailures = failures?.summary?.recent24h;
      const failsPerHour = typeof recentFailures === "number" && Number.isFinite(recentFailures) && recentFailures >= 0 ? recentFailures / 24 : null;

      // Fetch algorithm state for active session count
      const algo = await localOnlyApiCall<{
        algorithms?: Array<{ active?: boolean }>;
      }>("/api/algorithm").catch(() => null);
      const activeCount =
        Array.isArray(algo?.algorithms) ? algo.algorithms.filter((a) => a.active).length : null;

      setHealth({
        voiceHealth: {
          rate: voiceRate,
          status:
            voiceRate === null ? "unknown" : voiceRate >= 90
              ? "healthy"
              : voiceRate >= 70
                ? "degraded"
                : "failing",
        },
        hookReliability: {
          failsPerHour: failsPerHour === null ? null : Math.round(failsPerHour * 10) / 10,
          status:
            failsPerHour === null ? "unknown" : failsPerHour <= 1
              ? "healthy"
              : failsPerHour <= 5
                ? "degraded"
                : "failing",
        },
        docFreshness: {
          status: "unknown",
          label: "未檢查",
        },
        activeSessions: {
          count: activeCount,
          status: activeCount === null ? "unknown" : activeCount > 0 ? "healthy" : "degraded",
        },
      });
    } catch {
      // Silently fail — vitals bar simply stays hidden until data arrives
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!health) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-1.5 bg-[rgba(14,25,31,0.5)] border-b border-white/[0.04] shrink-0">
      <VitalMetric
        icon={Volume2}
        label="語音"
        value={health.voiceHealth.rate === null ? "未知" : `${Math.round(health.voiceHealth.rate)}%`}
        status={health.voiceHealth.status}
      />
      <VitalMetric
        icon={Terminal}
        label="工具錯誤"
        value={health.hookReliability.failsPerHour === null ? "未知" : `${health.hookReliability.failsPerHour} 次／小時`}
        status={health.hookReliability.status}
      />
      <VitalMetric
        icon={FileText}
        label="文件"
        value={health.docFreshness.label}
        status={health.docFreshness.status}
      />
      <VitalMetric
        icon={Zap}
        label="活動中的工作"
        value={health.activeSessions.count === null ? "未知" : `${health.activeSessions.count}`}
        status={health.activeSessions.status}
      />
    </div>
  );
}

function VitalMetric({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status: "healthy" | "degraded" | "failing" | "unknown";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${STATUS_DOTS[status]}`}
      />
      <Icon className="w-4 h-4 text-ink-3" />
      <span className="text-xs text-ink-3 uppercase">{label}</span>
      <span
        className={`text-sm font-mono font-medium ${STATUS_COLORS[status]}`}
      >
        {value}
      </span>
    </div>
  );
}
