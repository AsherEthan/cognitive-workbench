# 桌面原型與五層重構的邊界

產品的正式設計見 [五層架構](../ARCHITECTURE.md)。Agent 固定在 L3；LifeOS 只作功能與資料組織參考，新核心重新實作。這份文件記錄目前原型的實際狀態，避免將目標設計當成已完成能力。

## 已有原型

- Electron 載入現有 Next.js 靜態介面，預設進入自我覺察頁。
- 主導覽是工作台功能；資訊處理的連接與測試放在次要入口。
- `lib/hermes-manager.mjs` 與 `lib/hermes-gateway.mjs` 只適配 Hermes 的桌面服務協議。
- 覺察保存仍使用 `integrations/lifeos/modules/self-awareness.ts`，以顯式 workspace 覆蓋預設資料位置。新核心尚未替換這段歷史整合。
- `core/contracts/processing.ts` 已定義獨立於引擎的設計型別，尚未連到目前診斷程式。

## 目前沒有的能力

- 將 nanobot 或任意 Agent 填入 Hermes 執行檔欄位後運行。
- 把 Telegram 輸入自動轉成工作台正式認知資料。
- 獨立運行的工作台通用資料服務、MCP 入庫工具及來源／修訂管線。
- 已完成 LifeOS 全部模組的獨立重寫，或完整封裝 Python 與 Agent 引擎。

## 程序與協議

目前啟動的是 `hermes serve --host 127.0.0.1 --port 0 --isolated`，用於連接診斷頁的會話、串流、工具確認與中斷。此處的 WebSocket 適配器不是 Hermes Messaging Gateway，`serve` 不會自動建立 Telegram 通道。

App 退出時會停止它自己啟動的 `serve` child 和本機 HTTP 服務。若後續要求關閉 UI 後仍接收外部訊息，Gateway 與資料接口必須有獨立生命週期；僅保持 Agent 程序在線、卻關掉工作台入庫接口仍不夠。

`/api/hermes/rpc` 是現有引擎專用的診斷代理，不是新核心 L2 API 或 L4 資料工具。這個差異會在重構時保留清楚，不能透過改名宣稱已具備任意 Agent 接入。

## 下一個可驗收範圍

先依 [LifeOS 功能取捨地圖](../docs/architecture/lifeos-reference.md) 確定要做的能力。之後完成一條獨立管線：原始輸入 → Agent 處理 → 工作台驗證保存 → 介面呈現與人工修訂；再以第二個 Agent 驗證資料與介面不需更換。

目前並未因功能研究而連接 Bot、讀取憑證或安裝背景服務。
