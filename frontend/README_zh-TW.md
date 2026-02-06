# GCP Network Planner - 前端 (Frontend)

[English](README.md) | [繁體中文](README_zh-TW.md)

GCP Network Planner 的前端介面，使用 **Next.js 14**、**React** 和 **Tailwind CSS** 構建。它提供了響應式、現代化的 UI，用於管理掃描和視覺化網路拓撲。

## 技術堆疊

- **框架**: Next.js 14 (App Router)
- **樣式**: Tailwind CSS
- **視覺化**: React Flow (互動式節點圖)
- **語言**: TypeScript
- **狀態管理**: React Context (`ScanContext`, `LanguageContext`)
- **圖示**: Lucide React

## 專案結構

```
src/
├── app/                  # Next.js App Router 頁面
│   ├── dashboard/        # 主要概覽
│   ├── domain-search/    # 拓撲視覺化
│   ├── gke/              # GKE 深度剖析檢視
│   ├── settings/         # 配置與憑證
│   └── ...
├── components/           # 可重複使用的 UI 元件
│   ├── DomainTopology.tsx # 互動式圖表元件
│   ├── ui/               # 基礎 UI 元素 (按鈕、卡片等)
│   └── ...
├── contexts/             # 全域狀態
│   ├── ScanContext.tsx   # 管理掃描資料與歷史記錄
│   └── LanguageContext.tsx # 處理 i18n
├── lib/                  # 工具函式
│   ├── api.ts            # 型別安全的 API 客戶端
│   └── utils.ts          # 輔助函式
└── types/                # TypeScript 定義 (對應後端模型)
```

## 關鍵功能

### 互動式拓撲 (`src/components/DomainTopology.tsx`)
使用 **React Flow** 的自定義實作。它視覺化了以下之間的關係：
- 域名 (Domain Names)
- 負載平衡器 (Forwarding Rules)
- 後端服務 (Backend Services)
- 實例群組 (Instance Groups) / NEGs
- 個別實例 (Instances) / Pods

### GKE 資源檢視
位於 `src/app/gke/` 下的專屬頁面，用於檢查 Kubernetes 資源。
- **YAML 檢視器**: 從後端獲取原始 YAML manifests 以進行稽核/除錯。
- **側邊欄詳細資訊 (SlideOver Details)**: 詳細的側邊面板，可在不丟失上下文的情況下進行深度檢查。

### 設定與配置
- **細緻化掃描**: 使用者可以在 `SettingsPage` 中切換特定的掃描範圍 (GKE, Storage 等)。
- **憑證管理**: 透過 UI 上傳和切換服務帳戶金鑰。

## 開發

### 本地執行

1. **安裝依賴**:
   ```bash
   npm install
   ```

2. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```
   訪問 [http://localhost:3000](http://localhost:3000)。

### 建置

```bash
npm run build
```

### 新增頁面

1. 在 `src/app/` 中建立一個新資料夾 (例如 `src/app/my-feature/`)。
2. 新增 `page.tsx`。
3. 使用 `useScan` hook 存取全域拓撲資料：
   ```tsx
   import { useScan } from '@/contexts/ScanContext';

   export default function MyFeature() {
     const { topology } = useScan();
     // ...
   }
   ```
