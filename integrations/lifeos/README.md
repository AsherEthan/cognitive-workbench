# LifeOS 本機整合

這個目錄保留認知工作台的 LifeOS 整合程式碼，基礎版本是 [LifeOS v7.40.4](https://github.com/danielmiessler/LifeOS/releases/tag/v7.40.4)。它不會建立新的獨立後端，也不包含使用者資料、模型金鑰、服務設定或背景任務。

## 檔案與用途

| 檔案 | 放入既有 LifeOS 的位置 | 用途 |
| --- | --- | --- |
| `Observability/observability.ts` | `LIFEOS/PULSE/Observability/observability.ts` | 現有工作台使用的儀表板 API 與靜態頁面服務，包含本機 Codex 路徑適配 |
| `modules/self-awareness.ts` | `LIFEOS/PULSE/modules/self-awareness.ts` | 手動自我覺察紀錄的讀取、建立、修改與刪除 |
| `modules/self-awareness.test.ts` | 同一個 modules 目錄 | 使用暫存目錄驗證紀錄 API |
| `modules/web-chat.ts` | `LIFEOS/PULSE/modules/web-chat.ts` | 模型設定及使用者主動送出的對話請求 |
| `modules/web-chat.test.ts` | 同一個 modules 目錄 | 使用暫存設定與本機模擬服務驗證對話 API |
| `lib/atomic-write.ts` | `LIFEOS/PULSE/lib/atomic-write.ts` | 以暫存檔案及重新命名方式保存資料 |
| `pulse.patch` | 在既有 `LIFEOS/` 目錄套用 | 僅註冊上述兩組 handler 的 imports 與 HTTP 路由 |
| `source-manifest.json` | 留在本倉庫 | 版本、來源與匯出程式碼的雜湊記錄 |

`pulse.patch` 是對官方 v7.40.4 發行版的 `PULSE/pulse.ts` 產生的差異，只有 10 行新增，不含本機其他 Codex 適配。`Observability/observability.ts` 是目前工作台使用的整合版本，應與此 patch 分開評估；它依賴 LifeOS 原有的 `TOOLS/ascent.ts`、`TOOLS/LifeosConfig.ts`、Pulse endpoint、YAML 套件及個人資料目錄，不能單独執行。

## 套用到既有安裝

先確認既有安裝版本並備份要替換的程式碼。這些步驟適用於已完成 LifeOS 安裝的本機 Codex 工作台；若使用其他宿主，需先調整 Observability 中的宿主路徑。

1. 在本倉庫的 `frontend/` 安裝套件並編譯，將產生的 `out/` 靜態輸出提供給 LifeOS Pulse。預設位置為既有安裝的 `LIFEOS/PULSE/Observability/out/`；也可由 Pulse 的 `observability.dashboard_dir` 指定。請勿將 `frontend/src/` 直接當作可服務的頁面。
2. 依上表複製 integration 程式碼。保留既有安裝中的個人資料、設定及其餘 LifeOS 模組。
3. 在既有安裝的 `LIFEOS/` 目錄先檢查 patch，再套用：

   ```sh
   git apply --check /path/to/cognitive-workbench/integrations/lifeos/pulse.patch
   git apply /path/to/cognitive-workbench/integrations/lifeos/pulse.patch
   ```

   已註冊 handler 的安裝不需再次套用。若檢查失敗，先比較版本與既有修改，再手動合併 imports 和兩組路由，避免重複註冊。
4. 以既有 LifeOS 的服務管理方式重新啟動 Pulse，確認靜態頁面、`/api/self-awareness` 與 `/api/web-chat/config` 能在同一個本機來源存取。

此整合不會啟用排程、感測、通知或代理。LifeOS 原有服務仍依該安裝的設定運行；請維持本機存取，不將這組個人資料 API 直接公開到網路。

## 執行時資料與限制

自我覺察 handler 可透過 `SELF_AWARENESS_USER_DIR` 指定使用者目錄；網頁對話可透過 `WEB_CHAT_USER_DIR` 指定。未設定時，它們會採用 LifeOS 的使用者目錄設定或本機預設目錄。這些目錄不屬於倉庫內容。對話金鑰只在執行時於該使用者目錄保存，不會由此整合帶入。

單獨預覽前端時，3D 場景、方法目錄與靜態閱讀內容可顯示；自我覺察保存、AI 回覆，以及 TELOS、記憶、工作紀錄等個人資料功能，需要既有 Pulse API。前端開發伺服器和 Pulse 若不在同一來源，需自行建立同來源代理或使用 Pulse 服務編譯後的頁面。GitHub Pages 等純靜態服務不會提供這些本機 API。

完整 LifeOS 能力不在這個 integration 目錄中。請從官方來源安裝相容版本，而不是將這些檔案當作完整 LifeOS 安裝工具。

## 測試

這兩組測試使用暫存目錄及本機模擬服務，無需真正模型金鑰。可在本倉庫根目錄執行：

```sh
bun test integrations/lifeos/modules/self-awareness.test.ts integrations/lifeos/modules/web-chat.test.ts
```

前端編譯的型別檢查不包含此 integration 目錄；它們使用 Bun 執行環境，需依上述方式分開驗證。
