import { useState, useRef, useEffect } from 'react';

// Interfaces passed from parent
interface Location {
    id: number;
    name: string;
    type: string;
    x_coordinate: number;
    y_coordinate: number;
    floor_id?: number;
}

interface WifiAccessPoint {
    id: number;
    x_coordinate: number;
    y_coordinate: number;
    bssid: string;
    ssid: string;
    tx_power: number;
}

interface WifiSignal {
    bssid: string;
    ssid?: string;
    rssi: number;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number;
    timestamp: string;
}

interface IndoorMapViewerProps {
    // Core map data
    nodes?: Location[];
    paths?: any[];
    floorId?: number;
    highlightedPath?: number[];
    onNodeClick?: (nodeId: number, location: Location) => void;
    selectedStart?: number | null;
    selectedEnd?: number | null;
    floorPlanFilename?: string;
    
    // WiFi Positioning - Purely visual props
    userPosition?: UserPosition | null;
    wifiSignals?: WifiSignal[];
    accessPoints?: WifiAccessPoint[];
    showWifiOverlay?: boolean;
    isPositioning?: boolean;
    positioningError?: string | null;
}

const colorMap: Record<string, string> = {
    room: '#ef4444',
    stair: '#eab308',
    stairs: '#eab308',
    elevator: '#8b5cf6',
    hallway: '#10b981',
    department: '#f97316',
    entrance: '#06b6d4',
};

