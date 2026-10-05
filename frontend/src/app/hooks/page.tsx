"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Webhook, ArrowLeft, FileCode, Globe } from "lucide-react";
import Link from "next/link";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { PageShell, PageHeader, Panel, StatTile, Pill } from "@/components/ui/chrome";
import SystemHealthPanel from "@/components/SystemHealthPanel";

interface HookEntry {
  event: string;
  matcher: string;
  type: string;
  command: string;
  fileName: string;
}

interface HookDetail {
  name: string;
  content: string;
  filePath: string;
  lastModified: string;
  size: number;
}

type Dimension = "health" | "money" | "freedom" | "creative" | "relationships" | "rhythms";

const EVENT_DIMENSIONS: Record<string, Dimension> = {
  PreToolUse: "creative",
  PostToolUse: "rhythms",
  PostToolUseFailure: "creative",
  UserPromptSubmit: "creative",
  Notification: "freedom",
  PreCompact: "relationships",
  PostCompact: "rhythms",
  SessionStart: "freedom",
  SessionEnd: "relationships",
  SubagentStart: "health",
  SubagentStop: "relationships",
  Stop: "relationships",
  StopFailure: "creative",
  TaskCreated: "money",
  TaskCompleted: "health",
  TeammateIdle: "rhythms",
  ConfigChange: "money",
  PermissionRequest: "creative",
  FileChanged: "freedom",
  CwdChanged: "rhythms",
  InstructionsLoaded: "relationships",
  Elicitation: "freedom",
  ElicitationResult: "relationships",
};

const EVENT_LABELS: Record<string, string> = {"PreToolUse":"工具呼叫前","PostToolUse":"工具呼叫後","PostToolUseFailure":"工具呼叫失敗","UserPromptSubmit":"提交使用者訊息","Notification":"通知","PreCompact":"背景壓縮前","PostCompact":"背景壓縮後","SessionStart":"對話開始","SessionEnd":"對話結束","SubagentStart":"子代理開始","SubagentStop":"子代理停止","Stop":"回應結束","StopFailure":"回應結束失敗","TaskCreated":"任務建立","TaskCompleted":"任務完成","TeammateIdle":"協作代理待命","ConfigChange":"設定變更","PermissionRequest":"權限請求","FileChanged":"檔案變更","CwdChanged":"工作目錄變更","InstructionsLoaded":"指令已載入","Elicitation":"請求補充資訊","ElicitationResult":"收到補充資訊"};

function eventDimension(event: string): Dimension {
  return EVENT_DIMENSIONS[event] || "money";
}

function HooksLanding({ hooks, events }: { hooks: HookEntry[]; events: string[] }) {
  const grouped = new Map<string, HookEntry[]>();
  for (const hook of hooks) {
    const list = grouped.get(hook.event) || [];
    list.push(hook);
    grouped.set(hook.event, list);
  }

  for (const event of events) {
    if (!grouped.has(event)) {
      grouped.set(event, []);
    }
  }

  const sortedEvents = [...grouped.keys()].sort();

  return (
    <PageShell>
      {hooks.length === 0 && (
        <EmptyStateGuide
          section="事件處理活動"
          description="各事件處理的健康狀態、延遲與最近呼叫；隨對話中的事件觸發而更新。"
          hideInterview
          daPromptExample="顯示這次對話觸發了哪些事件處理"
        />
      )}
      <PageHeader
        title="事件處理"
        icon={Webhook}
        subtitle="回應 Claude Code 事件而執行指令或 HTTP 請求的處理機制。在 settings.json 設定，可介入工具呼叫、對話事件及系統變更。"
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))" }}>
        <StatTile label="事件處理" value={hooks.length} icon={Webhook} dim="money" />
        <StatTile label="事件" value={events.length} icon={FileCode} dim="freedom" />
      </div>

      <SystemHealthPanel />

      <div className="flex flex-col gap-6">
        {sortedEvents.map((event) => {
          const eventHooks = grouped.get(event) || [];
          const dimension = eventDimension(event);

          return (
            <div key={event} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Pill dim={dimension} title={event}>{EVENT_LABELS[event] ?? event}</Pill>
                <span className="text-[12px] text-ink-3 mono">({eventHooks.length})</span>
              </div>
              {eventHooks.length === 0 ? (
                <p className="pl-1 text-[13px] italic text-ink-3">尚未登記事件處理</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {eventHooks.map((hook, i) => (
                    <Link
                      key={`${hook.event}-${hook.matcher}-${i}`}
                      href={`/hooks?name=${encodeURIComponent(hook.fileName)}`}
                      className="block"
                    >
                      <Panel hover className="py-3 px-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {hook.type === "http" ? (
                            <Globe className="w-4 h-4 shrink-0 text-dim-freedom" />
                          ) : (
                            <FileCode className="w-4 h-4 shrink-0 text-dim-money" />
                          )}
                          <span className="mono text-[13px] text-ink-1">{hook.fileName}</span>
                          <span className="text-[12px] text-ink-3">
                            比對條件：{" "}
                            <span className="mono text-ink-2">{hook.matcher}</span>
                          </span>
                          <span className="ml-auto shrink-0">
                            <Pill dim={hook.type === "http" ? "freedom" : "money"}>{hook.type === "http" ? "HTTP 請求" : "指令"}</Pill>
                          </span>
                        </div>
                      </Panel>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

function HookDetailView({ hook }: { hook: HookDetail }) {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/hooks" className="text-ink-2 hover:text-ink-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-ink-1">{hook.name}</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {(hook.size / 1024).toFixed(1)} KB ·{" "}
            {new Date(hook.lastModified).toLocaleDateString("zh-TW", { timeZone: "Asia/Shanghai", 
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <Panel className="p-0 overflow-hidden">
        <pre className="text-xs mono overflow-x-auto max-h-[700px] overflow-y-auto leading-relaxed p-4 m-0 bg-ground text-ink-2">
          <code>{hook.content}</code>
        </pre>
      </Panel>
    </div>
  );
}

function HooksPageInner() {
  const searchParams = useSearchParams();
  const hookName = searchParams.get("name");
  const isViewing = !!hookName;

  const { data: listData } = useQuery<{ hooks: HookEntry[]; total: number; events: string[] }>({
    queryKey: ["hooks-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/hooks");
      if (!res.ok) throw new Error("無法讀取事件處理列表");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData } = useQuery<HookDetail>({
    queryKey: ["hook-detail", hookName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/hooks/${encodeURIComponent(hookName!)}`);
      if (!res.ok) throw new Error("無法讀取事件處理");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <HookDetailView hook={detailData} />;
  }

  if (!isViewing && listData) {
    return <HooksLanding hooks={listData.hooks} events={listData.events} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-ink-3">載入中…</div>
    </div>
  );
}

export default function HooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-ink-3">載入中…</div>
        </div>
      }
    >
      <HooksPageInner />
    </Suspense>
  );
}
