"use client";

import { activityLabel } from "./labels";
import { formatDate } from "@/lib/zh-TW";
import { useState } from "react";
import type { HookEvent } from "@/hooks/useAgentEvents";
import {
  Wrench,
  CheckCircle,
  Bell,
  StopCircle,
  UserCheck,
  Package,
  MessageSquare,
  Rocket,
  Flag,
  FileText,
  Copy,
  Eye,
  FilePlus,
  Edit3,
  Terminal,
  Search,
  FolderSearch,
  Globe,
  Compass,
  Zap,
  Command,
  CheckSquare,
  MessageCircleQuestion,
  BookOpen,
  Code,
  type LucideIcon,
} from "lucide-react";

// ─── Color Maps ───

const EVENT_TYPE_COLORS: Record<string, string> = {
  PreToolUse: "#d9c49e",
  PostToolUse: "#d9b49e",
  Completed: "#b5e5d5",
  Notification: "#d9b49e",
  Stop: "#e8aaa0",
  SubagentStop: "#b8b2cf",
  PreCompact: "#8ec7bc",
  UserPromptSubmit: "#b5e5d5",
  SessionStart: "#97bdd2",
  SessionEnd: "#97bdd2",
};

const TOOL_COLORS: Record<string, string> = {
  Read: "#97bdd2",
  Write: "#b5e5d5",
  Edit: "#d9c49e",
  Bash: "#b8b2cf",
  Grep: "#e8aaa0",
  Glob: "#d9b49e",
  Task: "#8ec7bc",
  WebFetch: "#b5e5d5",
  WebSearch: "#b5e5d5",
  Skill: "#c5d3d5",
  SlashCommand: "#c5d3d5",
  TodoWrite: "#d9c49e",
  AskUserQuestion: "#b8b2cf",
  NotebookEdit: "#b5e5d5",
  NotebookRead: "#97bdd2",
  BashOutput: "#b8b2cf",
  KillShell: "#e8aaa0",
  ExitPlanMode: "#b5e5d5",
};

const AGENT_HEX: Record<string, string> = {
  pentester: "#e8aaa0",
  engineer: "#97bdd2",
  designer: "#b8b2cf",
  architect: "#b8b2cf",
  intern: "#8ec7bc",
  artist: "#8ec7bc",
  "perplexity-researcher": "#d9c49e",
  "claude-researcher": "#d9c49e",
  "gemini-researcher": "#d9c49e",
  main: "#97bdd2",
  da: "#97bdd2",
  pai: "#97bdd2",
  "claude-code": "#97bdd2",
};

// ─── Icons ───

const HOOK_ICONS: Record<string, LucideIcon> = {
  PreToolUse: Wrench,
  PostToolUse: CheckCircle,
  Notification: Bell,
  Stop: StopCircle,
  SubagentStop: UserCheck,
  PreCompact: Package,
  UserPromptSubmit: MessageSquare,
  SessionStart: Rocket,
  SessionEnd: Flag,
  Completed: CheckCircle,
};

const TOOL_ICONS: Record<string, LucideIcon> = {
  Read: Eye,
  Write: FilePlus,
  Edit: Edit3,
  Bash: Terminal,
  Grep: Search,
  Glob: FolderSearch,
  Task: Zap,
  WebFetch: Globe,
  WebSearch: Compass,
  Skill: Zap,
  SlashCommand: Command,
  TodoWrite: CheckSquare,
  AskUserQuestion: MessageCircleQuestion,
  NotebookEdit: BookOpen,
  NotebookRead: FileText,
  BashOutput: Terminal,
  KillShell: Terminal,
  ExitPlanMode: CheckCircle,
};

// ─── Helpers ───

function formatTime(timestamp?: number): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "未知時間";
  const d = new Date(timestamp);
  const time = d.toLocaleTimeString("zh-TW", {
    timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const date = formatDate(d);
  return date === formatDate(new Date()) ? time : `${date} ${time}`;
}

function getToolInfo(event: HookEvent): { tool: string; detail?: string } | null {
  const payload = event.payload;

  if (event.hook_event_type === "Completed") {
    return { tool: "", detail: payload.task || event.summary || "任務已完成" };
  }

  if (event.hook_event_type === "UserPromptSubmit" && payload.prompt) {
    const preview = payload.prompt.slice(0, 300);
    return { tool: "Prompt:", detail: `"${preview}${payload.prompt.length > 300 ? "..." : ""}"` };
  }

  if (event.hook_event_type === "PreCompact") {
    const trigger = payload.trigger || "unknown";
    return { tool: "Compaction:", detail: trigger === "manual" ? "手動整理上下文" : "自動整理上下文" };
  }

  if (event.hook_event_type === "SessionStart") {
    const source = payload.source || "unknown";
    const labels: Record<string, string> = { startup: "新的工作階段", resume: "繼續工作階段", clear: "重新開始工作階段" };
    return { tool: "Session:", detail: labels[source] || activityLabel(source) };
  }

  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command.slice(0, 200) + (payload.tool_input.command.length > 200 ? "..." : "");
      } else if (payload.tool_input.file_path) {
        const parts = payload.tool_input.file_path.split("/");
        info.detail = parts.length > 3 ? ".../" + parts.slice(-3).join("/") : payload.tool_input.file_path;
      } else if (payload.tool_input.pattern) {
        info.detail = payload.tool_input.pattern;
      }
    }
    return info;
  }

  return null;
}

