# GCP Network Planner

An Internal Developer Platform (IDP) module for visualizing GCP network topology and managing CIDR allocations.

## Features

- **Hierarchical Visualization**: View partial tree of Projects -> VPCs -> Subnets
- **Multi-Project Scanning**: Recursively scan Folders or Organizations
- **Shared VPC Support**: Identify Host Projects and Service Projects
- **CIDR Planning**: Input a CIDR to check for usage conflicts
- **Utilization Analysis**: See IP limits and usage per VPC

## Architecture

- **Backend**: Python FastAPI with `google-cloud-compute` and `google-cloud-resource-manager`
- **Frontend**: Next.js (React) with Tailwind CSS and TanStack Query (optional, but implemented with fetch)
- **Infrastructure**: Docker Compose for local development

## Prerequisites

1. **GCP Service Account** with the following roles:
   - `roles/compute.networkViewer`
   - `roles/resourcemanager.folderViewer`
   - `roles/browser` (optional, for project browsing)
2. **Service Account Key** (JSON file)
3. **Docker & Docker Compose**

## Quick Start

1. **Configure Backend**:
   Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your JSON key.

2. **Run with Docker Compose**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json
   docker-compose up --build
   ```

3. **Access the Application**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Key Components

- `backend/gcp_scanner.py`: Recursive crawler for GCP resources
- `backend/cidr_analyzer.py`: CIDR overlap logic using Python's `ipaddress` library
- `frontend/src/components/NetworkTree.tsx`: Recursive UI component for topology
- `frontend/src/components/CIDRVisualizer.tsx`: Conflict detection UI
