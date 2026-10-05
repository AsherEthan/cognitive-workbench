# 認知工作台

以「擴展人的可能性」為出發點，將意圖、自我覺察、注意力與練習放在同一個工作台。介面以繁體中文呈現，結合 Three.js 互動場景。工作台提供整理與建議，使用者決定與執行。

## 產品定位

**本專案的主體是獨立的認知工作台。LifeOS 只作功能結構與資料組織參考，新核心按需要重新實作，不完整吸收原框架。** 系統採五層設計，Agent 固定在第三層；Hermes、nanobot 或其他引擎透過各自適配器接入。Telegram Bot 等輸入端由 Agent 系統的 Gateway／路由管理。

工作台負責認知資料的保存、組織、呈現及修訂。Agent 依任務讀取、整理、關聯和提出候選；它的會話記憶不取代工作台正式資料。五層責任、接入契約及目前缺口見 [架構說明](ARCHITECTURE.md)；吸收範圍先依 [LifeOS 功能樹與超圖](docs/architecture/lifeos-reference.md) 決定。

目前倉庫包含既有 LifeOS 前端／整合程式與桌面原型。**自有核心尚在設計與拆分階段，不能把目前程式稱為已完成的獨立重寫。**

## 已有功能

- **自我覺察**：以清楚度、安住度與鬆緊度記錄當下主觀狀態，搭配 3D 互動場景、筆記與歷史紀錄。未填寫的維度保持未知。
- **練習與實踐**：收錄 253 筆方法與閱讀條目，依止觀禪修、參究、念佛、持戒、慧解脫、念處觀修、特殊方便、密宗及其他身心方法組織；同一方法可屬於多條路徑。
- **經咒閱讀**：54 筆條目提供版本可確認範圍內的原文、梵文或轉寫、讀音、中文注釋、傳統作用與來源，保留版本差異及待確認項目。
- **Moon-gazing meditation**：保留雲中工作室的官方引導與外部音頻入口。
- **獨立輸入口**：統一入口及獨立對話頁面，模型設定完成後可主動發起 AI 對話。
- **LifeOS 模組**：保留 TELOS、意圖、工作、記憶與其他儀表板頁面，完整個人資料功能由既有 LifeOS Pulse 提供。

## 啟動前端

### 桌面 App 原型

此分支新增 **Electron + Hermes** 桌面模式，以既有自我覺察頁作為目前的開啟入口，保留練習與實踐。Hermes 的連接與測試放在次要的「資訊處理」入口。處理層支援會話、串流工具進度、操作確認、補充提問與中斷；覺察紀錄可直接保存在 App 的工作目錄，不需要完整 LifeOS。

測試 Hermes 連接需要本機已有 Hermes 與模型設定；覺察和練習可獨立使用。Python／Agent 隨包分發、nanobot 適配，以及外部輸入到工作台結果的通用接口尚未完成。啟動、封裝、資料位置與驗證範圍見 [桌面原型說明](desktop/README.md)。

### 既有 Web 模式（歷史 LifeOS 整合）

需要安裝 [Bun](https://bun.sh)。在本倉庫執行：

```sh
cd frontend
bun install --frozen-lockfile
bun run dev
```

開啟 `http://localhost:3333`。也可在根目錄使用 `bun run dev`。

前端可獨立展示 3D 場景、練習目錄及靜態閱讀內容。保存自我覺察紀錄、取得 AI 回覆及讀取個人資料，需要同來源的 LifeOS Pulse API；單獨前端預覽不提供這些 API，也不會生成個人的狀態或完成百分比。

## 編譯與測試

完成前端套件安裝後，在根目錄執行：

```sh
bun run build
bun test tests/practices integrations/lifeos/modules/self-awareness.test.ts integrations/lifeos/modules/web-chat.test.ts
```

編譯輸出在 `frontend/out/`。測試涵蓋練習分類、經咒內容、自我覺察保存及對話 API；後端測試使用暫存資料和本機模擬服務，無需模型金鑰。

## 歷史 LifeOS 整合

既有整合以 **LifeOS 7.40.4** 為基線，宿主為 Codex。相關程式保留供比較和遷移參考；這不是新核心的必要依賴。需要運行原有整合的安裝，仍可對照[官方發行版](https://github.com/danielmiessler/LifeOS/releases/tag/v7.40.4)。

依照 [本機整合說明](integrations/lifeos/README.md) 將前端靜態輸出與 API 模組接入既有安裝。其他宿主須調整整合中的路徑解析。此套件不會自行安裝 LifeOS、啟用代理心跳、感知捕捉、外部通知或自動任務。

模型連線須由使用者另外配置。模型金鑰、自我覺察紀錄、個人檔案、記憶及工作資料均保存在執行時的本機使用者目錄，不包含在本倉庫。

## 目錄

```text
frontend/                Next.js、React 與 Three.js 前端
desktop/                 Electron 容器、本機服務與 Hermes 適配器
core/contracts/          自有處理任務與資料接口的設計型別
docs/architecture/       LifeOS 功能盤點、來源與取捨依據
integrations/lifeos/      既有 LifeOS 的 API 模組、測試及註冊差異
tests/practices/          練習分類與經咒內容完整性檢查
LICENSE                  MIT 授權
THIRD_PARTY_NOTICES.md    上游、字體與外部內容說明
```

## 來源與授權

本倉庫現有前端包含源自 [Daniel Miessler 的 LifeOS](https://github.com/danielmiessler/LifeOS) 的程式及後續擴充，程式碼採用 [MIT 授權](LICENSE)。新核心的獨立重構不改變既有程式的來源記錄；上游與第三方內容詳見 [來源說明](THIRD_PARTY_NOTICES.md)。

練習與經咒條目內保留各自的內容來源、傳統語境及傳承要求。「作用」描述表達其傳統用途；它們不等同於已驗證的醫療效果。外部音頻以來源入口提供，未收錄下載的音頻或使用者照片。
