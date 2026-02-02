'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Position,
    ConnectionLineType,
    MarkerType,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { NetworkTopology, BackendService } from '@/types/network';

interface DomainTopologyProps {
    domain: string;
    resolvedIps: string[];
    topology: NetworkTopology | null;
}

const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Top;
        node.sourcePosition = Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

export default function DomainTopology({ domain, resolvedIps, topology }: DomainTopologyProps) {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const addedNodes = new Set<string>();

        // 1. Domain Node (Root)
        nodes.push({
            id: 'domain',
            data: { label: domain },
            position: { x: 0, y: 0 },
            type: 'input',
            style: { background: '#6366f1', color: 'white', border: 'none', fontWeight: 'bold' }
        });
        addedNodes.add('domain');

        // 2. IP Nodes
        resolvedIps.forEach((ip, idx) => {
            const ipId = `ip-${ip}`;
            nodes.push({
                id: ipId,
                data: { label: ip },
                position: { x: 0, y: 0 },
                style: { background: '#f8fafc', border: '1px solid #cbd5e1', width: contentWidth(ip) }
            });
            addedNodes.add(ipId);

            edges.push({
                id: `e-domain-${ipId}`,
                source: 'domain',
                target: ipId,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#6366f1' }
            });

            if (!topology) return;

            // 3. Find associated Resources (Public IP / Forwarding Rule)
            let resourceName = 'External IP';
            let resourceType = 'External';
            let forwardingRuleName = null;

            const publicIp = topology.public_ips.find(p => p.ip_address === ip);
            const internalIp = topology.used_internal_ips.find(i => i.ip_address === ip);

            if (publicIp) {
                resourceName = publicIp.resource_name;
                resourceType = 'Public IP';
                // Public IPs might list forwarding rules in details?
                // The current model puts forwarding rule details in 'details' field or we infer
            } else if (internalIp) {
                resourceName = internalIp.resource_name; // Usually the Forwarding Rule name for LBs
                resourceType = 'Forwarding Rule';
                forwardingRuleName = internalIp.resource_name;
            }

            // Create Resource Node if we know more than just "External"
            if (publicIp || internalIp) {
                const resId = `res-${ip}`;
                if (!addedNodes.has(resId)) {
                    nodes.push({
                        id: resId,
                        data: { label: `${resourceName} (${resourceType})` },
                        position: { x: 0, y: 0 },
                        style: { background: '#ecfccb', border: '1px solid #84cc16' }
                    });
                    addedNodes.add(resId);
                }

                edges.push({
                    id: `e-${ipId}-${resId}`,
                    source: ipId,
                    target: resId,
                    type: 'smoothstep',
                });

                // 4. Load Balancer / Backend Service
                // Find Backend Services linked to this IP or Resource
                let associatedBS: BackendService[] = [];

                // Method A: Check explicitly linked backend services in our topology if we had that link
                // Method B: Search backend services by IP
                if (topology.backend_services) {
                    associatedBS = topology.backend_services.filter(bs =>
                        bs.associated_ips && bs.associated_ips.some(aip => aip.split(':')[0] === ip)
                    );
                }

                associatedBS.forEach(bs => {
                    const bsId = `bs-${bs.name}`;
                    if (!addedNodes.has(bsId)) {
                        nodes.push({
                            id: bsId,
                            data: { label: `BS: ${bs.name}` },
                            position: { x: 0, y: 0 },
                            style: { background: '#e0e7ff', border: '1px solid #6366f1' }
                        });
                        addedNodes.add(bsId);
                    }

                    edges.push({
                        id: `e-${resId}-${bsId}`,
                        source: resId,
                        target: bsId,
                        label: bs.protocol,
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed },
                    });

                    // 5. Backends (Instance Groups / NEGs)
                    if (bs.backends) {
                        bs.backends.forEach((be, bIdx) => {
                            // Backend name usually contains the group URL or name
                            const beGroupShort = be.name?.split('/').pop() || 'Unknown';
                            const beId = `be-${bs.name}-${bIdx}`;

                            if (!addedNodes.has(beId)) {
                                nodes.push({
                                    id: beId,
                                    data: { label: beGroupShort },
                                    position: { x: 0, y: 0 },
                                    style: { background: '#fff1f2', border: '1px solid #f43f5e' }
                                });
                                addedNodes.add(beId);
                            }

                            edges.push({
                                id: `e-${bsId}-${beId}`,
                                source: bsId,
                                target: beId,
                                type: 'default',
                            });
                        });
                    }
                });
            }
        });

        return getLayoutedElements(nodes, edges);
    }, [domain, resolvedIps, topology]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when inputs change
    React.useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Auto-fit view logic could be added here if needed via useReactFlow hook

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-right"
            className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
            <Controls />
            <Background color="#94a3b8" gap={16} />
        </ReactFlow>
    );
}

function contentWidth(text: string) {
    // Rough estimation
    return Math.min(Math.max(text.length * 8 + 20, 150), 300);
}
