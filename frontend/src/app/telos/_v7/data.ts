// TELOS data model — 11 first-class primitives with bidirectional links.
// IdealState -> Problems -> Mission -> Goals -> Metrics -> Challenges -> Strategies -> Projects -> Work -> Team -> Budget

export interface Owner {
  name: string;
  day: string;
  streak: number;
}

export interface IdealState {
  horizon: string;
  note: string;
}

export interface Dimension {
  id: string;
  label: string;
  cur: number;
  ideal: number;
  velo: number;
  color: string;
}

export interface SnapshotMetric {
  id: string;
  label: string;
  v: number;
  of: number;
}

export interface Problem {
  id: string;
  title: string;
  summary?: string;
  note: string;
  severity: "high" | "med" | "low";
  affects: readonly string[];
}

export interface Mission {
  id: string;
  title: string;
  summary?: string;
  horizon: string;
  active?: boolean;
  addresses?: readonly string[];
}

export interface Goal {
  id: string;
  title: string;
  summary?: string;
  kpi: string;
  target: string;
  pct: number;
  delta: number;
  dims: readonly string[];
  metrics: readonly string[];
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: number;
  spark: readonly number[];
  feeds: readonly string[];
  color: string;
}

export interface Challenge {
  id: string;
  title: string;
  summary?: string;
  note: string;
  blocks: readonly string[];
}

export interface Strategy {
  id: string;
  title: string;
  summary?: string;
  overcomes: readonly string[];
  implements: readonly string[];
  active?: boolean;
}

export interface Work {
  id: string;
  title: string;
  strategy: string;
  eta: string;
  status: "green" | "amber" | "red";
  owner: string;
}

export interface Project {
  id: string;
  title: string;
  strategy: string;
  dims: readonly string[];
  status: "green" | "amber" | "red";
  work: readonly Work[];
  team?: readonly string[];
}

export interface Team {
  id: string;
  name: string;
  role: string;
  kind: "human" | "agent";
  owns: readonly string[];
  avatar: string;
  note: string;
}

export interface Budget {
  id: string;
  kind: "money" | "time" | "attention";
  label: string;
  value: string;
  of: string;
  pct: number;
  funds: readonly string[];
  note: string;
  warn?: boolean;
}

export interface Recommendation {
  id: string;
  action: string;
  because: string;
  upstream: readonly string[];
  effort: string;
  impact: "high" | "med" | "low";
}

export interface StrandedWork {
  id: string;
  title: string;
  owner: string;
  age: string;
}

export interface StrandedGoal {
  id: string;
  title: string;
  reason: string;
}

export interface StrandedStrategy {
  id: string;
  title: string;
  reason: string;
}

export interface Stranded {
  work_no_goal: readonly StrandedWork[];
  goals_no_strategy: readonly StrandedGoal[];
  strategies_idle: readonly StrandedStrategy[];
}

export interface Subtab {
  id: string;
  label: string;
  dim: string;
  cur: number;
  ideal: number;
  velo: number;
  target: string;
  top: string;
}

export interface PreferenceContext {
  books: readonly string[];
  films: readonly string[];
  anime: readonly string[];
  characters: readonly string[];
  aphorisms: readonly string[];
  hobbies: readonly string[];
  literature: readonly string[];
}

export interface NarrativeSeed {
  days_into: number;
  push_name: string;
  current_work: string;
  via_strategy: string;
  addresses: string;
  moves_goal: string;
  serves_mission: string;
}

export interface WorkNarrative {
  summary: string;
  inProgress: number;
  done: number;
  ready: number;
  inbox: number;
}

