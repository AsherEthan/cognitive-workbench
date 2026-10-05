"use client";

import { useRef, useEffect, useMemo } from "react";
import type { RatingPulse } from "@/types/algorithm";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-TW", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return "剛剛";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} 分鐘前`;
  return `${Math.floor(m / 60)} 小時前`;
}

function formatTimeRange(first: number, last: number): string {
  return `${formatTime(first)} – ${formatTime(last)}`;
}

type RatingTier = { label: string; textColor: string; bgColor: string; borderColor: string; icon: string };

function getRatingTier(avg: number): RatingTier {
  if (avg >= 9) return { label: "評價高", textColor: "text-emerald-300", bgColor: "bg-emerald-500/[0.04]", borderColor: "border-emerald-500/20", icon: "◆" };
  if (avg >= 7) return { label: "評價偏高", textColor: "text-emerald-400", bgColor: "bg-emerald-500/[0.03]", borderColor: "border-emerald-500/15", icon: "▲" };
  if (avg >= 5) return { label: "評價居中", textColor: "text-[#b5e5d5]", bgColor: "bg-[#b5e5d5]/[0.03]", borderColor: "border-[#b5e5d5]/15", icon: "●" };
  if (avg >= 3) return { label: "評價偏低", textColor: "text-orange-400", bgColor: "bg-orange-500/[0.04]", borderColor: "border-orange-500/20", icon: "▼" };
  return { label: "評價低", textColor: "text-rose-400", bgColor: "bg-rose-500/[0.05]", borderColor: "border-rose-500/25", icon: "▼▼" };
}

function getTrend(pulses: RatingPulse[]): { arrow: string; label: string; color: string } {
  if (pulses.length < 4) return { arrow: "–", label: "資料不足", color: "text-ink-3" };
  const half = Math.floor(pulses.length / 2);
  const firstHalf = pulses.slice(0, half);
  const secondHalf = pulses.slice(half);
  const avg1 = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length;
  const delta = avg2 - avg1;
  if (delta > 1.5) return { arrow: "↑", label: "評價上升", color: "text-emerald-400" };
  if (delta > 0.5) return { arrow: "↗", label: "評價略升", color: "text-emerald-400/70" };
  if (delta < -1.5) return { arrow: "↓", label: "評價下降", color: "text-rose-400" };
  if (delta < -0.5) return { arrow: "↘", label: "評價略降", color: "text-orange-400" };
  return { arrow: "→", label: "評價持平", color: "text-ink-2" };
}

function barColor(value: number): string {
  if (value >= 8) return "bg-emerald-400";
  if (value >= 6) return "bg-[#b5e5d5]";
  if (value >= 4) return "bg-amber-400";
  if (value >= 2) return "bg-orange-400";
  return "bg-rose-400";
}

function barTextColor(value: number): string {
  if (value >= 8) return "text-emerald-400";
  if (value >= 6) return "text-[#b5e5d5]";
  if (value >= 4) return "text-amber-400";
  if (value >= 2) return "text-orange-400";
  return "text-rose-400";
}

interface QuickPulseStripProps {
  pulses: RatingPulse[];
}

export default function QuickPulseStrip({ pulses }: QuickPulseStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [pulses.length]);

  const avg = useMemo(() => {
    if (!pulses || pulses.length === 0) return 0;
    return pulses.reduce((sum, p) => sum + p.value, 0) / pulses.length;
  }, [pulses]);

  const trend = useMemo(() => getTrend(pulses || []), [pulses]);

  if (!pulses || pulses.length === 0) return null;

  // Keep sparse interaction ratings compact; provenance is not supplied by this API.
  if (pulses.length < 3) {
    const last = pulses[pulses.length - 1];
    return (
      <div className="px-4 py-1.5 border-b border-white/[0.05] bg-white/[0.01] flex flex-wrap items-center gap-2">
        <span className={`text-[13px] font-mono font-bold ${barTextColor(last.value)}`}>{last.value}/10</span>
        <span className="text-[13px] text-ink-3">
          近二十四小時共 {pulses.length} 筆互動評價（來源未標註，非身心量測）
          {last.message ? ` — “${last.message.slice(0, 80)}”` : ""}
        </span>
        <span className="text-[13px] text-ink-3 ml-auto font-mono">{formatRelative(last.timestamp)}</span>
      </div>
    );
  }

  const rating = getRatingTier(avg);
  const timeRange = formatTimeRange(pulses[0].timestamp, pulses[pulses.length - 1].timestamp);
  const lo = Math.min(...pulses.map((p) => p.value));
  const hi = Math.max(...pulses.map((p) => p.value));

  return (
    <div className={`px-4 py-2 border-b ${rating.borderColor} ${rating.bgColor}`}>
      <p className="text-[12px] text-ink-3 mb-2">互動評價資料 · 來源未標註，可能含系統推估 · 非身心量測</p>
      <div className="flex flex-wrap items-center gap-4">

        {/* Mood + Score */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex flex-col items-center">
            <span className={`text-lg font-mono font-black leading-none ${rating.textColor}`}>
              {avg.toFixed(1)}
            </span>
            <span className="text-[13px] text-ink-3 font-mono">/10</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={`text-xs font-semibold leading-none ${rating.textColor}`}>
              {rating.icon} {rating.label}
            </span>
            <span className={`text-[13px] leading-none ${trend.color}`}>
              {trend.arrow} {trend.label}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-white/[0.06] shrink-0" />

        {/* Sparkline bar chart */}
        <div
          ref={scrollRef}
          className="flex items-end gap-px overflow-x-auto scrollbar-none flex-1 min-w-[120px] h-7"
        >
          {pulses.map((pulse, i) => {
            const heightPct = Math.max(10, (pulse.value / 10) * 100);
            return (
              <div
                key={`${pulse.timestamp}-${i}`}
                tabIndex={0}
                aria-label={`互動評價 ${pulse.value}／10，${formatTime(pulse.timestamp)}${pulse.message ? `，${pulse.message}` : ""}`}
                className="group relative shrink-0 flex items-end focus-visible:outline focus-visible:outline-1"
                style={{ height: "100%" }}
              >
                <div
                  className={`w-2.5 rounded-t-sm ${barColor(pulse.value)} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
                  style={{
                    height: `${heightPct}%`,
                    animation: i === pulses.length - 1 ? "bar-grow 300ms ease-out" : undefined,
                  }}
                />
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-md bg-[rgba(14,25,31,0.95)] border border-line-2 text-xs text-ink-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-20 min-w-[180px] max-w-[280px]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-mono font-bold text-sm ${barTextColor(pulse.value)}`}>
                      {pulse.value}/10
                    </span>
                    <span className="text-ink-3 text-[13px]">{formatTime(pulse.timestamp)}</span>
                  </div>
                  {pulse.message && (
                    <div className="text-ink-2 text-[14px] leading-snug line-clamp-2">
                      {pulse.message}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-white/[0.06] shrink-0" />

        {/* Stats */}
        <div className="flex flex-col gap-0.5 shrink-0 text-right">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-3">範圍</span>
            <span className="text-[13px] font-mono text-ink-2">{lo}–{hi}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-3">筆數</span>
            <span className="text-[13px] font-mono text-ink-2">{pulses.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-3">期間</span>
            <span className="text-[13px] font-mono text-ink-2">{timeRange}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bar-grow {
          0% { height: 0%; opacity: 0; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
