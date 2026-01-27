# GCP Network Planner (GCP 網路規劃工具)

[English](README.md) | [繁體中文](README_zh-TW.md)

這是一個內部開發者平台 (IDP) 模組，用於視覺化 Google Cloud Platform (GCP) 網路拓撲、管理 CIDR 分配以及分析網路安全性。

## 主要功能

### 🌐 網路視覺化
- **階層式檢視**：視覺化「專案 (Projects) -> VPC -> 子網路 (Subnets)」的部分樹狀結構。
- **多來源掃描**：可遞迴掃描資料夾 (Folders)、機構 (Organizations) 或特定專案。
- **共用 VPC 支援**：自動識別主專案 (Host Projects) 與服務專案 (Service Projects) 的關係。

### 🛡️ 安全與分析
- **Cloud Armor 模擬器**：在部署前模擬流量並測試您的安全策略規則，查看是否匹配及允許/拒絕。
- **防火牆規則分析**：全面檢視您網路中所有的允許/拒絕規則。
- **外部 IP 稽核**：追蹤所有外部 IP 位址及其掛載的資源。

### 🔢 網路規劃
- **CIDR 規劃工具**：計算子網路大小，並檢查整個組織中是否有 CIDR 使用衝突。
- **使用率分析**：監控每個 VPC / 子網路的 IP 限制與使用量。

### ⚙️ 企業級功能
- **多重憑證管理**：安全地儲存並在多個 GCP 服務帳戶憑證之間切換。
- **多語言支援**：完整在地化的繁體中文 (Traditional Chinese)、簡體中文及英文介面。

## 快速開始

### 前置需求
1. 已安裝 **Docker & Docker Compose**。
2. 一個擁有以下角色的 **GCP 服務帳戶金鑰 (JSON)**：
   - `roles/compute.networkViewer`
   - `roles/resourcemanager.folderViewer`
   - `roles/browser` (選填，用於瀏覽專案列表)

### 安裝步驟

1. **複製專案**：
   ```bash
   git clone <repository-url>
   cd gcp-network-tool
   ```

2. **使用 Docker Compose 啟動**：
   ```bash
   docker-compose up --build
   ```
   *注意：不需要手動設定環境變數來配置憑證，您可以稍後透過介面上傳。*

3. **存取應用程式**：
   - 前端介面：[http://localhost:3000](http://localhost:3000)
   - 後端 API 文件：[http://localhost:8000/docs](http://localhost:8000/docs)

4. **初始設定**：
   - 前往 **設定 (Settings)** 頁面。
   - 在 **憑證管理 (Credentials Management)** 區域，上傳您的 GCP 服務帳戶 JSON 金鑰。
   - 點擊您上傳憑證旁的 **設為使用中 (Set Active)**。
   - 設定您的掃描範圍（機構 ID、資料夾 ID 或專案 ID）。
   - 點擊 **開始掃描 (Start Scan)**。

## 詳細指南

### 憑證管理
本應用程式支援管理多個 GCP 服務帳戶。這對於以下情境非常有用：
- 管理位於不同隔離 GCP 機構中的環境（例如 Staging 與 Production）。
- 使用不同的服務帳戶測試權限。
- 憑證以安全方式儲存在 `backend/credentials/` 目錄中（透過 Docker Volume 對應）。

### 國際化 (i18n)
使用右上角的下拉選單即可即時切換語言。
- **支援語言**：英文、繁體中文、簡體中文。
- 偏好設定會儲存在您的瀏覽器中。

### Cloud Armor 模擬器
驗證 WAF 規則的強大工具：
1. 前往 **Cloud Armor** 頁面。
2. 選擇一個策略 (Policy)。
3. 使用右側的 **規則模擬器 (Rule Simulator)** 面板。
4. 輸入測試 IP 位址，即可查看哪些規則相符，以及流量是被允許還是拒絕。

## 架構

- **後端**：Python FastAPI
  - 使用 `google-cloud-compute` 與 `google-cloud-resource-manager` SDK。
  - 自定義 `CredentialsManager` 處理身分驗證上下文。
  - 多行程 (Multi-process) 掃描以提升效能。
- **前端**：Next.js 14 (React)
  - TypeScript 與 Tailwind CSS。
  - 使用 `React Context` 管理全域狀態（掃描資料、語言）。
- **部署**：Docker Compose
  - 支援開發模式的熱重載 (Hot-reloading)。

## 開發

### 專案結構
```
├── backend/
│   ├── credentials/    # 儲存金鑰檔案 (gitignored)
│   ├── main.py         # API 入口點
│   ├── gcp_scanner.py  # 掃描邏輯
│   └── ...
├── frontend/
│   ├── src/app/        # Next.js App Router 頁面
│   ├── src/locales/    # i18n JSON 檔案
│   └── ...
└── docker-compose.yml
```

### 新增語言
1. 在 `frontend/src/locales/` 中建立新的 JSON 檔案（例如 `ja.json`）。
2. 更新 `frontend/src/contexts/LanguageContext.tsx` 以匯入並包含新的語系。
3. 在 `frontend/src/components/LanguageSwitcher.tsx` 的下拉選單中新增該語言選項。

## 授權 (License)

本專案採用 MIT 授權條款 - 詳情請參閱 [LICENSE](LICENSE) 檔案。
