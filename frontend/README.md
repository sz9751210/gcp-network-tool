# GCP Network Planner - Frontend

[English](README.md) | [繁體中文](README_zh-TW.md)

The frontend interface for GCP Network Planner, built with **Next.js 14**, **React**, and **Tailwind CSS**. It provides a responsive, modern UI for managing scans and visualizing network topology.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Visualization**: React Flow (Interactive Node Graph)
- **Language**: TypeScript
- **State Management**: React Context (`ScanContext`, `LanguageContext`)
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── dashboard/        # Main overview
│   ├── domain-search/    # Topology visualization
│   ├── gke/              # GKE deep dive views
│   ├── settings/         # Configuration & Credentials
│   └── ...
├── components/           # Reusable UI components
│   ├── DomainTopology.tsx # The interactive graph component
│   ├── ui/               # Base UI elements (Buttons, Cards, etc.)
│   └── ...
├── contexts/             # Global state
│   ├── ScanContext.tsx   # Manages scan data & history
│   └── LanguageContext.tsx # Handles i18n
├── lib/                  # Utilities
│   ├── api.ts            # Type-safe API client
│   └── utils.ts          # Helper functions
└── types/                # TypeScript definitions (mirrors backend models)
```

## Key Features

### Interactive Topology (`src/components/DomainTopology.tsx`)
A custom implementation using **React Flow**. It visualizes the relationship between:
- Domain Names
- Load Balancers (Forwarding Rules)
- Backend Services
- Instance Groups / NEGs
- Individual Instances / Pods

### GKE Resource Views
Specialized pages under `src/app/gke/` to inspect Kubernetes resources.
- **YAML Viewer**: Fetches raw YAML manifests from the backend for audit/debugging.
- **SlideOver Details**: Detailed side panels for deep inspection without losing context.

### Settings & Configuration
- **Granular Scanning**: Users can toggle specific scan scopes (GKE, Storage, etc.) in `SettingsPage`.
- **Credential Management**: Upload and switch Service Account keys via the UI.

## Development

### Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Access at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

### Adding a New Page

1. Create a new folder in `src/app/` (e.g., `src/app/my-feature/`).
2. Add a `page.tsx`.
3. Use the `useScan` hook to access global topology data:
   ```tsx
   import { useScan } from '@/contexts/ScanContext';

   export default function MyFeature() {
     const { topology } = useScan();
     // ...
   }
   ```
