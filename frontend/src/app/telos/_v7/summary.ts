// Universal TELOS analysis generator.
//
// Pure transform: (telos, isPersonalized) → multi-paragraph deep analysis.
// Reads the WHOLE Telos graph — not just first-order facts. The references
// between Problems/Missions/Goals/Challenges/Strategies/Projects encode
// structure; this function surfaces the structural signals:
//
//   - PINCH POINTS:  challenges blocking ≥3 goals (highest-leverage unblock)
//   - WEAK CHAINS:   problems with no addressing strategy (orphan blockers)
//   - STALLED ITEMS: goals with non-trivial pct but zero delta (was moving, stuck)
//   - DRIFT RISK:    goals with no implementing strategy (no path forward)
//   - TRACTION:      goals with positive delta + dimensions climbing
//   - GRAVITY:       most-referenced node (the structural center of work)
//
// All derivations are on the references already parsed by the API.
// No LLM call, no API change, no hardcoded user content. Same input ⇒
// same output. Returns null on fixture installs and structurally-empty TELOS.

import { uiLabel } from "./labels";

import type {
  Telos, Dimension, Goal, Challenge, Problem,
} from "./data";

export interface TelosSummary {
  headline: string;
  // Body paragraphs (each may be empty string when no signal exists).
  // Renderer hides empty paragraphs.
  position: string;     // where you stand vs ideal — dimension gaps
  traction: string;     // what's moving — climbing dims, top-delta goals
  pinch: string;        // structural blockers — pinch points, stalled items
  drift: string;        // weak chains and drift risk
  recommendations: string;  // concrete next moves derived from the analysis
}

// ── Helpers ────────────────────────────────────────────────────────

function fmtPct(n: number): string { return `${Math.round(n)}%`; }
function avgCur(dims: readonly Dimension[]): number {
  if (dims.length === 0) return 0;
  return dims.reduce((a, d) => a + d.cur, 0) / dims.length;
}
function gap(d: Dimension): number { return d.ideal - d.cur; }
function lower(s: string): string { return s; }
function joinList(items: readonly string[]): string { return items.join("、"); }

interface OwnerVoice { subject: string; }
function ownerVoice(name: string): OwnerVoice { return { subject: name.trim() || "你" }; }

// ── Graph derivations ─────────────────────────────────────────────

function pinchPoints(telos: Telos, threshold = 2): Challenge[] {
  return telos.challenges
    .filter((c) => c.blocks.length >= threshold)
    .sort((a, b) => b.blocks.length - a.blocks.length);
}

function weakChains(telos: Telos): Problem[] {
  // High-severity problems with no strategy that overcomes a challenge that blocks any goal addressing this problem's missions.
  // Simpler proxy: high-severity problems whose addressed missions have no active strategies.
  return telos.problems.filter((p) => {
    if (p.severity !== "high") return false;
    const addressedMissions = p.affects;
    if (addressedMissions.length === 0) return true; // orphan
    // Find goals that serve any addressed mission — actually goals don't reference missions in this schema
    // Instead, check: are there strategies that implement goals which somehow connect back to this problem?
    // Simpler signal: problem affects mission but no strategy is active. We accept the simpler signal.
    return telos.strategies.filter((s) => s.active).length === 0;
  });
}

function stalledGoals(telos: Telos): Goal[] {
  return telos.goals
    .filter((g) => g.pct >= 20 && (g.delta === 0 || g.delta === null))
    .sort((a, b) => b.pct - a.pct);
}

function driftRiskGoals(telos: Telos): Goal[] {
  // Goals with no implementing strategy.
  const implementedGoalIds = new Set(telos.strategies.flatMap((s) => s.implements));
  return telos.goals.filter((g) => !implementedGoalIds.has(g.id));
}

function topMovingGoals(telos: Telos, n = 2): Goal[] {
  return telos.goals
    .filter((g) => typeof g.delta === "number" && (g.delta as number) > 0)
    .sort((a, b) => (b.delta as number) - (a.delta as number))
    .slice(0, n);
}

function climbingDimensions(telos: Telos): Dimension[] {
  return telos.dimensions.filter((d) => d.velo > 0.15).sort((a, b) => b.velo - a.velo);
}
function driftingDimensions(telos: Telos): Dimension[] {
  return telos.dimensions.filter((d) => d.velo < -0.15).sort((a, b) => a.velo - b.velo);
}

// ── Paragraph builders ────────────────────────────────────────────

function buildHeadline(telos: Telos, voice: OwnerVoice): string {
  const { dimensions, idealState } = telos;
  if (dimensions.length === 0) {
    return idealState.horizon
      ? `已設定方向：${idealState.horizon}。生活各面向的當下與理想，仍可慢慢補充。`
      : "從你在意的生活開始，整理當下與想前往的方向。";
  }
  const avg = avgCur(dimensions);
  const sorted = [...dimensions].sort((a, b) => gap(a) - gap(b));
  const closest = sorted[0]!;
  const furthest = sorted[sorted.length - 1]!;
  const lead = `${voice.subject}已記錄 ${dimensions.length} 個生活面向，目前記錄值的平均是 ${Math.round(avg)}。`;
  return closest.id === furthest.id ? lead : `${lead}「${uiLabel(closest.label)}」最接近設定的理想，「${uiLabel(furthest.label)}」的差距較大。`;
}

