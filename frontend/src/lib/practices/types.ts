export type PracticeAccess = "self" | "guided" | "teacher" | "reference";
export type PracticeKind = "method" | "classification" | "candidate" | "recitation";
export type PracticeTradition = "buddhism" | "yoga" | "ayurveda" | "tibet" | "china" | "sufi" | "reiki" | "modern";
export type PracticeDimension = "clarity" | "stability" | "tension";
export type ScriptureStudyStatus = "available" | "source-only" | "not-applicable" | "unresolved";
export type ScriptureTextScope = "mantra" | "excerpt" | "title" | "full" | "none";
export interface ScripturePurpose {
  status: "source-described" | "family-context" | "unresolved";
  summary: string;
  traditionalUses: { label: string; description: string }[];
  intention: string;
  context: string;
  referenceUrls: string[];
}
export interface ScriptureStudy {
  sanskrit: {
    status: ScriptureStudyStatus;
    scope: ScriptureTextScope;
    iast?: string;
    devanagari?: string;
    note: string;
    referenceUrls: string[];
  };
  pronunciation: {
    status: ScriptureStudyStatus;
    scope: ScriptureTextScope;
    system: string;
    text?: string;
    chineseApproximation?: string;
    chineseApproximationNote?: string;
    note: string;
    referenceUrls: string[];
    audioUrl?: string;
  };
  annotation: {
    overview: string;
    passages: { label: string; original?: string; reading?: string; meaning: string }[];
    terms: { term: string; meaning: string }[];
    note: string;
    referenceUrls: string[];
  };
}
export interface Practice {
  id: string;
  title: string;
  aliases: string[];
  traditions: PracticeTradition[];
  access: PracticeAccess;
  kind: PracticeKind;
  summary: string;
  duration: string;
  observations: PracticeDimension[];
  content: string;
  sourcePageId?: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceBlockIds: string[];
  relatedIds: string[];
  scripture?: {
    originalName: string;
    photoColumn: "left" | "middle" | "right";
    photoRow: number;
    identificationStatus: "confirmed" | "family" | "uncertain";
    canonicalName?: string;
  };
  recitation?: {
    text: string;
    version: string;
    language: string;
    status: "verified-public" | "source-only" | "unresolved";
    referenceUrl?: string;
  };
  references?: { title: string; url: string; note?: string }[];
  audioGuide?: {
    sourceUrl: string;
    note: string;
    tracks: { language: string; url: string; durationSeconds?: number }[];
  };
  study?: ScriptureStudy;
  scripturePurpose?: ScripturePurpose;
}
export interface PracticeSource { id: string; title: string; url: string; markdown: string; blockIds: string[]; }
export const TRADITION_LABELS: Record<PracticeTradition,string> = {buddhism:"佛教禪修",yoga:"印度瑜伽",ayurveda:"阿育吠陀",tibet:"藏傳與苯教",china:"中國氣功與道家",sufi:"蘇菲傳統",reiki:"靈氣",modern:"現代與跨體系"};
export const ACCESS_LABELS: Record<PracticeAccess,string> = {self:"可自行短試",guided:"先跟公開引導",teacher:"需教師與傳承",reference:"分類與待核查"};
export const KIND_LABELS: Record<PracticeKind,string> = {method:"方法與版本",classification:"分類索引",candidate:"待核查線索",recitation:"經咒與儀軌"};
export const DIMENSION_LABELS: Record<PracticeDimension,string> = {clarity:"清楚度",stability:"安住度",tension:"鬆緊度"};