export interface Telos {
  owner: Owner;
  idealState: IdealState;
  dimensions: readonly Dimension[];
  snapshot: readonly SnapshotMetric[];
  problems: readonly Problem[];
  missions: readonly Mission[];
  goals: readonly Goal[];
  metrics: readonly Metric[];
  challenges: readonly Challenge[];
  strategies: readonly Strategy[];
  projects: readonly Project[];
  team: readonly Team[];
  budget: readonly Budget[];
  recommendations: readonly Recommendation[];
  stranded: Stranded;
  subtabs: readonly Subtab[];
  preferences: PreferenceContext;
  narrativeSeed: NarrativeSeed;
  workNarrative: WorkNarrative | null;
  // Server-synthesized prose. All are null on a fresh install with no
  // populated TELOS.md — never empty strings, never fixture text.
  currentStateNarrative: string | null;
  idealStateNarrative: string | null;
  currentStateBullets: ReadonlyArray<{ label: string; value: string }> | null;
  idealStateBullets: ReadonlyArray<{ label: string; value: string }> | null;
  synthesisParagraph: string | null;
  synthesisSegments: ReadonlyArray<SynthesisSegment> | null;
  recommendedNextAction: string | null;
}

// Structured synthesis — typed segments rendered as runs of styled (and
// optionally clickable) inline tokens. `kind: "text"` is plain prose; the
// other kinds map to TELOS primitives and route through the trace overlay
// when the renderer wires `id` to onTrace.
export type SynthesisSegment =
  | { kind: "text"; text: string }
  | { kind: "mission" | "problem" | "challenge" | "strategy" | "goal" | "work"; text: string; id?: string };

