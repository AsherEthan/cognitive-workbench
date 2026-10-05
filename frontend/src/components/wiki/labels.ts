import { docDisplayLabel } from "@/lib/module-labels-zh";
import { displayLabel } from "@/lib/zh-TW";

const LABELS: Record<string, string> = {
  "Knowledge Archive": "知識庫", Documentation: "文件", Overview: "總覽",
  Agents: "代理", Algorithm: "工作流程", Arbol: "Arbol", Config: "設定",
  Delegation: "任務委派", Fabric: "Fabric", Feed: "資訊流", Hooks: "事件掛鉤",
  LifeOs: "LifeOS", Memory: "記憶", Notifications: "通知", Observability: "活動觀測",
  Pulse: "工作台", Security: "安全", Skills: "技能", Tools: "工具",
  People: "人物", Companies: "組織", Ideas: "想法", Blogs: "文章", Books: "書籍",
  Research: "研究", ISAs: "理想狀態", Lessons: "經驗", Wisdom: "洞見", Other: "其他",
  "system-doc": "系統文件", person: "人物", company: "組織", idea: "想法", blog: "文章",
  book: "書籍", research: "研究", isa: "理想狀態", lesson: "經驗", wisdom: "洞見",
};
export function wikiLabel(value: string): string {
  const docLabel = docDisplayLabel(value);
  return docLabel !== value ? docLabel : LABELS[value] ?? displayLabel(value);
}
