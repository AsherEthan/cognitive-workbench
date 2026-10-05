import { displayLabel } from "@/lib/zh-TW";

// Translate presentation only. Raw tool, agent and hook keys remain unchanged.
const LABELS: Record<string, string> = {
  PreToolUse: "工具執行前", PostToolUse: "工具執行後", Completed: "已完成",
  Notification: "通知", Stop: "已停止", SubagentStop: "子代理停止",
  PreCompact: "整理上下文", UserPromptSubmit: "使用者輸入",
  SessionStart: "工作階段開始", SessionEnd: "工作階段結束",
  Read: "讀取檔案", Write: "寫入檔案", Edit: "編輯檔案", Bash: "執行指令",
  Grep: "搜尋內容", Glob: "搜尋檔案", Task: "委派任務", WebFetch: "讀取網頁",
  WebSearch: "網路搜尋", Skill: "技能", SlashCommand: "快捷指令",
  TodoWrite: "更新待辦", AskUserQuestion: "詢問使用者", NotebookEdit: "編輯筆記本",
  NotebookRead: "讀取筆記本", BashOutput: "指令輸出", KillShell: "停止指令",
  ExitPlanMode: "結束規劃", Agent: "代理", User: "使用者", subagent: "子代理",
  main: "主要代理", engineer: "工程代理", designer: "設計代理", architect: "架構代理",
  intern: "助理代理", artist: "創作代理", pentester: "安全測試代理",
  "perplexity-researcher": "Perplexity 研究代理", "claude-researcher": "Claude 研究代理",
  "gemini-researcher": "Gemini 研究代理", "tool-activity": "工具活動",
  "tool-failure": "工具錯誤", voice: "語音", config: "設定",
  "Prompt:": "輸入：", "Compaction:": "整理：", "Session:": "工作階段：",
  "1M": "一分鐘", "2M": "兩分鐘", "4M": "四分鐘", "8M": "八分鐘", "16M": "十六分鐘",
  Cold: "低度活動", Fire: "密集活動", Inferno: "極密集活動", Idle: "閒置", Cool: "低度活動", Warm: "中度活動", Hot: "高度活動", Intense: "密集活動",
  "missing-section": "缺少驗證條件區段", "empty-section": "驗證條件區段為空", "all-dropped": "沒有可解析的驗證條件",
};
const LOWER = Object.fromEntries(Object.entries(LABELS).map(([key, value]) => [key.toLowerCase(), value]));
export function activityLabel(value: unknown): string {
  if (typeof value !== "string") return displayLabel(value);
  return LABELS[value] ?? LOWER[value.toLowerCase()] ?? displayLabel(value);
}
