# GCP Network Planner

[English](README.md) | [繁體中文](README_zh-TW.md)

An Internal Developer Platform (IDP) module for visualizing GCP network topology, managing CIDR allocations, and analyzing network security.

## Features

### 🌐 Network Visualization
- **Hierarchical View**: Visualize partial tree of Projects -> VPCs -> Subnets.
- **Multi-Source Scanning**: Recursively scan Folders, Organizations, or specific Projects.
- **Shared VPC Support**: Automatically identify Host Projects and Service Projects relationship.

### 🛡️ Security & Analysis
- **Cloud Armor Simulator**: Simulate traffic against your security policies to test rules before deployment.
- **Firewall Rule Analysis**: comprehensive view of all allow/deny rules across your network.
- **Public IP Auditing**: Track all external IP addresses and their attached resources.

### 🔢 Network Planning
- **CIDR Planner**: Calculate subnet sizes and check for CIDR usage conflicts across your organization.
- **Utilization Analysis**: Monitor IP limits and usage per VPC / Subnet.

### ⚙️ Enterprise Features
- **Multi-Credential Management**: storage and switch between multiple GCP Service Account credentials securely.
- **Multi-Language Support**: Fully localized interface in English, Traditional Chinese (繁體中文), and Simplified Chinese (简体中文).

## Quick Start

### Prerequisites
1. **Docker & Docker Compose** installed.
2. A **GCP Service Account Key** (JSON) with the following roles:
   - `roles/compute.networkViewer`
   - `roles/resourcemanager.folderViewer`
   - `roles/browser` (optional, for project browsing)

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
   - Configure your scan scope (Organization ID, Folder ID, or Project IDs).
   - Click **Start Scan**.

## detailed Guide

### Credential Management
The application supports managing multiple GCP service accounts. This is useful for:
- Managing different environments (Staging vs Production) in isolated GCP organizations.
- Testing permissions with different service accounts.
- Credentials are stored securely in the `backend/credentials/` directory (mapped volume).

### Internationalization (i18n)
Switch languages instantly using the dropdown menu in the top-right corner.
- **Supported Languages**: English, Traditional Chinese (繁體中文), Simplified Chinese (简体中文).
- Preferences are saved locally in your browser.

### Cloud Armor Simulator
A powerful tool to validte your WAF rules:
1. Navigate to **Cloud Armor** page.
2. Select a policy.
3. Use the **Rule Simulator** panel on the right.
4. Enter test IP addresses or request headers (coming soon) to see which rules match and whether traffic would be allowed or denied.

## Architecture

- **Backend**: Python FastAPI
  - `google-cloud-compute` & `google-cloud-resource-manager` for API interaction.
  - Custom `CredentialsManager` for handling auth contexts.
  - Multi-process scanning for performance.
- **Frontend**: Next.js 14 (React)
  - TypeScript & Tailwind CSS.
  - `React Context` for global state (Scan Data, Language).
  - D3.js / Recharts for visualizations (planned).
- **Deployment**: Docker Compose
  - Hot-reloading enabled for development.

## Development

### Project Structure
```
├── backend/
│   ├── credentials/    # Stored key files (gitignored)
│   ├── main.py         # API Entry point
│   ├── gcp_scanner.py  # Scanning logic
│   └── ...
├── frontend/
│   ├── src/app/        # Next.js App Router pages
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