// ─────────────────────────────────────────────────────────────────
// SAMPLE TELOS DATA — replace via /interview or by rewriting this file.
// Every field below is a placeholder. Real Pulse content populates
// once you've run the TELOS interview and your data lands in
// LIFEOS/USER/TELOS/. This file is the FIXTURE the dashboard renders
// before any user data exists.
// ─────────────────────────────────────────────────────────────────
export const TELOS = {
  owner: { name: "示例使用者", day: "1 月 1 日 · 週一", streak: 7 },

  // 1. IDEAL STATE — seven dimensions with targets
  idealState: {
    horizon: "2027 年 12 月前",
    note: "七個生活面向的示例設定值。",
  },
  dimensions: [
    { id:'health',         label:"健康",         cur:71, ideal:90, velo:+1.2, color:'--health'         },
    { id:'money',          label:"財務",          cur:62, ideal:95, velo:+0.0, color:'--money'          },
    { id:'freedom',        label:"自主",        cur:54, ideal:90, velo:+3.1, color:'--freedom'        },
    { id:'creative',       label:"創作",       cur:48, ideal:85, velo:+2.4, color:'--creative'       },
    { id:'relationships',  label:"關係",  cur:77, ideal:90, velo:-0.4, color:'--relationships'  },
    { id:'rhythms',        label:"生活節奏",        cur:66, ideal:85, velo:+0.9, color:'--rhythms'        },
    { id:'infrastructure', label:"基礎設施", cur:60, ideal:90, velo:+1.8, color:'--infrastructure' },
  ],

  snapshot: [
    { id:'mood',   label:"心情",   v:7.4, of:10 },
    { id:'energy', label:"能量", v:6.1, of:10 },
    { id:'focus',  label:"注意力",  v:8.2, of:10 },
  ],

  // 2. PROBLEMS — the systemic issues above Mission
  problems: [
    { id:'PB0', title:"示例問題 A — 工具各自獨立",
      note:"示例說明：背景資訊分散在行事曆、收件匣、文件與任務清單中。",
      severity:'high', affects:['M1','M2'] },
    { id:'PB1', title:"示例問題 B — 工作之間缺少延續",
      note:"示例說明：助理與工作流程經常重新開始，先前的決定沒有被保留。",
      severity:'high', affects:['M1'] },
    { id:'PB2', title:"示例問題 C — 工作尚未完成就停下",
      note:"示例說明：同時留下太多未完成的事情，使後續工作更加吃力。",
      severity:'med', affects:['M1','M2'] },
    { id:'PB3', title:"示例問題 D — 有用的知識未能留下",
      note:"示例說明：有用的思考散落在短暫對話中，沒有整理成可再次使用的知識。",
      severity:'med', affects:['M2'] },
  ],

  // 3. MISSION — three horizons
  missions: [
    { id:'M0', title:"好好生活，保持好奇",                              horizon:"一生" },
    { id:'M1', title:"透過容易使用的工具，協助人做出更合適的選擇", horizon:"10 年", active:true, addresses:['PB0','PB1','PB2'] },
    { id:'M2', title:"持續累積能長久使用的成果",                         horizon:"25 年", addresses:['PB2','PB3'] },
  ],

  // 4. GOALS — outcomes serving Mission
  goals: [
    { id:'G0',  title:"示例健康目標 — 睡眠",        kpi:'6 小時 58 分', target:'7 小時 30 分', pct:74, delta:+2.1, dims:['health','rhythms'],        metrics:['MT0'] },
    { id:'G1',  title:"示例健康目標 — 每週活動距離",     kpi:'18.4 公里', target:'25 公里', pct:61, delta:+1.4, dims:['health'],                metrics:['MT1'] },
    { id:'G2',  title:"完成示例專案 A",                    kpi:'0 / 1,000', target:"6 月", pct:12, delta:+12,  dims:['creative','money'],       metrics:['MT2','MT8'] },
    { id:'G3',  title:"達到示例每月經常性收入目標",                      kpi:'$18.2k', target:'$40k', pct:45, delta:+2.8, dims:['money','freedom'],       metrics:['MT3'] },
    { id:'G4',  title:"示例創作目標 — 持續發表", kpi:'19 / 50', target:"12 月", pct:38, delta:+4, dims:['creative'],             metrics:['MT4'] },
    { id:'G6',  title:"示例工作目標 — 專注時間",     kpi:'2 小時 41 分', target:'4 小時', pct:67, delta:+0.3, dims:['creative','rhythms'],      metrics:['MT5'] },
    { id:'G7',  title:"陪伴 12 位示例參與者",             kpi:'3 / 12', target:"12 月", pct:25, delta:0,   dims:['relationships','creative'],metrics:['MT6'] },
    { id:'G8',  title:"示例關係目標 — 聯繫節奏", kpi:'每週 1.4 次', target:'每週 2 次', pct:70, delta:-0.1, dims:['relationships'], metrics:['MT7'] },
    { id:'G9',  title:"示例工作完成率目標",              kpi:'54%', target:'80%', pct:54, delta:+6,   dims:['creative','rhythms'],        metrics:['MT8'] },
    { id:'G10', title:"示例備用金目標",                       kpi:'7.8 個月', target:"12 個月", pct:65, delta:+0.4, dims:['money','freedom'],        metrics:['MT9'] },
  ],

  // 5. METRICS — first-class, tracked independently of Goals
  metrics: [
    { id:'MT0', label:"示例睡眠指標",        value:'6 小時 58 分',  unit:'',     trend:+0.12, spark:[6.4,6.5,6.6,6.7,6.8,6.9,6.9,7.0,6.9,7.0,7.0,7.0], feeds:['G0'],     color:'--health'   },
    { id:'MT1', label:"示例活動距離",     value:'18.4',  unit:'公里',   trend:+1.4,  spark:[10,11,12,13,14,14,15,16,17,17,18,18],                 feeds:['G1'],     color:'--health'   },
    { id:'MT2', label:"示例報名人數",      value:'124',   unit:'',     trend:+22,   spark:[0,0,2,6,14,28,44,62,80,98,112,124],                   feeds:['G2'],     color:'--creative' },
    { id:'MT3', label:"示例每月經常性收入",          value:'$18.2k',unit:'',     trend:+2.8,  spark:[8.2,9.1,10.4,11.6,12.8,13.5,14.2,15.4,16.1,16.9,17.6,18.2], feeds:['G3'], color:'--money'   },
    { id:'MT4', label:"示例寫作記錄",      value:'19',    unit:'/50',  trend:+4,    spark:[2,3,4,6,7,9,11,13,14,16,18,19],                       feeds:['G4'],     color:'--creative' },
    { id:'MT5', label:"示例專注時間",        value:'2 小時 41 分',  unit:'',     trend:+0.08, spark:[1.8,1.9,2.0,2.1,2.1,2.2,2.3,2.4,2.5,2.5,2.6,2.7],     feeds:['G6'],     color:'--rhythms'  },
    { id:'MT6', label:"示例參與人數",       value:'3',     unit:'/12',  trend:0,     spark:[0,1,1,2,2,2,3,3,3,3,3,3],                             feeds:['G7'],     color:'--relationships' },
    { id:'MT7', label:"示例聯繫頻率",      value:'1.4',   unit:'／週',  trend:-0.1,  spark:[1.6,1.7,1.6,1.8,1.7,1.6,1.5,1.5,1.4,1.5,1.4,1.4],     feeds:['G8'],     color:'--relationships' },
    { id:'MT8', label:"示例工作完成率",   value:'54',    unit:'%',    trend:+6,    spark:[42,43,44,45,46,47,48,49,50,51,52,54],                 feeds:['G2','G9'],color:'--creative' },
    { id:'MT9', label:"示例備用金月數",       value:'7.8',   unit:'個月',   trend:+0.4,  spark:[5.1,5.5,5.9,6.1,6.4,6.7,6.9,7.1,7.3,7.5,7.7,7.8],     feeds:['G10'],    color:'--money'   },
  ],

  // 6. CHALLENGES
  challenges: [
    { id:'C0', title:"示例挑戰 — 背景資訊分散", note:"示例說明：同時處理太多事情，注意力難以停留。", blocks:['G2','G6','G9'] },
    { id:'C1', title:"專案中途反覆轉向",                 note:"示例說明：工作常在接近完成時停下。", blocks:['G2','G4','G9'] },
    { id:'C2', title:"示例挑戰 — 收入來源集中",     note:"示例說明：過度依靠少數收入來源。",      blocks:['G3','G10'] },
    { id:'C3', title:"示例挑戰 — 睡眠節奏改變",       note:"示例說明：晚睡可能影響接下來幾天的精力與恢復。", blocks:['G0','G1','G6'] },
    { id:'C4', title:"示例挑戰 — 被訊息牽動",         note:"示例說明：持續回應訊息，壓縮了完整工作的時間。",           blocks:['G6'] },
    { id:'C5', title:"示例挑戰 — 關係逐漸疏遠",           note:"示例說明：缺少聯繫時，關係可能逐漸淡下來。",   blocks:['G7','G8'] },
  ],

  // 7. STRATEGIES
  strategies: [
    { id:'S0',  title:"先定義完成 — 同時進行的工作≤2，開始前先寫下完成條件", overcomes:['C0','C1'], implements:['G2','G9'], active:true },
    { id:'S1',  title:"示例策略 — 分散收入來源",                            overcomes:['C2'],      implements:['G3','G10'] },
    { id:'S2',  title:"示例策略 — 晚間作息",                                     overcomes:['C3'],      implements:['G0','G6'] },
    { id:'S3',  title:"示例策略 — 訊息處理節奏",                                       overcomes:['C0','C4'], implements:['G6'] },
    { id:'S4',  title:"示例策略 — 聯繫節奏",                                      overcomes:['C5'],      implements:['G7','G8'] },
    { id:'S5',  title:"示例策略 — 寫作節奏",                                     overcomes:['C1'],      implements:['G4'] },
    { id:'S6',  title:"示例策略 — 活動節奏",                                     overcomes:['C3'],      implements:['G1'] },
    { id:'S7',  title:"示例策略 — 儲蓄安排",                                    overcomes:['C2'],      implements:['G10'] },
    { id:'S8',  title:"示例策略 — 留出完整專注時段",                                        overcomes:['C0','C4'], implements:['G6','G9'] },
    { id:'S11', title:"每週整理進展 — 留下一份示例工作筆記",         overcomes:['C1'],      implements:['G7'] },
  ],

  // 8. PROJECTS · 9. WORK
  projects: [
    { id:'P0', title:"示例專案 A — 開發", strategy:'S0', dims:['creative','money'], status:'green',
      work:[
        { id:'W0', title:"示例工作 — 定義資料結構", strategy:'S0', eta:"2 天", status:'green', owner:'D' },
        { id:'W1', title:"示例工作 — 同步關係圖",    strategy:'S0', eta:"4 天", status:'amber', owner:'K' },
        { id:'W2', title:"示例工作 — 完成初次使用流程", strategy:'S0', eta:"7 天", status:'amber', owner:'D' },
      ]},
    { id:'P1', title:"示例專案 B — 日常維運", strategy:'S0', dims:['creative','rhythms'], status:'green',
      work:[
        { id:'W3', title:"示例工作 — 整理預設設定", strategy:'S0', eta:"今天", status:'green', owner:'D' },
        { id:'W4', title:"示例工作 — 調整版面", strategy:'S0', eta:"3 天", status:'green', owner:'D' },
      ]},
    { id:'P2', title:"示例專案 C — 寫作", strategy:'S5', dims:['creative'], status:'amber',
      work:[
        { id:'W5', title:"示例工作 — 修訂草稿", strategy:'S5', eta:"週六", status:'amber', owner:'D' },
      ]},
    { id:'P3', title:"示例專案 D — 自動化", strategy:'S7', dims:['money','freedom'], status:'amber',
      work:[
        { id:'W6', title:"示例工作 — 自動轉存", strategy:'S7', eta:"5 天", status:'amber', owner:'K' },
        { id:'W7', title:"示例工作 — 更新帳目",     strategy:'S7', eta:"9 天", status:'red',   owner:'D' },
      ]},
    { id:'P4', title:"示例專案 E — 生活節奏", strategy:'S6', dims:['health'], status:'green',
      work:[
        { id:'W8', title:"示例工作 — 維持日常安排", strategy:'S6', eta:"持續進行", status:'green', owner:'D' },
      ]},
    { id:'P5', title:"示例專案 F — 共學", strategy:'S11', dims:['relationships','creative'], status:'red',
      work:[
        { id:'W9',  title:"示例工作 — 擬定課程", strategy:'S11', eta:"14 天", status:'red', owner:'D' },
        { id:'W10', title:"示例工作 — 發布報名表", strategy:'S11', eta:"21 天", status:'red', owner:'K' },
      ]},
  ],

  // 10. TEAM — humans + agents
  team: [
    { id:'T0', name:"示例使用者", role:"決策者", kind:'human',
      owns:['P0','P1','P2','P4','P5'], avatar:'U', note:"決定方向與重要取捨。" },
    { id:'T1', name:"示例助理",   role:"主要助理 · 創作與策略", kind:'agent',
      owns:['P0','P3'], avatar:'A', note:"參與設計、研究、開發與基礎建置。" },
    { id:'T2', name:"示例代理 A", role:"示例代理 · 192.0.2.5",  kind:'agent',
      owns:['P4','P5'], avatar:'B', note:"示例代理 — 處理日常工作。" },
    { id:'T3', name:"示例代理 B", role:"示例代理 · 192.0.2.11", kind:'agent',
      owns:[], avatar:'C', note:"示例代理 — 協作成員。" },
    { id:'T4', name:"示例代理 C", role:"示例代理 · 192.0.2.8",  kind:'agent',
      owns:[], avatar:'D', note:"示例代理 — 協作成員。" },
  ],

  // 11. BUDGET — money, time, attention
  budget: [
    { id:'B0', kind:'money',     label:"每月支出",        value:'$6.4k',  of:'$8.0k', pct:80,
      funds:['P0','P3'], note:"示例說明：目前示例專案的維運費用。" },
    { id:'B1', kind:'money',     label:"備用金",      value:'$51k',   of:'$96k',  pct:53,
      funds:['G10'], note:"示例說明：備用金相對於設定值的現況。" },
    { id:'B2', kind:'money',     label:"捐助",              value:'$420',   of:'$1.0k', pct:42,
      funds:['G13'], note:"示例說明：捐助配置與示例目標。" },
    { id:'B3', kind:'time',      label:"每週專注工作時間",  value:'18h',    of:'28h',   pct:64,
      funds:['P0','P1','P2'], note:"示例說明：留給開發與寫作的完整時間。" },
    { id:'B4', kind:'time',      label:"每週會議時間",     value:'4h',     of:'6h',    pct:67,
      funds:['P5'], note:"示例說明：共學專案的協作時間。" },
    { id:'B5', kind:'attention', label:"進行中的工作",      value:'11',     of:'2',     pct:100, warn:true,
      funds:['P0','P1','P2','P3','P5'], note:"示例說明：進行中的工作超過示例設定上限。" },
    { id:'B6', kind:'attention', label:"待處理訊息",      value:'63',     of:'20',    pct:100, warn:true,
      funds:['G12'], note:"示例說明：待處理訊息超過示例設定值。" },
    { id:'B7', kind:'attention', label:"手機使用時間",   value:'1h52',   of:'1h00',  pct:100, warn:true,
      funds:[], note:"示例說明：手機使用時間超過示例設定值。" },
  ],

  // Auto-generated next moves
  recommendations: [
    { id:'R0',
      action:"示例建議：先收斂正在進行的工作，再考慮新的事情。",
      because:"示例依據：參考 B5、S0、C0、G2、G6、G9 與 M1 的關聯。",
      upstream:['B5','S0','C0','G2','G6','G9','M1'],
      effort:"規劃 1 小時，後續持續調整",
      impact:'high' },
    { id:'R1',
      action:"示例建議：先為需要專注的工作留出時間。",
      because:"示例依據：參考 MT5、S8、G6、G9 與 M1 的關聯。",
      upstream:['MT5','S8','G6','G9','M1'],
      effort:"花 5 分鐘安排時間",
      impact:'high' },
    { id:'R2',
      action:"示例建議：先完成眼前的草稿，再開始下一項工作。",
      because:"示例依據：參考 P2、S5、MT4、MT8、G4、G9 與 M2 的關聯。",
      upstream:['P2','S5','MT4','MT8','G4','G9','M2'],
      effort:"寫作 3 小時",
      impact:'med' },
  ],

  // Orphans
  stranded: {
    work_no_goal: [
      { id:'W11', title:"示例待連結工作 — 重整素材", owner:'D', age:"43 天" },
      { id:'W12', title:"示例待連結工作 — 搬移筆記", owner:'D', age:"12 天" },
    ],
    goals_no_strategy: [
      { id:'G13', title:"示例待連結目標 — 捐助",   reason:"尚未連結策略" },
      { id:'G14', title:"示例待連結目標 — 靜修安排", reason:"目前只有部分安排：S9 涵蓋節奏，尚未涵蓋經費" },
    ],
    strategies_idle: [
      { id:'S10', title:"示例待實行策略 — 整理注意力", reason:"21 天內尚無工作記錄" },
    ],
  },

  subtabs: [
    { id:'business',  label:"事業",  dim:'money',         cur:62, ideal:95, velo:+2.8, target:'2027',
      top:"示例摘要：經營狀況與客戶組成。" },
    { id:'finances',  label:"財務",  dim:'money',         cur:62, ideal:95, velo:+3.0, target:'2027',
      top:"示例摘要：備用金與儲蓄節奏。" },
    { id:'health',    label:"健康",    dim:'health',        cur:71, ideal:90, velo:+1.2, target:"12 月",
      top:"示例摘要：恢復與睡眠記錄。" },
    { id:'work',      label:"工作",      dim:'creative',      cur:48, ideal:85, velo:+2.4, target:"12 月",
      top:"示例摘要：進行中的工作、專注時間與阻礙。" },
    { id:'life',      label:"生活",      dim:'relationships', cur:77, ideal:90, velo:-0.4, target:"持續進行",
      top:"示例摘要：關係與聯繫節奏。" },
  ],

  // Preference context — quiet strip below primitives
  preferences: {
    books:      ["示例書籍 A", "示例書籍 B", "示例書籍 C", "示例書籍 D"],
    films:      ["示例電影 A", "示例電影 B", "示例電影 C", "示例電影 D"],
    anime:      ["示例動畫 A", "示例動畫 B", "示例動畫 C"],
    characters: ["示例角色 A", "示例角色 B", "示例角色 C", "示例角色 D"],
    aphorisms:  ["示例短句 — 可透過 /interview 換成自己的內容", "示例短句 B — 可透過 /interview 換成自己的內容", "示例短句 C — 可透過 /interview 換成自己的內容"],
    hobbies:    ["示例興趣 A", "示例興趣 B", "示例興趣 C", "示例興趣 D"],
    literature: ["示例作者 A", "示例作者 B", "示例作者 C", "示例作者 D"],
  },

  narrativeSeed: {
    days_into: 5,
    push_name: "示例開發階段",
    current_work: 'W0',
    via_strategy: 'S0',
    addresses: 'C1',
    moves_goal: 'G9',
    serves_mission: 'M1',
  },
  workNarrative: {
    summary: "示例工作：3 項進行中、2 項待開始、5 項待整理。這些不是你的工作記錄。",
    inProgress: 3,
    done: 4,
    ready: 2,
    inbox: 5,
  },
  currentStateNarrative: "這是當下狀態的示例：正在準備工作台，下一步是整理自己的意圖與方向。尚未提供的個人狀態不做推測。",
  idealStateNarrative: "理想生活的示例：照顧身體、保持財務餘裕、安排自己的時間、持續創作、維繫關係，也留出休息的空間。",
  currentStateBullets: [
    { label: "注意力", value: "完成示例工作台" },
    { label: "能量", value: '7/10' },
    { label: "心情", value: "穩定（示例）" },
    { label: "目前意圖", value: "整理並接入自己的意圖與方向" },
    { label: "近期進展", value: "示例頁面可以完整顯示" },
  ],
  idealStateBullets: [
    { label: "健康", value: "長期照顧健康，保有活動能力" },
    { label: "財務", value: "維持財務餘裕與備用金" },
    { label: "自主", value: "自主安排時間，保留完整工作的上午" },
    { label: "創作", value: "自由創作，例如音樂、寫作與設計" },
    { label: "關係", value: "用心維繫關係" },
    { label: "生活節奏", value: "一年之中也安排離線休息" },
  ],
  synthesisParagraph: "以下示範如何把工作、阻礙與策略連回使命；完成個人設定後，這裡會顯示你的記錄。",
  synthesisSegments: [
    { kind: 'text', text: "目前的示例工作連向「" },
    { kind: 'mission', text: "示例使命", id: 'M0' },
    { kind: 'text', text: "」，需要回應的是「" },
    { kind: 'problem', text: "示例問題", id: 'P0' },
    { kind: 'text', text: "」，可以從「" },
    { kind: 'strategy', text: "先做一小步", id: 'S0' },
    { kind: 'text', text: "」這個策略開始。目前有 " },
    { kind: 'work', text: "3 項示例工作" },
    { kind: 'text', text: "進行中。" },
  ],
  recommendedNextAction: "可以透過 /interview 梳理自己的方向，將示例換成個人記錄。",
} as const satisfies Telos;
