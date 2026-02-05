'use client';

import React, { useMemo, useCallback, memo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Position,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Handle,
    NodeProps,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { NetworkTopology, BackendService } from '@/types/network';
import { Globe, Server, Shield, Network, Box, Database, Cpu } from 'lucide-react';

interface DomainTopologyProps {
    domain: string;
    resolvedIps: string[];
    topology: NetworkTopology | null;
}

const nodeWidth = 350;
const nodeHeight = 80;

// Custom Node Components
const DomainNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30 min-w-[180px] max-w-[400px]">
        <Handle type="source" position={Position.Bottom} className="!bg-indigo-300 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Globe size={18} className="text-indigo-200 flex-shrink-0" />
            <div className="font-bold text-sm break-all">{data.label}</div>
        </div>
        <div className="text-[10px] text-indigo-200 mt-1">Domain</div>
    </div>
));
DomainNode.displayName = 'DomainNode';

const IpNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-900/30 border border-slate-600/50 min-w-[140px]">
        <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Network size={16} className="text-emerald-400" />
            <div className="font-mono text-sm font-bold">{data.label}</div>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">{data.type || 'IP Address'}</div>
    </div>
));
IpNode.displayName = 'IpNode';

const ResourceNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/30 min-w-[180px] max-w-[400px]">
        <Handle type="target" position={Position.Top} className="!bg-emerald-300 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} className="!bg-emerald-300 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Server size={16} className="text-emerald-200 flex-shrink-0" />
            <div className="font-semibold text-sm break-all">{data.label}</div>
        </div>
        <div className="text-[10px] text-emerald-200 mt-1">{data.type || 'Resource'}</div>
    </div>
));
ResourceNode.displayName = 'ResourceNode';

const BackendServiceNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30 min-w-[180px] max-w-[400px]">
        <Handle type="target" position={Position.Top} className="!bg-blue-300 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} className="!bg-blue-300 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-200 flex-shrink-0" />
            <div className="font-semibold text-sm break-all">{data.label}</div>
        </div>
        <div className="text-[10px] text-blue-200 mt-1 flex items-center gap-1">
            {data.protocol && <span className="px-1.5 py-0.5 bg-blue-400/30 rounded text-[9px]">{data.protocol}</span>}
            Backend Service
        </div>
    </div>
));
BackendServiceNode.displayName = 'BackendServiceNode';

const BackendNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30 border border-rose-400/30 min-w-[160px] max-w-[400px]">
        <Handle type="target" position={Position.Top} className="!bg-rose-300 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Cpu size={16} className="text-rose-200 flex-shrink-0" />
            <div className="font-semibold text-sm break-all">{data.label}</div>
        </div>
        <div className="text-[10px] text-rose-200 mt-1">{data.type || 'Instance Group'}</div>
    </div>
));
BackendNode.displayName = 'BackendNode';

const CloudArmorNode = memo(({ data }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 border border-amber-400/30 min-w-[140px]">
        <Handle type="target" position={Position.Top} className="!bg-amber-300 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} className="!bg-amber-300 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-200" />
            <div className="font-semibold text-sm truncate max-w-[160px]">{data.label}</div>
        </div>
        <div className="text-[10px] text-amber-200 mt-1">Cloud Armor Policy</div>
    </div>
));
CloudArmorNode.displayName = 'CloudArmorNode';

const nodeTypes = {
    domain: DomainNode,
    ip: IpNode,
    resource: ResourceNode,
    backendService: BackendServiceNode,
    backend: BackendNode,
    cloudArmor: CloudArmorNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 120, nodesep: 100, marginx: 50, marginy: 50 });

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
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
        return node;
    });

    return { nodes, edges };
};

const defaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: { strokeWidth: 2 },
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
            type: 'domain',
        });
        addedNodes.add('domain');

        // 2. IP Nodes
        resolvedIps.forEach((ip) => {
            const ipId = `ip-${ip}`;
            const isInternal = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');

            nodes.push({
                id: ipId,
                data: { label: ip, type: isInternal ? 'Internal' : 'External' },
                position: { x: 0, y: 0 },
                type: 'ip',
            });
            addedNodes.add(ipId);

            edges.push({
                id: `e-domain-${ipId}`,
                source: 'domain',
                target: ipId,
                style: { stroke: '#818cf8', strokeWidth: 2 },
            });

            if (!topology) return;

            // 3. Find associated Resources
            const publicIp = topology.public_ips.find(p => p.ip_address === ip);
            const internalIp = topology.used_internal_ips.find(i => i.ip_address === ip);

            if (publicIp || internalIp) {
                const resourceName = publicIp?.resource_name || internalIp?.resource_name || 'Unknown';
                const resourceType = publicIp ? 'Public IP' : 'Forwarding Rule';
                const resId = `res-${ip}`;

                if (!addedNodes.has(resId)) {
                    nodes.push({
                        id: resId,
                        data: { label: resourceName, type: resourceType },
                        position: { x: 0, y: 0 },
                        type: 'resource',
                    });
                    addedNodes.add(resId);
                }

                edges.push({
                    id: `e-${ipId}-${resId}`,
                    source: ipId,
                    target: resId,
                    style: { stroke: '#10b981', strokeWidth: 2 },
                });

                // 4. Backend Services
                let associatedBS: BackendService[] = [];
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
                            data: { label: bs.name, protocol: bs.protocol },
                            position: { x: 0, y: 0 },
                            type: 'backendService',
                        });
                        addedNodes.add(bsId);

                        // Add Cloud Armor from backends if exists
                        const backendWithArmor = bs.backends?.find(b => b.security_policy);
                        if (backendWithArmor?.security_policy) {
                            const armorId = `armor-${backendWithArmor.security_policy}`;
                            if (!addedNodes.has(armorId)) {
                                nodes.push({
                                    id: armorId,
                                    data: { label: backendWithArmor.security_policy },
                                    position: { x: 0, y: 0 },
                                    type: 'cloudArmor',
                                });
                                addedNodes.add(armorId);
                            }
                            edges.push({
                                id: `e-${bsId}-${armorId}`,
                                source: bsId,
                                target: armorId,
                                style: { stroke: '#f59e0b', strokeWidth: 2 },
                                label: 'Protected by',
                                labelStyle: { fontSize: 10, fill: '#f59e0b' },
                                labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
                            });
                        }
                    }

                    edges.push({
                        id: `e-${resId}-${bsId}`,
                        source: resId,
                        target: bsId,
                        style: { stroke: '#3b82f6', strokeWidth: 2 },
                    });

                    // 5. Backends
                    if (bs.backends) {
                        bs.backends.forEach((be, bIdx) => {
                            const beGroupShort = be.name?.split('/').pop() || 'Unknown';
                            const beId = `be-${bs.name}-${bIdx}`;

                            if (!addedNodes.has(beId)) {
                                nodes.push({
                                    id: beId,
                                    data: { label: beGroupShort, type: be.type || 'Backend' },
                                    position: { x: 0, y: 0 },
                                    type: 'backend',
                                });
                                addedNodes.add(beId);
                            }

                            edges.push({
                                id: `e-${bsId}-${beId}`,
                                source: bsId,
                                target: beId,
                                style: { stroke: '#f43f5e', strokeWidth: 2 },
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

    React.useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    return (
        <div className="h-[500px] w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                attributionPosition="bottom-right"
                className="bg-slate-900 rounded-xl border border-slate-700"
                proOptions={{ hideAttribution: true }}
            >
                <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-600" />
                <Background color="#334155" gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}