// ─── Component ───

interface EventRowProps {
  event: HookEvent;
}

export default function EventRow({ event }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copyText, setCopyText] = useState("複製");

  const agentId =
    event.hook_event_type === "UserPromptSubmit"
      ? "User"
      : event.source_app === "subagent" && event.agent_name && event.agent_name !== "subagent"
      ? event.agent_name
      : event.source_app
      ? event.source_app.charAt(0).toUpperCase() + event.source_app.slice(1)
      : "unknown";

  const agentKey = (event.agent_name || event.source_app || "unknown").split(":")[0].toLowerCase();
  const appColor = AGENT_HEX[agentKey] || "#97bdd2";
  const eventTypeColor = EVENT_TYPE_COLORS[event.hook_event_type] || "#97bdd2";
  const HookIcon = HOOK_ICONS[event.hook_event_type] || MessageSquare;

  const toolInfo = getToolInfo(event);
  const toolColor = toolInfo?.tool ? TOOL_COLORS[toolInfo.tool] || "#97bdd2" : "#97bdd2";
  const ToolIcon = toolInfo?.tool ? TOOL_ICONS[toolInfo.tool] || Code : Code;

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
      setCopyText("已複製");
      setTimeout(() => setCopyText("複製"), 2000);
    } catch {
      setCopyText("複製失敗");
      setTimeout(() => setCopyText("複製"), 2000);
    }
  };

  return (
    <div
      className={`group relative p-3 rounded-xl cursor-pointer hover:bg-white/[0.02] transition-colors ${
        expanded ? "ring-1 ring-[#b5e5d5]/50" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
      role="group"
      tabIndex={0}
      aria-label={`${expanded ? "收合" : "展開"}事件資料`}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      <div className="ml-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Agent Badge */}
            <div
              className="text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0"
              style={{
                borderColor: appColor + "50",
                backgroundColor: appColor + "15",
              }}
            >
              <span className="font-mono text-xs whitespace-nowrap text-white">{activityLabel(agentId)}</span>
            </div>

            {/* Event Type Badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium"
              style={{ backgroundColor: eventTypeColor + "12", color: eventTypeColor }}
            >
              <HookIcon size={12} strokeWidth={2} />
              {activityLabel(event.hook_event_type)}
            </span>

            {/* Tool Info */}
            {toolInfo && (
              <span className="flex items-center gap-1.5 min-w-0">
                {toolInfo.tool && (
                  <span
                    className="text-sm font-medium px-2 py-1 rounded-lg inline-flex items-center gap-1 shrink-0"
                    style={{ backgroundColor: toolColor + "10", color: toolColor }}
                  >
                    <ToolIcon size={11} strokeWidth={2} />
                    {activityLabel(toolInfo.tool)}
                  </span>
                )}
                {toolInfo.detail && (
                  <span
                    data-sensitive
                    className="text-base truncate flex-1 min-w-0"
                    style={{
                      fontFamily:
                        event.hook_event_type === "UserPromptSubmit"
                          ? "Georgia, serif"
                          : "Georgia, serif",
                      fontStyle: event.hook_event_type === "UserPromptSubmit" ? "italic" : undefined,
                      color:
                        event.hook_event_type === "UserPromptSubmit"
                          ? "#b5e5d5"
                          : event.hook_event_type === "Completed"
                          ? "#b5e5d5"
                          : "var(--ink-2)",
                    }}
                  >
                    {toolInfo.detail}
                  </span>
                )}
              </span>
            )}

            {/* Summary */}
            {event.summary && (
              <span className="inline-flex items-center gap-1.5 text-xs text-white font-medium px-2.5 py-1 bg-[#b5e5d5]/10 rounded-lg min-w-0 max-w-sm" data-sensitive>
                <FileText size={11} strokeWidth={2} className="text-[#b5e5d5] shrink-0" />
                <span className="truncate">{event.summary}</span>
              </span>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-[var(--ink-3)] font-medium whitespace-nowrap">
            {formatTime(event.timestamp)}
          </span>
        </div>

        {/* Expanded: Payload */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--ink-2)] flex items-center gap-1.5">
                  <Package size={14} strokeWidth={2} />
                  原始事件資料
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPayload();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 text-[var(--ink-2)] hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <Copy size={12} strokeWidth={2} />
                  {copyText}
                </button>
              </div>
              <pre className="text-sm text-white bg-black/20 p-3 rounded-xl overflow-x-auto max-h-64 overflow-y-auto font-mono" data-sensitive>
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
