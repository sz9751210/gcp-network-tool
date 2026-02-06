# GCP Network Planner - 後端 (Backend)

[English](README.md) | [繁體中文](README_zh-TW.md)

GCP Network Planner 的後端服務，使用 **FastAPI** 和 **Python 3.11** 構建。它負責處理 GCP API 互動、網路掃描、資料持久化和分析任務。

## 架構

### 核心元件

- **`main.py`**: FastAPI 應用程式入口點。定義所有 HTTP 端點。
- **`gcp_scanner.py`**: 網路掃描的主要協調器。它使用 `ThreadPoolExecutor` 來並行掃描各個專案。
- **`scan_manager.py`**: 管理掃描狀態 (執行中、已完成、失敗) 和持久化 (將結果儲存到 `data/` 目錄)。
- **`credentials_manager.py`**: 處理 GCP 服務帳戶金鑰的儲存和啟用。
- **`scanners/`**: 模組化掃描器實作：
  - `network_scanner.py`: VPC、子網域、路由。
  - `gke_scanner.py`: 叢集、節點池、Workloads。
  - `instance_scanner.py`: GCE 實例。
  - `firewall_scanner.py`: 防火牆規則和 Cloud Armor 政策。
  - `storage_scanner.py`: Cloud Storage 儲存桶。

### 資料儲存

- **掃描結果**: 以 JSON 檔案儲存在本地 `data/` 目錄中。
- **憑證**: 安全地儲存在 `credentials/` 中 (已從 git 排除)。
- **持久化**: 預設不需要外部資料庫；為了簡單和可攜性，使用基於檔案的系統。

## API 端點

文件由 FastAPI 自動產生。啟動後，請訪問：
**[http://localhost:8000/docs](http://localhost:8000/docs)**

### 關鍵端點

- **掃描操作**:
  - `POST /api/scan`: 開始新的掃描 (接受細緻化的 `scan_options`)。
  - `GET /api/scan/{id}/status`: 輪詢掃描進度。
  - `GET /api/scan/{id}/results`: 檢索完整的拓撲。

- **資源**:
  - `GET /api/resources/gke-clusters`: 列出所有發現的 GKE 叢集。
  - `GET /api/resources/public-ips`: 列出所有外部 IP。
  - `GET /api/networks`: 獲取最新的完整網路拓撲。

- **分析工具**:
  - `POST /api/check-cidr`: 檢查 CIDR 衝突。
  - `POST /api/plan-ip`: 建議可用的 CIDR。

## 開發

### 本地執行

1. **安裝依賴**:
   ```bash
   pip install -r requirements.txt
   ```

2. **執行伺服器**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### 新增掃描器

1. 在 `scanners/` 中建立一個新的掃描器類別 (例如 `redis_scanner.py`)。
2. 在 `GCPScanner.__init__` 中將其實例化。
3. 在 `GCPScanner._scan_single_project` 的線程池中新增提交任務。
4. 收集結果並將其新增至 `models.py` 中的 `Project` 模型。
