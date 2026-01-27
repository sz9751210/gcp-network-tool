'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NetworkTopology, ScanRequest } from '@/types/network';
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
    startScan: (request: ScanRequest) => Promise<void>;
    refreshData: () => Promise<void>;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
    const [topology, setTopology] = useState<NetworkTopology | null>(null);
    const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('');
    const [error, setError] = useState('');

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

    return (
        <ScanContext.Provider
            value={{
                topology,
                metadata,
                isScanning,
                scanStatus,
                error,
                startScan,
                refreshData,
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
