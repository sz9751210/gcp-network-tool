import { useState, useCallback, useEffect } from 'react';
import { api } from './api';

const CACHE_TTL = 30000; // 30 seconds

interface CacheEntry<T> {
    data: T[];
    timestamp: number;
}

const resourceCache: Record<string, CacheEntry<any>> = {};

export function useResources<T>(type: 'instances' | 'gke-clusters' | 'storage-buckets' | 'vpcs' | 'public-ips' | 'gke-pods' | 'gke-deployments' | 'gke-services' | 'gke-ingress' | 'gke-configmaps' | 'gke-secrets' | 'gke-pvcs' | 'gke-hpa') {
    // Initialize with cached data if available and still valid
    const getCachedData = (): T[] => {
        const cached = resourceCache[type];
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return cached.data;
        }
        return [];
    };

    const [data, setData] = useState<T[]>(getCachedData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (ignoreCache = false) => {
        const now = Date.now();
        if (!ignoreCache && resourceCache[type] && (now - resourceCache[type].timestamp < CACHE_TTL)) {
            setData(resourceCache[type].data);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let result: T[] = [];
            switch (type) {
                case 'instances':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/instances`).then(res => res.json());
                    break;
                case 'gke-clusters':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-clusters`).then(res => res.json());
                    break;
                case 'storage-buckets':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/storage-buckets`).then(res => res.json());
                    break;
                case 'vpcs':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/vpcs`).then(res => res.json());
                    break;
                case 'public-ips':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/public-ips`).then(res => res.json());
                    break;
                case 'gke-pods':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-pods`).then(res => res.json());
                    break;
                case 'gke-deployments':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-deployments`).then(res => res.json());
                    break;
                case 'gke-services':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-services`).then(res => res.json());
                    break;
                case 'gke-ingress':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-ingress`).then(res => res.json());
                    break;
                case 'gke-configmaps':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-configmaps`).then(res => res.json());
                    break;
                case 'gke-secrets':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-secrets`).then(res => res.json());
                    break;
                case 'gke-pvcs':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-pvcs`).then(res => res.json());
                    break;
                case 'gke-hpa':
                    result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resources/gke-hpa`).then(res => res.json());
                    break;
            }
            setData(result);
            resourceCache[type] = { data: result, timestamp: now };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch resources');
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refresh: () => fetchData(true) };
}
