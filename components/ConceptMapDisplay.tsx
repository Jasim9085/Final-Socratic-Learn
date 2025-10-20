import React, { useMemo, useState, useRef } from 'react';
import type { ConceptMapData, GraphConceptMap, MatrixConceptMap, ConceptMapNode } from '../types';

interface ConceptMapDisplayProps {
    data: ConceptMapData;
}

interface NodeWithPosition extends ConceptMapNode {
    x: number;
    y: number;
}

interface Transform {
    x: number;
    y: number;
    k: number;
}

const GraphDisplay: React.FC<{ data: GraphConceptMap }> = ({ data }) => {
    const { nodes, edges } = data;
    const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const isDraggingRef = useRef(false);
    const startPointRef = useRef({ x: 0, y: 0 });

    const { positionedNodes, viewBox } = useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return { positionedNodes: new Map(), viewBox: '0 0 800 600' };
        }

        const nodeMap = new Map<string, NodeWithPosition>();
        
        // Check if the AI provided positions from the `position` property
        if (nodes[0].position && typeof nodes[0].position.x === 'number') {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
            nodes.forEach(node => {
                const x = node.position!.x;
                const y = node.position!.y;
                nodeMap.set(node.id, { ...node, x, y });
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            });
            
            const padding = 100; // Add padding around the graph
            const width = maxX - minX;
            const height = maxY - minY;
            const vb = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;
            
            return { positionedNodes: nodeMap, viewBox: vb };
        } else {
            // Fallback to circular layout if no positions are provided
            const width = 800;
            const height = 600;
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 100;
            const angleStep = (2 * Math.PI) / nodes.length;

            nodes.forEach((node, i) => {
                const x = centerX + radius * Math.cos(i * angleStep - Math.PI / 2);
                const y = centerY + radius * Math.sin(i * angleStep - Math.PI / 2);
                nodeMap.set(node.id, { ...node, x, y });
            });
            
            return { positionedNodes: nodeMap, viewBox: `0 0 ${width} ${height}` };
        }
    }, [nodes]);
    
    const { connectedNodes, connectedEdges } = useMemo(() => {
        if (!hoveredNode) return { connectedNodes: null, connectedEdges: null };

        const cNodes = new Set<string>([hoveredNode]);
        const cEdges = new Set<string>();

        edges.forEach((edge, i) => {
            if (edge.source === hoveredNode) {
                cNodes.add(edge.target);
                cEdges.add(`edge-${i}`);
            }
            if (edge.target === hoveredNode) {
                cNodes.add(edge.source);
                cEdges.add(`edge-${i}`);
            }
        });
        return { connectedNodes: cNodes, connectedEdges: cEdges };
    }, [hoveredNode, edges]);


    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        startPointRef.current = { x: e.clientX, y: e.clientY };
        svgRef.current?.classList.add('grabbing');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dx = (e.clientX - startPointRef.current.x);
        const dy = (e.clientY - startPointRef.current.y);
        setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
        startPointRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUpOrLeave = () => {
        isDraggingRef.current = false;
        svgRef.current?.classList.remove('grabbing');
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleFactor = 1.1;
        const newScale = e.deltaY < 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
        const clampedScale = Math.max(0.2, Math.min(newScale, 5));
        
        setTransform(t => ({ ...t, k: clampedScale }));
    };

    const findNodePos = (id: string) => positionedNodes.get(id);

    return (
        <svg 
            ref={svgRef}
            viewBox={viewBox} 
            className="concept-map-svg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
        >
            <defs>
                <marker id="arrowhead" viewBox="-5 -5 10 10" refX="0" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0,0 m -5,-5 L 5,0 L -5,5 Z" className="arrow-head-path" />
                </marker>
            </defs>

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {edges.map((edge, i) => {
                    const sourceNode = findNodePos(edge.source);
                    const targetNode = findNodePos(edge.target);
                    if (!sourceNode || !targetNode) return null;
                    
                    const midX = (sourceNode.x + targetNode.x) / 2;
                    const midY = (sourceNode.y + targetNode.y) / 2;

                    const isDimmed = hoveredNode && !connectedEdges?.has(`edge-${i}`);

                    return (
                        <g key={`edge-${i}`} className={`edge ${isDimmed ? 'dimmed' : ''}`}>
                            <line
                                x1={sourceNode.x} y1={sourceNode.y}
                                x2={targetNode.x} y2={targetNode.y}
                                markerEnd="url(#arrowhead)"
                            />
                            <text x={midX} y={midY} textAnchor="middle" dy="-6" className="edge-label">
                                {edge.label}
                            </text>
                        </g>
                    );
                })}

                {Array.from(positionedNodes.values()).map((node: NodeWithPosition) => {
                    const isDimmed = hoveredNode && !connectedNodes?.has(node.id);
                    return (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`} 
                            className={`node-group ${isDimmed ? 'dimmed' : ''}`}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                        >
                            <circle r="60" className="node-circle" />
                            <foreignObject x="-55" y="-55" width="110" height="110">
                               <div className="node-label-wrapper">
                                    <p className="node-label">{node.label}</p>
                               </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
};

const MatrixDisplay: React.FC<{ data: MatrixConceptMap }> = ({ data }) => {
    return (
        <div className="concept-map-matrix-wrapper">
            <h3 className="matrix-title">{data.title}</h3>
            <div className="matrix-table-container">
                <table className="matrix-table">
                    <thead>
                        <tr>
                            {data.headers.map((header, index) => (
                                <th key={index}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const ConceptMapDisplay: React.FC<ConceptMapDisplayProps> = ({ data }) => {
    return (
        <div className="w-full h-full bg-light-bg dark:bg-dark-bg rounded-lg overflow-hidden border border-light-border dark:border-dark-border">
            {data.type === 'matrix' 
                ? <MatrixDisplay data={data} />
                : <GraphDisplay data={data} />
            }
        </div>
    );
};

export default ConceptMapDisplay;