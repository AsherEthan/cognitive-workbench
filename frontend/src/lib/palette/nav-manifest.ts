// Single source of truth for Pulse's page manifest.
// AppHeader renders the nav from these arrays; the command palette derives its
// page commands from them. Adding a page here updates both surfaces.
import {
  Activity,
  BarChart3,
  Boxes,
  Bot,
  BookOpen,
  Brain,
  Briefcase,
  Clapperboard,
  Compass,
  Container,
  DollarSign,
  FolderKanban,
  Gauge,
  Home,
  Library,
  MapPin,
  Radar,
  ScrollText,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TreePine,
  TrendingUp,
  UsersRound,
  Waypoints,
  Webhook,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Palette-only match aliases; the nav bar ignores this field. */
  keywords?: string[];
  /**
   * PULSE.toml [modules] key backing this page. When that module is switched
   * off its tab disappears from the nav and the palette instead of opening a
   * page with no data behind it. Entries with no key are always shown — either
   * they are infrastructure, or Pulse cannot serve the dashboard without them.
   * ported from public PR #1749, @elhoim
   */
  module?: string;
}

// ── Tier 1 — the persistent global nav (Life sections + System home).
// This is the ONLY always-visible menu. Everything else is contextual.
export const tier1Nav: NavItem[] = [
  { href: "/changelog", label: "更新日誌", icon: ScrollText, keywords: ["更新", "日誌", "changelog", "新功能"] },
  { href: "/chat", label: "輸入口", icon: Bot, keywords: ["chat", "輸入", "想法", "意圖", "狀態", "模型", "對話"] },
  { href: "/practices", label: "練習與實踐", icon: BookOpen, keywords: ["練習", "呼吸", "冥想", "氣功", "瑜伽", "禪修", "方法", "實踐", "法門", "止觀", "參究", "念佛", "持戒", "密宗", "practices"] },
  { href: "/awareness", label: "自我覺察", icon: Compass, keywords: ["awareness", "check-in", "清楚度", "安住度", "鬆緊度", "狀態", "覺察"] },
  // /life and /books shipped as pages with no route into them from anywhere —
  // not in the nav, not in the palette, reachable only by typing the URL.
  // public issue #1708, @schmetti-dev
  { href: "/life", label: "生活概覽", icon: Compass, keywords: ["overview", "today", "snapshot", "dashboard", "rings"] },
  { href: "/telos", label: "意圖與方向", icon: Target, keywords: ["goals", "mission", "problems"], module: "telos" },
  { href: "/work", label: "任務與工作", icon: FolderKanban, keywords: ["kanban", "sessions", "tasks", "projects", "repos", "sites"], module: "work" },
  { href: "/content", label: "內容創作", icon: Clapperboard, keywords: ["videos", "pipeline", "conveyor"], module: "content" },
  { href: "/health", label: "健康", icon: Activity, keywords: ["sleep", "fitness"], module: "health" },
  { href: "/finances", label: "財務", icon: DollarSign, keywords: ["money", "burn", "expenses", "revenue"], module: "finances" },
  { href: "/business", label: "事業", icon: Briefcase, keywords: ["company", "newsletter"], module: "business" },
  { href: "/growth", label: "成長", icon: TrendingUp, keywords: ["metrics", "subscribers", "audience"], module: "growth" },
  { href: "/local", label: "在地資訊", icon: MapPin, keywords: ["civic", "crime", "city"], module: "local" },
  { href: "/gear", label: "物品", icon: Boxes, keywords: ["assets", "inventory", "own", "stuff"], module: "gear" },
  { href: "/books", label: "閱讀", icon: Library, keywords: ["reading", "library", "favorites", "authors"], module: "books" }, // public issue #1708, @schmetti-dev
  { href: "/atlas", label: "資源地圖", icon: Waypoints, keywords: ["graph", "assets", "estate", "infrastructure", "blast radius", "domains", "workers", "current state"], module: "atlas" },
  { href: "/memory", label: "記憶與知識", icon: Brain, keywords: ["memory", "knowledge", "wiki", "notes", "archive", "graph"], module: "memory" },
  { href: "/synapse", label: "想法收集", icon: Share2, keywords: ["ideas", "capture", "router", "amber"], module: "synapse" },
];

// The standalone app only advertises pages backed by its local service.
// Keep this separate so existing LifeOS web deployments retain their menu.
export const desktopNav: NavItem[] = [
  { href: "/awareness", label: "自我覺察", icon: Compass, keywords: ["awareness", "狀態", "覺察"] },
  { href: "/practices", label: "練習與實踐", icon: BookOpen, keywords: ["practices", "練習", "閱讀", "冥想"] },
  { href: "/agent", label: "Agent", icon: Bot, keywords: ["hermes", "對話", "輸入口", "助理", "代理", "工作"] },
];

// ── Meta — pinned in the header's right cluster on EVERY page, outside both
// tiers. Agents is the view of the system working on itself, so it never
// scrolls away and never depends on which plane you're in.
export const metaNav: NavItem[] = [
  { href: "/agents", label: "代理協作", icon: UsersRound, keywords: ["system", "vitals", "runs", "meta"] },
];

// Where the pinned SYSTEM mode-switch lands (Agents moved out to metaNav).
export const systemHome = "/assistant";

// ── Tier 2 — contextual. These machine pages render as a second row ONLY when
// you are inside System. They used to be a permanent second global menu.
export const systemNav: NavItem[] = [
  { href: "/assistant", label: "助理與系統", icon: Bot, keywords: ["chat", "ask"], module: "da" },
  { href: "/bunker", label: "應用管理", icon: Container, keywords: ["apps", "chassis"], module: "bunker" },
  { href: "/algorithm", label: "思考流程", icon: Workflow, keywords: ["thinking", "doctrine", "rules", "loop"], module: "algorithm" },
  { href: "/skills", label: "技能", icon: Zap },
  { href: "/hooks", label: "觸發設定", icon: Webhook },
  { href: "/conduit", label: "感測設定", icon: Radar, keywords: ["sensors"], module: "conduit" },
  { href: "/upgrades", label: "系統改進", icon: Sparkles, keywords: ["hypotheses", "recommendations", "improvements", "directives", "proposals"], module: "upgrades" },
  { href: "/arbol", label: "工作流程", icon: TreePine, keywords: ["workers", "pipeline"] },
  { href: "/security", label: "安全", icon: ShieldCheck, keywords: ["monitoring"] },
  { href: "/ledger", label: "更新紀錄", icon: ScrollText, keywords: ["versions", "updates", "deploys", "drift", "integrity", "registry", "changelog"], module: "ledger" },
  { href: "/performance", label: "效能", icon: BarChart3, keywords: ["performance", "latency"], module: "performance" },
  { href: "/usage", label: "用量", icon: Gauge, keywords: ["tokens", "cost"], module: "usage" },
  { href: "/docs", label: "使用指南", icon: BookOpen, keywords: ["documentation", "wiki"], module: "docs" },
];

const homeEntry: NavItem = { href: "/", label: "首頁", icon: Home, keywords: ["dashboard", "pulse"] };

/** Every page the palette can jump to, in display order. */
export const paletteEntries: NavItem[] = [homeEntry, ...tier1Nav, ...metaNav, ...systemNav];
