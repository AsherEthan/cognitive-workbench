// Display labels only. Stored keys, URLs, references and authored prose stay intact.
const LABELS: Record<string, string> = {
  "Ideal State": "理想狀態", "Current State": "當下狀態", Dimension: "生活面向",
  Problem: "問題", Mission: "使命", Goal: "目標", Metric: "指標", Challenge: "挑戰",
  Strategy: "策略", Project: "專案", Work: "工作", Team: "成員", Budget: "資源配置",
  Recommendation: "建議", Problems: "問題", Goals: "目標", Metrics: "指標", Challenges: "挑戰",
  Strategies: "策略", Projects: "專案", Health: "健康", Money: "財務", Freedom: "自主",
  Creative: "創作", Relationships: "關係", Rhythms: "生活節奏", Infrastructure: "基礎設施",
  Business: "事業", Finances: "財務", Life: "生活", Mood: "心情", Energy: "能量", Focus: "注意力",
  health: "健康", money: "金錢", freedom: "自主", creative: "創作", relationships: "關係",
  rhythms: "生活節奏", infrastructure: "基礎設施", human: "人", agent: "代理",
  time: "時間", attention: "注意力", high: "高", med: "中", low: "低",
  green: "進行順利", amber: "需要留意", red: "遇到阻礙",
  current: "目前", ideal: "理想", velocity: "變化", severity: "重要程度", horizon: "時間範圍",
  kpi: "指標", target: "目標值", progress: "進度", value: "記錄值", trend: "趨勢",
  status: "狀態", eta: "預計時間", owner: "負責人", role: "角色", kind: "類型",
  of: "配置上限", pct: "比例", effort: "投入", impact: "影響",
  affects: "影響", addresses: "回應", dimensions: "生活面向", metrics: "指標",
  feeds: "支援", blocks: "阻礙", overcomes: "應對", implements: "推動", strategy: "策略",
  project: "專案", work: "工作", owns: "負責", funds: "支持", upstream: "上游關聯",
  text: "說明", problem: "問題", mission: "使命", goal: "目標", metric: "指標",
  lifetime: "一生", ongoing: "持續進行", today: "今天",
};

export function uiLabel(value: string): string { return LABELS[value] ?? value; }

export function periodLabel(value: string): string {
  const known = uiLabel(value);
  if (known !== value) return known;
  return value.replace(/^(\d+)y$/, "$1 年").replace(/^(\d+)mo$/, "$1 個月").replace(/^(\d+)d$/, "$1 天");
}
