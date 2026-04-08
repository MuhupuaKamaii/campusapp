import { useState, useRef, useEffect } from 'react';
import '../../css/AnimatedPath.css';

interface Location {
    id: number;
    name: string;
    type: string;
    x_coordinate: number;
    y_coordinate: number;
    floor_id?: number;
}

interface Route {
    path: Location[];
    distance: number;
    waypoints: Array<{ x: number; y: number }>;
}

interface SimpleFloorPlanViewerProps {
    floorName?: string;
    buildingName?: string;
    route?: Route | null;
    locations?: Location[];
    selectedStart?: Location | null;
    selectedEnd?: Location | null;
    onLocationClick?: (location: Location) => void;
    userPosition?: { x: number; y: number; accuracy: number } | null;
}

export default function SimpleFloorPlanViewer({
    floorName = 'First',
    buildingName = 'Library',
    route = null,
    locations = [],
    selectedStart = null,
    selectedEnd = null,
    onLocationClick,
    userPosition = null,
}: SimpleFloorPlanViewerProps) {
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 1000, height: 800 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current) return;
        setPan({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y,
        });
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    const resetView = () => {
        setScale(1);
        setPan({ x: 0, y: 0 });
    };

    const getSvgFileName = () => {
        const nameMap: Record<string, string> = {
            'basement': 'Basement 1.5.svg',
            'ground': 'Ground 1.5.svg',
            'first': 'First 1.5.svg',
            'second': 'Second 1.5.svg',
            '-1': 'Basement 1.5.svg',
            '0': 'Ground 1.5.svg',
            '1': 'First 1.5.svg',
            '2': 'Second 1.5.svg',
        };
        return nameMap[floorName.toLowerCase()] || 'First 1.5.svg';
    };

    const handleImageLoad = () => {
        if (imageRef.current) {
            setImageSize({
                width: imageRef.current.naturalWidth || 1000,
                height: imageRef.current.naturalHeight || 800
            });
            setImageLoaded(true);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800">
                    {buildingName} - {floorName} Floor
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {locations.length} locations available
                    {route && ` - Route: ${route.distance.toFixed(1)}m`}
                </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <button
                    onClick={resetView}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
                >
                    Reset View
                </button>
                <div className="text-sm text-gray-600 font-medium">
                    Zoom: {Math.round(scale * 100)}% | Scroll to zoom | Drag to pan
                </div>
                {userPosition && (
                    <div className="ml-auto flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-700 font-medium">
                            You are here
                        </span>
                    </div>
                )}
            </div>

            {/* Floor Plan Canvas */}
            <div
                ref={containerRef}
                className="relative w-full bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ height: '700px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Transform Container */}
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Floor Plan Image */}
                    <img
                        ref={imageRef}
                        src={`/Floor Plans/${getSvgFileName()}`}
                        alt={`${buildingName} - ${floorName} Floor`}
                        onLoad={handleImageLoad}
                        style={{
                            width: '90%',
                            height: 'auto',
                            display: 'block',
                            userSelect: 'none',
                            WebkitUserDrag: 'none',
                        }}
                        draggable={false}
                    />

                    {/* SVG Overlay for Routes and Markers */}
                    {imageLoaded && (
                        <svg
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'auto',
                                overflow: 'visible',
                            }}
                            viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Route Path */}
                            {route && route.waypoints && route.waypoints.length > 1 && (
                                <g>
                                    <polyline
                                        points={route.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke="#3B82F6"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                            filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
                                        }}
                                    />
                                    {route.waypoints.map((point, idx) => (
                                        <circle
                                            key={idx}
                                            cx={point.x}
                                            cy={point.y}
                                            r="6"
                                            fill="#3B82F6"
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    ))}
                                </g>
                            )}

                            {/* Location Markers */}
                            {locations.map((location) => {
                                const isStart = selectedStart?.id === location.id;
                                const isEnd = selectedEnd?.id === location.id;
                                const isInRoute = route?.path.some(p => p.id === location.id);
                                
                                let fillColor = '#6B7280';
                                let radius = 8;
                                
                                if (isStart) {
                                    fillColor = '#10B981';
                                    radius = 12;
                                } else if (isEnd) {
                                    fillColor = '#EF4444';
                                    radius = 12;
                                } else if (isInRoute) {
                                    fillColor = '#3B82F6';
                                    radius = 10;
                                }

                                return (
                                    <g
                                        key={location.id}
                                        onClick={() => onLocationClick?.(location)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <circle
                                            cx={location.x_coordinate}
                                            cy={location.y_coordinate}
                                            r={radius}
                                            fill={fillColor}
                                            stroke="white"
                                            strokeWidth="3"
                                            style={{
                                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                                            }}
                                        />
                                        <text
                                            x={location.x_coordinate}
                                            y={location.y_coordinate - radius - 5}
                                            textAnchor="middle"
                                            fill="#1F2937"
                                            fontSize="12"
                                            fontWeight="600"
                                            style={{
                                                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            {location.name}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* User Position Marker */}
                            {userPosition && (
                                <g>
                                    <circle
                                        cx={userPosition.x}
                                        cy={userPosition.y}
                                        r={userPosition.accuracy}
                                        fill="rgba(16, 185, 129, 0.2)"
                                        stroke="rgba(16, 185, 129, 0.5)"
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                    />
                                    <circle
                                        cx={userPosition.x}
                                        cy={userPosition.y}
                                        r="8"
                                        fill="#10B981"
                                        stroke="white"
                                        strokeWidth="3"
                                        style={{
                                            filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4))',
                                        }}
                                    />
                                </g>
                            )}

                            {/* Destination Pin Visualization */}
                            {selectedEnd && (
                                <g transform={`translate(${selectedEnd.x_coordinate}, ${selectedEnd.y_coordinate})`}>
                                    {/* Pulsing outer ring */}
                                    <circle 
                                        r="16" 
                                        fill="none" 
                                        stroke="#EF4444" 
                                        strokeWidth="2" 
                                        opacity="0.5"
                                        style={{
                                            animation: 'pulse-destination 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                        }}
                                    />
                                    {/* Main destination pin */}
                                    <circle 
                                        r="12" 
                                        fill="#EF4444" 
                                        opacity="0.75"
                                        style={{
                                            animation: 'ping-destination 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                                        }}
                                    />
                                    {/* Inner dot */}
                                    <circle 
                                        r="6" 
                                        fill="#EF4444" 
                                        stroke="white" 
                                        strokeWidth="2"
                                    />
                                </g>
                            )}
                        </svg>
                    )}
                </div>

                {/* Info Overlay */}
                <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur px-4 py-3 rounded-lg border border-gray-300 shadow-lg text-sm z-10">
                    <div className="text-gray-700 font-semibold mb-2">Floor Plan Info</div>
                    <div className="text-gray-600 text-xs space-y-1">
                        <div>Building: <span className="font-medium">{buildingName}</span></div>
                        <div>Floor: <span className="font-medium">{floorName}</span></div>
                        <div>Zoom: <span className="font-medium">{Math.round(scale * 100)}%</span></div>
                        {route && (
                            <div>Distance: <span className="font-medium text-blue-600">{route.distance.toFixed(1)}m</span></div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                {locations.length > 0 && (
                    <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur px-4 py-3 rounded-lg border border-gray-300 shadow-lg text-xs z-10">
                        <div className="font-semibold text-gray-700 mb-2">Legend</div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow"></div>
                                <span className="text-gray-600">Start</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div>
                                <span className="text-gray-600">Destination</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                                <span className="text-gray-600">Route Path</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-500 border-2 border-white shadow"></div>
                                <span className="text-gray-600">Location</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Zoom Indicator */}
                <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 px-3 py-2 rounded-lg text-sm text-gray-800 font-bold border border-gray-300 shadow-lg z-10">
                    {Math.round(scale * 100)}%
                </div>
            </div>

            {/* Footer Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm flex items-start gap-3">
                <div>
                    <span className="font-semibold text-blue-900">Tip:</span>
                    <span className="text-blue-800 ml-1">
                        Use your mouse scroll wheel to zoom in and out. Click and drag to pan. 
                        {locations.length > 0 && ' Click on location markers to select them.'}
                    </span>
                </div>
            </div>
        </div>
    );
}