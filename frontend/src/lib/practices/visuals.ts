import visualMap from './visual-map.json';
import type { Practice } from './types';
export const MOTIFS = {
  oral: { label: '口腔與照顧', color: '#d6c29a', meaning: '上下弧線與接觸點表達口腔相關主題，具體操作仍依原文與合適指導。' },
  breath: { label: '呼吸覺察', color: '#a8ded1', meaning: '以舒展的輪廓表達對呼吸的留意。圖形節奏不是呼吸指令。' },
  scan: { label: '身體掃描', color: '#9fc8e0', meaning: '注意點沿身體輪廓移動，表達逐區留意身體感受。' },
  rest: { label: '休息與支持', color: '#aebddd', meaning: '水平輪廓與承托平面，表達休息、支持與放鬆。' },
  walk: { label: '經行與步行', color: '#d6c29a', meaning: '交替的足跡沿路徑出現，表達行走時的覺察。' },
  kindness: { label: '善意與慈心', color: '#dfb7af', meaning: '柔和的環由近而遠展開，表達善意的擴展，不代表能量測量。' },
  touch: { label: '輕觸與照顧', color: '#d6c29a', meaning: '接觸點與局部漣漪，表達把注意帶回接觸處。' },
  recite: { label: '聲音與持誦', color: '#ccbce1', meaning: '重複的節點與波形表達持誦或聆聽；文字及發音以條目原文為準。' },
  awareness: { label: '開放與觀照', color: '#b5e5d5', meaning: '散布的點在開放空間中出現與消退，表達覺察對象的變化。' },
  movement: { label: '身體與動作', color: '#b8d1ad', meaning: '關節線與弧線表達動作的連續性；這是概念模型，並非標準姿勢示範。' },
  posture: { label: '姿勢與支撐', color: '#b8d1ad', meaning: '穩定的身體軸線與支持面，表達姿勢及支撐的關係。' },
  flow: { label: '氣脈與內在圖式', color: '#d6c29a', meaning: '曲線呈現傳統中的內在圖式，並非解剖結構或身體能量讀數。' },
  gaze: { label: '凝視', color: '#a8ded1', meaning: '穩定焦點與外圍環，表達視覺注意的安住。' },
  withdraw: { label: '感官收攝', color: '#9fc8e0', meaning: '由外向內的輪廓表達注意收攝，沒有規定閉眼或閉氣。' },
  visualize: { label: '觀想', color: '#ccbce1', meaning: '幾何層次表達心中形象的構成，不替代傳承中的本尊、符號或儀軌。' },
  contemplate: { label: '聞思與省察', color: '#9fc8e0', meaning: '節點與連線表達理解、對照與回看，不把思考變成成就評分。' },
  ritual: { label: '儀軌與學習', color: '#d6c29a', meaning: '分層的軌道表達儀軌結構，具體順序與條件以法本及教學為準。' },
  rotate: { label: '旋轉與儀式', color: '#dfb7af', meaning: '中心軸與緩慢旋轉的輪廓表達儀式特徵，不提供旋轉速度或動作教學。' },
  rhythm: { label: '日常節律', color: '#b8d1ad', meaning: '一圈明暗與日夜位置表達生活節律，不設定個人作息。' },
  moon: { label: '觀月', color: '#cfdbec', meaning: '月面、夜空與固定的注意點，呼應條目的觀月主題。' },
  index: { label: '分類與研究', color: '#a3b5b8', meaning: '分支與索引格表達條目間的關係；保留分類、版本與待核查性質。' },
  book: { label: '經典與閱讀', color: '#d6c29a', meaning: '書頁與平行線表達閱讀及讀誦，正文仍在原有閱讀區完整呈現。' },
  ethics: { label: '戒行與承諾', color: '#b8d1ad', meaning: '穩定的節點及連線表達行為與承諾，不代表功德或完成程度。' },
  dream: { label: '夢與覺察', color: '#aebddd', meaning: '交疊的透明輪廓表達夢境主題，不替代夢瑜伽的正式教學。' },
} as const;
export type Motif = keyof typeof MOTIFS;
export interface VisualProfile { motif: Motif; seed: number; mode: 'reference' | 'concept' | 'illustration'; anchor: string; }
export const practiceVisualMap = visualMap as Record<string, VisualProfile>;
export function visualFor(practice: Practice): VisualProfile {
  const profile = practiceVisualMap[practice.id];
  if (!profile) throw new Error(`Missing visual profile: ${practice.id}`);
  return profile;
}
export const VISUAL_MODE_LABELS = { reference: '研究與分類示意', concept: '傳統概念示意', illustration: '方法主題示意' };
