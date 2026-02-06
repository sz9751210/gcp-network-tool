# GCP Network Planner

[English](README.md) | [繁體中文](README_zh-TW.md)

一個內部開發者平台 (IDP) 模組，用於視覺化 GCP 網路拓撲、管理 CIDR 分配以及分析網路安全性。

## 功能特性

### 🌐 網路視覺化 (Network Visualization)
- **互動式拓撲圖**: 使用互動式圖表視覺化特定域名及其下游依賴關係 (IP、負載平衡器、後端服務、實例/Pod)。
- **層級視圖**: 瀏覽 專案 (Project) -> VPC -> 子網域 (Subnet) 的結構。
- **多來源掃描**: 遞迴掃描 資料夾 (Folder)、組織 (Organization) 或特定專案。
- **細緻化掃描範圍**: 可配置掃描以選擇性地包含/排除 GKE 叢集、GCE 實例、雲端儲存 (Cloud Storage) 或防火牆，以優化效能。
- **共用 VPC 支援**: 自動識別宿主專案 (Host Projects) 和服務專案 (Service Projects) 的關係。

### ☸️ GKE 深度剖析 (GKE Deep Dive)
- **全面的資源檢視**: 針對 Workloads、Services、Ingress、HPA、PVCs、ConfigMaps 和 Secrets 提供專屬檢視。
- **YAML Manifest 檢視器**: 直接在 UI 中檢查 GKE 資源的原始 YAML 配置。
- **拓撲整合**: 查看 GKE Pod 和 Service 如何連接到更廣泛的網路中。

### 🛡️ 安全性與分析 (Security & Analysis)
- **Cloud Armor 模擬器**: 在部署前針對您的安全政策模擬流量以測試規則。
- **防火牆規則分析**: 全面檢視整個網路中的所有允許/拒絕規則。
- **公有 IP 稽核**: 追蹤所有外部 IP 位址及其附加的資源。

### 🔢 網路規劃 (Network Planning)
- **CIDR 規劃器**: 計算子網域大小並檢查整個組織中的 CIDR 使用衝突。
- **使用率分析**: 監控每個 VPC / 子網域的 IP 限制和使用情況。

### ⚙️ 企業級功能 (Enterprise Features)
- **多憑證管理**: 安全地儲存並切換多個 GCP 服務帳戶憑證。
- **多語言支援**: 完全在地化的介面，支援英文、繁體中文和簡體中文。

## 快速開始

### 前置需求
1. 安裝 **Docker & Docker Compose**。
2. 一個 **GCP 服務帳戶金鑰** (JSON)，需具備以下角色：
   - `roles/compute.networkViewer`
   - `roles/container.clusterViewer` (用於 GKE 功能)
   - `roles/container.developer` (選用，用於讀取 GKE 資源詳細資訊)
   - `roles/resourcemanager.folderViewer`
   - `roles/storage.objectViewer` (選用，用於讀取儲存桶詳細資訊)

### 安裝步驟

1. **複製存儲庫**:
   ```bash
   git clone <repository-url>
   cd gcp-network-tool
   ```

2. **使用 Docker Compose 啟動**:
   ```bash
   docker-compose up --build
   ```
   *注意: 不需要手動配置憑證的環境變數。您可以透過 UI 上傳它們。*

3. **存取應用程式**:
   - 前端: [http://localhost:3000](http://localhost:3000)
   - 後端 API 文件: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **初始設定**:
   - 前往 **Settings (設定)** 頁面。
   - 在 **Credentials Management (憑證管理)** 下，上傳您的 GCP 服務帳戶 JSON 金鑰。
   - 點擊上傳憑證上的 **Set Active (設為使用中)**。
   - 配置您的掃描範圍 (來源 ID) 和 **Scan Options (掃描選項)** (切換 GKE, Instances 等)。
   - 點擊 **Start Scan (開始掃描)**。

## 詳細指南

### 掃描設定
應用程式現在支援 **細緻化掃描 (Granular Scanning)** 以提升效能：
- **掃描範圍**: 選擇要包含的特定資源類型 (GKE, Instances, Storage, Firewalls)。
- 取消勾選未使用的資源可顯著減少大型組織的掃描時間。

### Cloud Armor 模擬器
一個驗證 WAF 規則的強大工具：
1. 前往 **Cloud Armor** 頁面。
2. 選擇一個政策。
3. 使用右側的 **Rule Simulator (規則模擬器)** 面板。
4. 輸入測試 IP 位址或請求標頭，查看符合哪些規則以及流量是被允許還是拒絕。

## 架構

- **後端**: Python FastAPI
  - **模組化掃描器**: `backend/scanners/` 用於不同的資源類型 (GKE, Network, Compute 等)。
  - `ThreadPoolExecutor` 用於並行掃描專案資源。
  - 自定義 `CredentialsManager` 用於處理驗證上下文。
- **前端**: Next.js 14 (React)
  - **視覺化**: `React Flow` 用於互動式拓撲圖。
  - **UI 元件**: Shadcn UI + Tailwind CSS。
  - **狀態管理**: React Context 用於全域狀態 (掃描資料, 語言)。
- **部署**: Docker Compose
  - 開發環境支援熱重載 (Hot-reloading)。

## 開發

### 專案結構
```
├── backend/
│   ├── scanners/       # 模組化掃描器實作
│   ├── credentials/    # 儲存的金鑰檔案 (gitignored)
│   ├── main.py         # API 入口點
│   ├── gcp_scanner.py  # 協調器 (Orchestrator)
│   └── ...
├── frontend/
│   ├── src/app/        # Next.js App Router 頁面
│   ├── src/components/ # 可重複使用的 UI 元件
│   ├── src/locales/    # i18n JSON 檔案
│   └── ...
└── docker-compose.yml
```

### 新增語言
1. 在 `frontend/src/locales/` 中建立一個新的 JSON 檔案 (例如 `es.json`)。
2. 更新 `frontend/src/contexts/LanguageContext.tsx` 以匯入並包含新的語系。
3. 在 `frontend/src/components/LanguageSwitcher.tsx` 的下拉選單選項中新增該語言。

## 授權

本專案採用 MIT 授權條款 - 詳情請參閱 [LICENSE](LICENSE) 檔案。
