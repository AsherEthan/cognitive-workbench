import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function prepareWorkspace(workspace, practices, sources) {
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  for (const name of ['reference', 'notes', 'SELF_AWARENESS']) mkdirSync(join(workspace, name), { recursive: true, mode: 0o700 });
  const target = join(workspace, 'reference', 'practices.json');
  const temporary = target + '.tmp';
  writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, practices, sources }, null, 2) + '\n', { mode: 0o600 });
  renameSync(temporary, target);
  const guide = join(workspace, 'WORKBENCH.md');
  if (!existsSync(guide)) writeFileSync(guide, [
    '# 認知工作台資料說明', '',
    '這個目錄由使用者的認知工作台管理。依照使用者本次任務讀取相關資料，不把空白或未知欄位補成事實。', '',
    '## 可讀取資料',
    '- SELF_AWARENESS/entries.json：使用者手動保存的主觀覺察紀錄。clarity、stability、tension 的值是 0、1、2 或 null；null 表示未知。',
    '- reference/practices.json：工作台附帶的方法、分類索引、待核查線索與經咒資料。按 kind、access、版本與來源區分，不把所有條目都視為已驗證的練習。',
    '- notes/：使用者要求保存的筆記、回顧與其他產出。', '',
    '## 寫入約定',
    '可以依照使用者的要求在 notes/ 中保存 Markdown。回覆時說明實際檔名，未完成寫入就不要聲稱已保存。',
    'SELF_AWARENESS/entries.json 由 App 的覺察表單管理。需要新增或更改主觀狀態時，請使用者在表單確認；不要自行猜測或直接改寫歷史。',
    'reference/ 是隨 App 更新的參考內容。補充研究請另存 notes/，保留來源與待確認之處。', '',
    '## 範圍',
    '工作目錄只決定預設位置，不等於作業系統隔離。工具的實際權限與審批由 Hermes 設定及使用者控制。', '',
  ].join('\n'), { mode: 0o600 });
}
