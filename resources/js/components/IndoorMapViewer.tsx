import React, { useEffect, useState } from 'react';
import { Node, Path } from '../types/IndoorMap';

interface Props {
    mapImageUrl: string;
    floorId: number;
}

const IndoorMapViewer: React.FC<Props> = ({ mapImageUrl, floorId }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [paths, setPaths] = useState<Path[]>([]);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<number | null>(null);

    // 1. Fetch the Graph Data from Laravel
    useEffect(() => {
        fetch(`/api/floor/${floorId}/graph`)
            .then(res => res.json())
            .then(data => {
                setNodes(data.nodes);
                setPaths(data.paths);
            });
    }, [floorId]);

    // 2. Helper to find node coordinates by ID (for drawing lines)
    const getNode = (id: number) => nodes.find(n => n.id === id);

    return (
        <div className="relative w-full overflow-auto border-2 border-gray-300">
            {/* Layer 1: The Floor Plan Image */}
            <div className="relative" style={{ width: '800px', height: '600px' }}> {/* Adjust dimensions to match image */}
                <img 
                    src={mapImageUrl} 
                    alt="Floor Plan" 
                    className="absolute top-0 left-0 w-full h-full object-contain -z-10" 
                />

                {/* Layer 2: SVG Overlay for Navigation Lines */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {paths.map(path => {
                        const start = getNode(path.start_location_id);
                        const end = getNode(path.end_location_id);
                        if (!start || !end) return null;

                        return (
                            <line 
                                key={path.id}
                                x1={start.x_coordinate} 
                                y1={start.y_coordinate}
                                x2={end.x_coordinate} 
                                y2={end.y_coordinate}
                                stroke="blue"
                                strokeWidth="2"
                                opacity="0.5" // Make lines semi-transparent
                            />
                        );
                    })}
                </svg>

                {/* Layer 3: Interactive Nodes (Clickable Dots) */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        onClick={() => setSelectedStart(node.id)} // Example interaction
                        className={`absolute w-4 h-4 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 
                            ${selectedStart === node.id ? 'bg-green-500' : 'bg-red-500 hover:bg-red-400'}`}
                        style={{ 
                            left: node.x_coordinate, 
                            top: node.y_coordinate 
                        }}
                        title={node.name || node.type}
                    />
                ))}
            </div>
        </div>
    );
};

export default IndoorMapViewer;