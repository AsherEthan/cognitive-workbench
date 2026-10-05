# 第三方來源與授權

## LifeOS

本專案的儀表板基礎、前端元件、狀態模組與本機整合程式碼衍生自 Daniel Miessler 與 LifeOS 社群的 [LifeOS](https://github.com/danielmiessler/LifeOS)，基礎發行版為 **v7.40.4**。

- 官方發行版：https://github.com/danielmiessler/LifeOS/releases/tag/v7.40.4
- 原始授權：https://github.com/danielmiessler/LifeOS/blob/v7.40.4/LICENSE
- 授權：MIT
- 原始著作權聲明：Copyright (c) 2025–2026 Daniel Miessler

本倉庫根目錄的 `LICENSE` 原樣保留該發行版的 MIT 授權文字。`frontend/src/lib/vendor/ascent.ts` 是 LifeOS 的純狀態模組，為使前端在本倉庫內獨立編譯而保留；原始來源為 `LifeOS/install/LIFEOS/TOOLS/ascent.ts`。

此認知工作台的調整包括繁體中文介面、手動自我覺察、3D 視覺、練習與實踐分類及獨立輸入口。本專案是本機工作台的衍生實作，未宣稱為 LifeOS 官方發行版。程式碼來源與整合檔案雜湊見 `integrations/lifeos/source-manifest.json`。

## npm／Bun 套件

前端使用 Next.js、React、Three.js、Tailwind CSS、D3、Lucide、Radix UI、TanStack Query 及其他套件。實際版本由 `frontend/bun.lock` 記錄。各套件保留其各自授權，安裝時取得的套件內授權檔案仍有效；本倉庫不包含 `node_modules/`。

## 字體與標誌

LifeOS 原始樣式曾引用 Matthew Butterick 的商業字體。本倉庫不包含這些字體檔案；保留 `frontend/public/fonts/FONTS-README.md` 的來源說明，介面使用可用的系統字體。使用者若另行取得字體，須依其授權使用。

`frontend/public/lifeos-logo.svg` 與 `lifeos-logo.png` 隨 LifeOS 發行版提供，保留於本機工作台前端。上游品牌與標誌歸其各自權利人；此處保留來源不表示官方背書。

## 練習、經咒與外部音頻

方法目錄及經咒條目保留各自的來源、原典與版本資訊。來源連結、古典文本、當代譯文、引導內容及外部媒體，可能受各自的使用條件約束；MIT 程式碼授權不替代這些來源的授權。

Moon-gazing meditation 的官方來源為 [Yunzhong Studio](https://www.yunzhongstudio.com/)。前端保留官方頁面與音頻的引用，未將其音頻下載、複製或再發布為本倉庫資產。

上傳內容不包含使用者提供的原始經咒清單照片、個人覺察紀錄、模型金鑰或私有 LifeOS 資料。