export default function IndoorMapViewer({
    nodes: externalNodes = [],
    paths = [],
    floorId,
    highlightedPath = [],
    onNodeClick,
    selectedStart,
    selectedEnd,
    floorPlanFilename,
    // WiFi positioning visual props (optional)
    userPosition = null,
    wifiSignals = [],
    accessPoints = [],
    showWifiOverlay = false,
    isPositioning = false,
    positioningError = null,
}: IndoorMapViewerProps) {
    // UI State only
    const [svgUrl, setSvgUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [svgDimensions, setSvgDimensions] = useState({ width: 1200, height: 800 });
    const [nodes, setNodes] = useState<Location[]>(externalNodes);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Update nodes when external prop changes
    useEffect(() => {
        setNodes(externalNodes);
    }, [externalNodes]);

    // Load floor plan
    useEffect(() => {
        const loadFloorPlan = async () => {
            setLoading(true);
            try {
                let floorFileName = 'ground';
                if (floorPlanFilename) {
                    const match = floorPlanFilename.match(/[Ff]loor\s*(-?\d+|[a-z]+)/i);
                    if (match) {
                        const level = match[1].toLowerCase();
                        const levelMap: Record<string, string> = {
                            '0': 'ground', '1': 'first', '2': 'second', '-1': 'basement',
                            'basement': 'basement', 'ground': 'ground', 'first': 'first', 'second': 'second',
                        };
                        floorFileName = levelMap[level] || 'ground';
                    }
                }

                const svgUrlPath = `/Floor Plans/${floorFileName} 1.5.svg`;
                setSvgUrl(svgUrlPath);

                // Try GeoJSON
                try {
                    const geoJsonResponse = await fetch(`/floor-plans/library-${floorFileName}.geojson`);
                    if (geoJsonResponse.ok) {
                        const geojson = await geoJsonResponse.json();
                        const offices: Location[] = geojson.features.map((feature: any, index: number) => ({
                            id: index,
                            name: feature.properties.name,
                            type: feature.properties.type,
                            x_coordinate: feature.geometry.coordinates[0],
                            y_coordinate: feature.geometry.coordinates[1],
                            floor_id: floorId,
                        }));
                        setNodes(offices);
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.log('GeoJSON not found, using fallback data');
                }

                setNodes(externalNodes.length > 0 ? externalNodes : generateTestData());
                setLoading(false);
            } catch (error) {
                console.error('Error loading floor plan:', error);
                setNodes(externalNodes.length > 0 ? externalNodes : generateTestData());
                setLoading(false);
            }
        };

        loadFloorPlan();
    }, [floorPlanFilename, externalNodes, floorId]);

    const generateTestData = (): Location[] => ([
        { id: 1, floor_id: floorId, x_coordinate: 100, y_coordinate: 100, name: 'Office 101', type: 'room' },
        { id: 2, floor_id: floorId, x_coordinate: 250, y_coordinate: 100, name: 'Office 102', type: 'room' },
        { id: 3, floor_id: floorId, x_coordinate: 400, y_coordinate: 100, name: 'Conference Room', type: 'room' },
        { id: 4, floor_id: floorId, x_coordinate: 550, y_coordinate: 100, name: 'Office 103', type: 'room' },
        { id: 5, floor_id: floorId, x_coordinate: 200, y_coordinate: 300, name: 'Hallway A', type: 'hallway' },
        { id: 6, floor_id: floorId, x_coordinate: 400, y_coordinate: 300, name: 'Hallway B', type: 'hallway' },
        { id: 7, floor_id: floorId, x_coordinate: 600, y_coordinate: 300, name: 'Hallway C', type: 'hallway' },
        { id: 8, floor_id: floorId, x_coordinate: 100, y_coordinate: 500, name: 'Stairs A', type: 'stair' },
        { id: 9, floor_id: floorId, x_coordinate: 400, y_coordinate: 500, name: 'Stairs B', type: 'stair' },
        { id: 10, floor_id: floorId, x_coordinate: 700, y_coordinate: 500, name: 'Elevator', type: 'elevator' },
    ]);

    // Event handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(Math.max(0.5, Math.min(3, scale * delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('circle') || target.closest('[data-node]') || target.closest('[data-user]')) {
            return;
        }
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current) return;
        setPan({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
    };

    const handleMouseUp = () => { isDraggingRef.current = false; };
    
    const handleNodeClick = (location: Location) => {
        onNodeClick?.(location.id, location);
    };

    const resetView = () => {
        setScale(1);
        setPan({ x: 0, y: 0 });
    };

    const getNodeColor = (location: Location, index: number) => {
        if (highlightedPath.includes(index)) return '#22c55e';
        if (selectedStart === index) return '#3b82f6';
        if (selectedEnd === index) return '#8b5cf6';
        return colorMap[location.type] || '#6b7280';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Loading floor plan...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {/* Basic Controls */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-gray-300 shadow-md flex-wrap">
                <button
                    onClick={resetView}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition shadow-sm"
                >
                    ⟲ Reset View
                </button>
                
                <div className="text-sm text-gray-700 font-medium ml-auto">
                    Zoom: {Math.round(scale * 100)}% | Scroll to zoom | Drag to pan
                </div>
            </div>

            {/* Map Container */}
            <div
                ref={containerRef}
                className="relative w-full bg-gray-50 border-2 border-gray-300 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ height: '600px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* SVG Background */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                }}>
                    {svgUrl && (
                        <img
                            ref={imgRef}
                            src={svgUrl}
                            alt="Floor Plan"
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                setSvgDimensions({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 });
                            }}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                    )}
                </div>

                {/* Interactive SVG Overlay */}
                <svg
                    width="100%" height="100%"
                    style={{
                        position: 'absolute', top: 0, left: 0, pointerEvents: 'auto',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                    }}
                    viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                    preserveAspectRatio="none"
                >
                    {/* Path Connections */}
                    {paths.map((path, idx) => {
                        const fromNode = nodes.find(n => n.id === path.start_location_id);
                        const toNode = nodes.find(n => n.id === path.end_location_id);
                        if (!fromNode || !toNode) return null;
                        return (
                            <line key={`path-${idx}`} x1={fromNode.x_coordinate} y1={fromNode.y_coordinate}
                                x2={toNode.x_coordinate} y2={toNode.y_coordinate} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                        );
                    })}

                    {/* Highlighted Route */}
                    {highlightedPath.length > 1 && (
                        <g>
                            {highlightedPath.map((nodeIdx, index) => {
                                if (index === highlightedPath.length - 1) return null;
                                const from = nodes[nodeIdx];
                                const to = nodes[highlightedPath[index + 1]];
                                if (!from || !to) return null;
                                return (
                                    <line key={`highlight-${index}`} x1={from.x_coordinate} y1={from.y_coordinate}
                                        x2={to.x_coordinate} y2={to.y_coordinate} stroke="#22c55e" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
                                );
                            })}
                        </g>
                    )}

                    {/* WiFi Access Points Overlay */}
                    {showWifiOverlay && accessPoints.map((ap) => {
                        const isDetected = wifiSignals.some(s => s.bssid.toLowerCase() === ap.bssid.toLowerCase());
                        return (
                            <g key={`ap-${ap.id}`}>
                                <circle cx={ap.x_coordinate} cy={ap.y_coordinate} r={100}
                                    fill={isDetected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.05)'}
                                    stroke={isDetected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.1)'} 
                                    strokeWidth="1" strokeDasharray="4,4" />
                                <circle cx={ap.x_coordinate} cy={ap.y_coordinate} r={isDetected ? 10 : 6}
                                    fill={isDetected ? '#10b981' : '#6b7280'} stroke="white" strokeWidth="2" />
                                <text x={ap.x_coordinate} y={ap.y_coordinate - 15} textAnchor="middle" 
                                    fill={isDetected ? '#059669' : '#4b5563'} fontSize="10" fontWeight="bold">
                                    {ap.ssid}
                                </text>
                                {isDetected && (
                                    <text x={ap.x_coordinate} y={ap.y_coordinate + 20} textAnchor="middle" fill="#059669" fontSize="9">
                                        {wifiSignals.find(s => s.bssid.toLowerCase() === ap.bssid.toLowerCase())?.rssi}dBm
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* User Position - Rendered from props */}
                    {userPosition && (
                        <g data-user style={{ pointerEvents: 'none' }}>
                            {/* Accuracy radius */}
                            <circle cx={userPosition.x} cy={userPosition.y} 
                                r={Math.max(userPosition.accuracy * 10, 20)}
                                fill="rgba(59, 130, 246, 0.15)" 
                                stroke="rgba(59, 130, 246, 0.6)" strokeWidth="2" strokeDasharray="5,5">
                                <animate attributeName="r" values={`${userPosition.accuracy * 10};${userPosition.accuracy * 12};${userPosition.accuracy * 10}`} dur="2s" repeatCount="indefinite" />
                            </circle>
                            
                            {/* Position dot */}
                            <circle cx={userPosition.x} cy={userPosition.y} r={10} fill="#3b82f6" stroke="white" strokeWidth="3" />
                            <circle cx={userPosition.x} cy={userPosition.y} r={4} fill="white" />
                            
                            {/* Label */}
                            <g transform={`translate(${userPosition.x}, ${userPosition.y - 25})`}>
                                <rect x="-25" y="-15" width="50" height="18" rx="4" fill="#3b82f6" opacity="0.9" />
                                <text x="0" y="-3" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">You</text>
                            </g>
                        </g>
                    )}

                    {/* Navigation Nodes */}
                    {nodes.map((location, index) => {
                        const isHighlighted = highlightedPath.includes(index);
                        const isStart = selectedStart === index;
                        const isEnd = selectedEnd === index;
                        const color = getNodeColor(location, index);
                        const radius = isStart || isEnd ? 12 : (isHighlighted ? 10 : 8);

                        return (
                            <g key={index} data-node>
                                <circle cx={location.x_coordinate} cy={location.y_coordinate} r={radius + 6}
                                    fill="transparent" pointerEvents="all" style={{ cursor: 'pointer' }}
                                    onClick={() => handleNodeClick(location)} />
                                    
                                {(isStart || isEnd) && (
                                    <circle cx={location.x_coordinate} cy={location.y_coordinate} r={radius + 3}
                                        fill="none" stroke="white" strokeWidth="3" opacity="0.8" />
                                )}
                                
                                <circle cx={location.x_coordinate} cy={location.y_coordinate} r={radius}
                                    fill={color} stroke="white" strokeWidth={isStart || isEnd ? '2' : '1'} opacity="0.95" />
                                
                                {(isStart || isEnd) && (
                                    <>
                                        <rect x={location.x_coordinate - 28} y={location.y_coordinate - 28} width="56" height="20" rx="6"
                                            fill={isStart ? '#22c55e' : '#8b5cf6'} opacity="0.95" />
                                        <text x={location.x_coordinate} y={location.y_coordinate - 15} textAnchor="middle" 
                                            fill="white" fontSize="11" fontWeight="bold">
                                            {isStart ? 'START' : 'END'}
                                        </text>
                                    </>
                                )}
                                
                                <title>{location.name} ({location.type})</title>
                            </g>
                        );
                    })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white bg-opacity-98 p-4 rounded-lg border-2 border-gray-300 text-sm shadow-lg">
                    <div className="font-bold mb-3 text-gray-800 text-base">Legend</div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 border border-red-600"></div>
                            <span className="text-gray-800 font-medium">Room</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0 border border-green-600"></div>
                            <span className="text-gray-800 font-medium">Hallway</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0 border border-yellow-600"></div>
                            <span className="text-gray-800 font-medium">Stairs</span>
                        </div>
                        
                        {/* Conditional WiFi Legend Items */}
                        {showWifiOverlay && (
                            <>
                                <div className="border-t border-gray-300 mt-2 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 border-2 border-white shadow"></div>
                                        <span className="text-gray-800 font-medium">Your Position</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></div>
                                    <span className="text-gray-700 text-xs">WiFi AP (detected)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></div>
                                    <span className="text-gray-700 text-xs">WiFi AP (not detected)</span>
                                </div>
                            </>
                        )}
                        
                        <div className="border-t border-gray-300 mt-2 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-green-400 flex-shrink-0 border-2 border-green-500" style={{boxShadow: '0 0 4px rgba(34, 197, 94, 0.8)'}}></div>
                                <span className="text-gray-800 font-medium">Route</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zoom Indicator */}
                <div className="absolute bottom-4 right-4 bg-white bg-opacity-98 px-3 py-2 rounded-lg text-sm text-gray-800 font-bold border-2 border-gray-300 shadow-lg">
                    {Math.round(scale * 100)}%
                </div>
                
                {/* Positioning Status Overlay */}
                {isPositioning && (
                    <div className="absolute top-4 right-4 bg-white bg-opacity-98 p-3 rounded-lg border-2 border-gray-300 shadow-lg min-w-[150px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="font-medium text-sm">Scanning...</span>
                        </div>
                        
                        {userPosition ? (
                            <div className="text-xs text-blue-700 font-mono bg-blue-50 p-2 rounded">
                                <div>Acc: ±{userPosition.accuracy.toFixed(1)}m</div>
                                <div>APs: {wifiSignals.length}</div>
                            </div>
                        ) : positioningError ? (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{positioningError}</div>
                        ) : (
                            <div className="text-xs text-amber-600">Acquiring position...</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}