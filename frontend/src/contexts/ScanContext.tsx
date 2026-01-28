'use client';


import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { NetworkTopology, ScanRequest, ScanHistoryItem } from '@/types/network';
import { api, pollScanStatus } from '@/lib/api';

interface ScanMetadata {
    scanId: string;
    timestamp: string;
    sourceType: string;
    sourceId: string;
    totalProjects: number;
    totalVpcs: number;
    totalSubnets: number;
}

interface ScanContextType {
    topology: NetworkTopology | null;
    metadata: ScanMetadata | null;
    isScanning: boolean;
    scanStatus: string;
    error: string;
    scanHistory: ScanHistoryItem[];
    startScan: (request: ScanRequest) => Promise<void>;
    refreshData: () => Promise<void>;
    loadScanHistory: () => Promise<void>;
    loadScan: (scanId: string) => Promise<void>;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
    const [topology, setTopology] = useState<NetworkTopology | null>(null);
    const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('');

    const [error, setError] = useState('');
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

    const startScan = useCallback(async (request: ScanRequest) => {
        setIsScanning(true);
        setError('');
        setScanStatus('Initiating scan...');

        try {
            const { scan_id } = await api.startScan(request);

            // Poll for completion
            const result = await pollScanStatus(scan_id, (status) => {
                setScanStatus(
                    `Scanning... ${status.projects_scanned}/${status.total_projects} projects`
                );
            });

            setTopology(result);
            setMetadata({
                scanId: scan_id,
                timestamp: result.scan_timestamp,
                sourceType: result.source_type,
                sourceId: result.source_id,
                totalProjects: result.total_projects,
                totalVpcs: result.total_vpcs,
                totalSubnets: result.total_subnets,
            });
            setScanStatus('Scan completed!');

            // Refresh history
            loadScanHistory();

            // Save to session storage
            sessionStorage.setItem('lastScanId', scan_id);
            sessionStorage.setItem('lastTopology', JSON.stringify(result));
        } catch (err: any) {
            const errorMsg = err.message || 'Scan failed';
            setError(errorMsg);
            setScanStatus('');
        } finally {
            setIsScanning(false);
        }
    }, []);

    const refreshData = useCallback(async () => {
        // Try to load from session storage
        const cachedTopology = sessionStorage.getItem('lastTopology');
        if (cachedTopology) {
            try {
                const parsed = JSON.parse(cachedTopology);
                setTopology(parsed);
                setMetadata({
                    scanId: parsed.scan_id,
                    timestamp: parsed.scan_timestamp,
                    sourceType: parsed.source_type,
                    sourceId: parsed.source_id,
                    totalProjects: parsed.total_projects,
                    totalVpcs: parsed.total_vpcs,
                    totalSubnets: parsed.total_subnets,
                });
            } catch (e) {
                console.error('Failed to parse cached topology', e);
            }
        }
    }, []);

    const loadScanHistory = useCallback(async () => {
        try {
            const history = await api.getScans();
            setScanHistory(history);
        } catch (e) {
            console.error('Failed to load scan history', e);
        }
    }, []);

    const loadScan = useCallback(async (scanId: string) => {
        setIsScanning(true);
        setScanStatus('Loading scan...');
        try {
            const result = await api.getScanResults(scanId);
            setTopology(result);
            setMetadata({
                scanId: result.scan_id,
                timestamp: result.scan_timestamp,
                sourceType: result.source_type,
                sourceId: result.source_id,
                totalProjects: result.total_projects,
                totalVpcs: result.total_vpcs,
                totalSubnets: result.total_subnets,
            });
            setScanStatus('');

            // Save to session storage
            sessionStorage.setItem('lastScanId', scanId);
            sessionStorage.setItem('lastTopology', JSON.stringify(result));
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load scan';
            setError(msg);
            setScanStatus('');
        } finally {
            setIsScanning(false);
        }
    }, []);

    // Load history on mount
    useEffect(() => {
        loadScanHistory();
    }, [loadScanHistory]);

    return (
        <ScanContext.Provider
            value={{
                topology,
                metadata,
                isScanning,
                scanStatus,
                error,
                scanHistory,
                startScan,
                refreshData,
                loadScanHistory,
                loadScan
            }}
        >
            {children}
        </ScanContext.Provider>
    );
}

export function useScan() {
    const context = useContext(ScanContext);
    if (context === undefined) {
        throw new Error('useScan must be used within a ScanProvider');
    }
    return context;
}
