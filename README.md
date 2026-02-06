# GCP Network Planner

[English](README.md) | [繁體中文](README_zh-TW.md)

An Internal Developer Platform (IDP) module for visualizing GCP network topology, managing CIDR allocations, and analyzing network security.

## Features

### 🌐 Network Visualization
- **Interactive Topology**: Visualize specific domains and their downstream dependencies (IPs, Load Balancers, Backend Services, Instances/Pods) using an interactive graph.
- **Hierarchical View**: Navigate through the structure of Projects -> VPCs -> Subnets.
- **Multi-Source Scanning**: Recursively scan Folders, Organizations, or specific Projects.
- **Granular Scan Scope**: Configure scans to selectively include/exclude GKE Clusters, GCE Instances, Cloud Storage, or Firewalls for optimized performance.
- **Shared VPC Support**: Automatically identify Host Projects and Service Projects relationship.

### ☸️ GKE Deep Dive
- **Comprehensive Resource Views**: specialized views for Workloads, Services, Ingress, HPA, PVCs, ConfigMaps, and Secrets.
- **YAML Manifest Viewer**: Inspect raw YAML configurations for GKE resources directly within the UI.
- **Topology Integration**: See how GKE pods and services connect to the broader network.

### 🛡️ Security & Analysis
- **Cloud Armor Simulator**: Simulate traffic against your security policies to test rules before deployment.
- **Firewall Rule Analysis**: Comprehensive view of all allow/deny rules across your network.
- **Public IP Auditing**: Track all external IP addresses and their attached resources.

### 🔢 Network Planning
- **CIDR Planner**: Calculate subnet sizes and check for CIDR usage conflicts across your organization.
- **Utilization Analysis**: Monitor IP limits and usage per VPC / Subnet.

### ⚙️ Enterprise Features
- **Multi-Credential Management**: Store and switch between multiple GCP Service Account credentials securely.
- **Multi-Language Support**: Fully localized interface in English, Traditional Chinese (繁體中文), and Simplified Chinese (简体中文).

## Quick Start

### Prerequisites
1. **Docker & Docker Compose** installed.
2. A **GCP Service Account Key** (JSON) with the following roles:
   - `roles/compute.networkViewer`
   - `roles/container.clusterViewer` (for GKE features)
   - `roles/container.developer` (optional, for reading GKE resource details)
   - `roles/resourcemanager.folderViewer`
   - `roles/storage.objectViewer` (optional, for bucket details)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd gcp-network-tool
   ```

2. **Start with Docker Compose**:
   ```bash
   docker-compose up --build
   ```
   *Note: No manual environment configuration is needed for credentials. You can upload them via the UI.*

3. **Access the Application**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Initial Setup**:
   - Go to **Settings** page.
   - Under **Credentials Management**, upload your GCP Service Account JSON key.
   - Click **Set Active** on your uploaded credential.
   - Configure your scan scope (Source ID) and **Scan Options** (toggle GKE, Instances, etc.).
   - Click **Start Scan**.

## Detailed Guide

### Scan Settings
The application now supports **Granular Scanning** to improve performance:
- **Scan Scope**: Select specific resource types to include (GKE, Instances, Storage, Firewalls).
- Uncheck unused resources to significantly reduce scan time for large organizations.

### Cloud Armor Simulator
A powerful tool to validate your WAF rules:
1. Navigate to **Cloud Armor** page.
2. Select a policy.
3. Use the **Rule Simulator** panel on the right.
4. Enter test IP addresses or request headers to see which rules match and whether traffic would be allowed or denied.

## Architecture

- **Backend**: Python FastAPI
  - **Modular Scanners**: `backend/scanners/` for distinct resource types (GKE, Network, Compute, etc.).
  - `ThreadPoolExecutor` for parallelized scanning of project resources.
  - Custom `CredentialsManager` for handling auth contexts.
- **Frontend**: Next.js 14 (React)
  - **Visualization**: `React Flow` for interactive topology graphs.
  - **UI Components**: Shadcn UI + Tailwind CSS.
  - **State Management**: React Context for global state (Scan Data, Language).
- **Deployment**: Docker Compose
  - Hot-reloading enabled for development.

## Development

### Project Structure
```
├── backend/
│   ├── scanners/       # Modular scanner implementations
│   ├── credentials/    # Stored key files (gitignored)
│   ├── main.py         # API Entry point
│   ├── gcp_scanner.py  # Orchestrator
│   └── ...
├── frontend/
│   ├── src/app/        # Next.js App Router pages
│   ├── src/components/ # Reusable UI components
│   ├── src/locales/    # i18n JSON files
│   └── ...
└── docker-compose.yml
```

### Adding a New Language
1. Create a new JSON file in `frontend/src/locales/` (e.g., `es.json`).
2. Update `frontend/src/contexts/LanguageContext.tsx` to import and include the new locale.
3. Add the language to the dropdown options in `frontend/src/components/LanguageSwitcher.tsx`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
