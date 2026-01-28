/**
 * API client for GCP Network Planner backend.
 */
import type {
    ScanRequest,
    ScanStatusResponse,
    NetworkTopology,
    CIDRCheckRequest,
    CIDRCheckResponse,
    CIDRInfo,
    VPCUtilization,
    ScanHistoryItem,
} from '@/types/network';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIError extends Error {
    constructor(
        message: string,
        public status: number,
        public details?: unknown
    ) {
        super(message);
        this.name = 'APIError';
    }
}

async function fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
            errorData.detail || `API error: ${response.statusText}`,
            response.status,
            errorData
        );
    }

    return response.json();
}

export const api = {
    /**
     * Start a network topology scan.
     */
    startScan: async (request: ScanRequest): Promise<ScanStatusResponse> => {
        return fetchAPI<ScanStatusResponse>('/api/scan', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    },

    /**
     * Get scan status by ID.
     */
    getScanStatus: async (scanId: string): Promise<ScanStatusResponse> => {
        return fetchAPI<ScanStatusResponse>(`/api/scan/${scanId}/status`);
    },

    /**
     * Get scan results by ID.
     */
    getScanResults: async (scanId: string): Promise<NetworkTopology> => {
        return fetchAPI<NetworkTopology>(`/api/scan/${scanId}/results`);
    },

    getLatestTopology: async (): Promise<NetworkTopology | null> => {
        return fetchAPI<NetworkTopology | null>('/api/networks');
    },

    /**
     * Get scan history.
     */
    getScans: async (): Promise<ScanHistoryItem[]> => {
        return fetchAPI<ScanHistoryItem[]>('/api/scans');
    },

    /**
     * Check CIDR for conflicts.
     */
    checkCIDR: async (request: CIDRCheckRequest): Promise<CIDRCheckResponse> => {
        return fetchAPI<CIDRCheckResponse>('/api/check-cidr', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    },

    /**
     * Get detailed CIDR information.
     */
    getCIDRInfo: async (cidr: string): Promise<CIDRInfo> => {
        return fetchAPI<CIDRInfo>('/api/cidr-info', {
            method: 'POST',
            body: JSON.stringify({ cidr }),
        });
    },

    /**
     * Get VPC IP utilization.
     */
    getVPCUtilization: async (
        vpcCidr: string,
        projectId: string,
        vpcName: string
    ): Promise<VPCUtilization> => {
        return fetchAPI<VPCUtilization>('/api/utilization', {
            method: 'POST',
            body: JSON.stringify({
                vpc_cidr: vpcCidr,
                project_id: projectId,
                vpc_name: vpcName,
            }),
        });
    },

    /**
     * Health check.
     */
    healthCheck: async (): Promise<{ status: string }> => {
        return fetchAPI<{ status: string }>('/health');
    },

    // Get latest scan from session storage or return null
    getLatestScan: async (): Promise<NetworkTopology | null> => {
        const scanId = sessionStorage.getItem('lastScanId');
        if (!scanId) return null;

        try {
            const response = await fetch(`${API_BASE_URL}/api/scan/${scanId}/result`);
            if (!response.ok) return null;
            return response.json();
        } catch {
            return null;
        }
    },
};

/**
 * Poll scan status until completed or failed.
 */
export async function pollScanStatus(
    scanId: string,
    onProgress?: (status: ScanStatusResponse) => void,
    intervalMs: number = 2000
): Promise<NetworkTopology> {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                const status = await api.getScanStatus(scanId);
                onProgress?.(status);

                if (status.status === 'completed') {
                    const results = await api.getScanResults(scanId);
                    resolve(results);
                } else if (status.status === 'failed') {
                    reject(new Error(status.message || 'Scan failed'));
                } else {
                    setTimeout(poll, intervalMs);
                }
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}

export { APIError };
