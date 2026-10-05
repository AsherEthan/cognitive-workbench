import { practicePathMap } from "./pathway-map";

export const PRACTICE_PATH_IDS = [
  "samatha-vipassana", "chan-inquiry", "buddha-remembrance", "ethical-conduct",
  "wisdom-study", "foundations-mindfulness", "supportive-means", "vajrayana", "body-mind",
] as const;
export type PracticePathId = typeof PRACTICE_PATH_IDS[number];
export interface PracticePathNode { label: string; children?: PracticePathNode[]; }
export interface PracticePathway {
  id: PracticePathId;
  title: string;
  subtitle: string;
  description: string;
  branches: PracticePathNode[];
  scopeNote?: string;
}

// The supplied map defines the reading paths; assignments preserve each record's own tradition.
export const PRACTICE_PATHWAYS: PracticePathway[] = [
  {
    id: "samatha-vipassana", title: "止觀禪修", subtitle: "安住與觀照",
    description: "從安住與觀照入手，了解禪修的不同方法與次第。",
    branches: [
      { label: "禪修五程序", children: ["入修", "修止", "修觀", "養息修", "出修"].map(label => ({ label })) },
      { label: "從止觀入手，逐步以慧觀引導" },
      { label: "具體方法", children: ["四念住：觀身、受、心、法", "覺觀禪", "默照禪"].map(label => ({ label })) },
    ],
  },
  {
    id: "chan-inquiry", title: "參究法門", subtitle: "疑問與參究",
    description: "保留漢傳禪宗的參究路線，從疑問、話頭與不斷回看中了解其修學脈絡。",
    branches: [{ label: "漢傳禪宗的參究路線" }, { label: "疑情與持續參究" }, { label: "專修與日常實踐" }],
    scopeNote: "目前尚未收錄獨立的參究方法；這個方向先保留作為閱讀與後續整理的入口。",
  },
  {
    id: "buddha-remembrance", title: "念佛法門", subtitle: "憶念與願行",
    description: "以憶念佛、持名與願行為方向，保留淨土相關文本及不同念佛版本。",
    branches: [{ label: "持名與持誦" }, { label: "淨土願行" }, { label: "專修與日常念佛" }],
  },
  {
    id: "ethical-conduct", title: "持戒法門", subtitle: "行為與生活",
    description: "以倫理與戒律為基礎，從身、語、意的日常實踐了解修行。",
    branches: [{ label: "道德倫理基礎" }, { label: "身、語、意三業", children: [
      { label: "身業：經行" }, { label: "語業：本體音藝" }, { label: "意業：邏輯因明" }, { label: "以心法貫通實踐" },
    ] }],
    scopeNote: "條目依其主要修學脈絡分類；普通步行與發聲練習不直接等同持戒。",
  },
  {
    id: "wisdom-study", title: "慧解脫法", subtitle: "理解與辨析",
    description: "從聞思、經典閱讀與觀察入手，理解人生、執取與智慧的關係。",
    branches: [{ label: "知識與聞思", children: [{ label: "心理與人生的分析" }, { label: "社會人生的觀察" }] },
      { label: "經典閱讀與辨析" }],
  },
  {
    id: "foundations-mindfulness", title: "念處專業觀修", subtitle: "身、受、心、法",
    description: "以念處為觀察框架，保留四念住的完整分類與相應方法。",
    branches: [{ label: "傳統四念住", children: ["觀身", "觀受", "觀心", "觀法"].map(label => ({ label })) },
      { label: "延伸的五方面觀察", children: ["身", "受", "法", "心", "義"].map(label => ({ label })) },
      { label: "結合知識理解與禪觀技術" }],
    scopeNote: "四念住與五方面觀察分別呈現，保留原有框架的差異。",
  },
  {
    id: "supportive-means", title: "特殊方便法門", subtitle: "憶念、讀誦與禮敬",
    description: "從憶念、發願、持咒、誦經與禮拜等方式，了解支持修行的不同入口。",
    branches: [{ label: "憶念與修養", children: ["念佛、念法、念僧", "念修行功德", "念天"].map(label => ({ label })) },
      { label: "讀誦與禮敬", children: ["持咒", "誦經", "禮拜"].map(label => ({ label })) }],
  },
  {
    id: "vajrayana", title: "密宗體系", subtitle: "傳承與儀軌",
    description: "保留密乘的本尊、持咒、儀軌與觀修脈絡，依具體傳承了解其學習條件。",
    branches: [{ label: "大手印" }, { label: "大圓滿" }, { label: "本尊、持咒與儀軌" }, { label: "正規傳承與版本辨識" }],
    scopeNote: "不因名稱相似便合併不同教法；瑜伽印法、苯教與佛教密乘仍保留各自的來源。",
  },
  {
    id: "body-mind", title: "其他身心實踐", subtitle: "保留各體系的原意",
    description: "收錄瑜伽、氣功、道家、苯教、蘇菲、靈氣與現代身心練習，依各自來源閱讀。",
    branches: [{ label: "印度瑜伽與阿育吠陀" }, { label: "中國氣功與道家" }, { label: "其他傳統與現代身心練習" }],
    scopeNote: "這是為現有跨體系內容保留的方向，可再使用傳統與接近方式縮小範圍。",
  },
];

export const PRACTICE_PATH_BY_ID = new Map(PRACTICE_PATHWAYS.map(path => [path.id, path]));
export function parsePracticePath(value: string | null): PracticePathId | "all" {
  return value && PRACTICE_PATH_BY_ID.has(value as PracticePathId) ? value as PracticePathId : "all";
}
export function getPracticePathIds(id: string): PracticePathId[] { return practicePathMap[id] ?? []; }