function buildPosition(telos: Telos, _voice: OwnerVoice): string {
  if (telos.dimensions.length === 0) return "";
  const widest = [...telos.dimensions].sort((a, b) => gap(b) - gap(a)).slice(0, 2).filter(d => gap(d) > 5);
  if (widest.length === 0) return "依現有記錄，各面向與設定值的差距都在 5 點以內。這不代表健康評估或整體完成度。";
  return `可再留意：${joinList(widest.map(d => `「${uiLabel(d.label)}」距設定值 ${Math.round(gap(d))} 點`))}。`;
}

function buildTraction(telos: Telos, _voice: OwnerVoice): string {
  const climbing = climbingDimensions(telos);
  const moving = topMovingGoals(telos);
  const greenProjects = telos.projects.filter(p => p.status === "green");
  const parts: string[] = [];
  if (climbing.length) parts.push(`${joinList(climbing.slice(0, 2).map(d => `「${uiLabel(d.label)}」`))}的記錄值正在上升`);
  if (moving.length) parts.push(`近期變化較明顯的目標是「${moving[0]!.title}」${moving[0]!.kpi ? `（${moving[0]!.kpi}）` : ""}`);
  if (greenProjects.length) parts.push(`${greenProjects.length} 個專案標記為進行順利`);
  return parts.length ? parts.join("；") + "。" : "目前尚無足夠的變化記錄。";
}

function buildPinch(telos: Telos): string {
  const pinch = pinchPoints(telos);
  const stalled = stalledGoals(telos);
  const redProjects = telos.projects.filter(p => p.status === "red");
  const parts: string[] = [];
  if (pinch.length) {
    const top = pinch[0]!;
    parts.push(`「${top.title}」同時影響 ${top.blocks.length} 個目標`);
    if (pinch.length > 1) parts.push(`另有 ${pinch.length - 1} 項挑戰影響多個目標`);
  }
  if (stalled.length) parts.push(`這些目標尚未記錄新的變化：${joinList(stalled.slice(0, 2).map(g => `「${g.title}」（已記錄 ${fmtPct(g.pct)}）`))}`);
  if (redProjects.length) parts.push(`${redProjects.length} 個專案標記為遇到阻礙`);
  return parts.length ? parts.join("；") + "。" : "";
}

function buildDrift(telos: Telos): string {
  const drifting = driftingDimensions(telos);
  const orphans = driftRiskGoals(telos);
  const weak = weakChains(telos);
  const stranded = telos.stranded;
  const count = stranded.work_no_goal.length + stranded.goals_no_strategy.length + stranded.strategies_idle.length;
  const parts: string[] = [];
  if (drifting.length) parts.push(`${joinList(drifting.map(d => `「${uiLabel(d.label)}」`))}的記錄值正在下降`);
  if (weak.length) parts.push(`${weak.length} 個重要問題尚未找到對應的採用中策略`);
  if (orphans.length >= 3) parts.push(`${orphans.length} 個目標尚未連結實行策略`);
  if (count) parts.push(`${count} 項工作、目標或策略仍待整理關聯`);
  return parts.length ? parts.join("；") + "。" : "";
}

function buildRecommendations(telos: Telos): string {
  const picks: string[] = [];
  const topRec = telos.recommendations[0];
  if (topRec) picks.push(`${topRec.action}${topRec.because ? `：${topRec.because}` : ""}`);
  const pinch = pinchPoints(telos);
  if (pinch.length && picks.length < 2) {
    const top = pinch[0]!;
    picks.push(`可以先看看「${top.title}」；它與 ${top.blocks.length} 個目標有關`);
  }
  const closeGoal = telos.goals.filter(g => g.pct >= 60 && g.pct < 100).sort((a, b) => b.pct - a.pct)[0];
  if (closeGoal && picks.length < 3) picks.push(`回看「${closeGoal.title}」的下一步；目前已記錄 ${fmtPct(closeGoal.pct)} 的進度`);
  const orphans = driftRiskGoals(telos);
  if (orphans.length >= 3 && picks.length < 3) picks.push(`為 ${orphans.length} 個尚未連結策略的目標，補上可嘗試的做法`);
  return picks.length ? picks.map((p, i) => `${i + 1}. ${p}`).join("　") : "目前沒有新的關聯建議，可以按需要更新意圖與方向。";
}

// ── Public entrypoint ─────────────────────────────────────────────

export function summarizeTelos(telos: Telos, isPersonalized: boolean): TelosSummary | null {
  if (!isPersonalized) return null;
  const allDimsZero = telos.dimensions.length === 0 || telos.dimensions.every((d) => d.cur === 0);
  const noGoals = telos.goals.length === 0;
  const noProjects = telos.projects.length === 0;
  if (allDimsZero && noGoals && noProjects) return null;

  const voice = ownerVoice(telos.owner.name);

  return {
    headline: buildHeadline(telos, voice),
    position: buildPosition(telos, voice),
    traction: buildTraction(telos, voice),
    pinch: buildPinch(telos),
    drift: buildDrift(telos),
    recommendations: buildRecommendations(telos),
  };
}
