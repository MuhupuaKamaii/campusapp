import { useState } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import '../../css/AnimatedPath.css';
import { getFloorGraphData, type GraphData } from '../services/graphData';
import type { BuildingFloor } from '../services/buildings';

interface Location {
    id: number;
    name: string;
    type: string;
    x_coordinate: number;
    y_coordinate: number;
    floor_id?: number;
    floorId: number;
}

interface Route {
    path: Location[];
    distance: number;
    waypoints: Array<{ x: number; y: number }>;
}

interface SimpleFloorPlanViewerProps {
    floorConfig: BuildingFloor;
    buildingName?: string;
    route?: Route | null;
    locations?: Location[];
    selectedStart?: Location | null;
    selectedEnd?: Location | null;
    userPosition?: { x: number; y: number; accuracy: number } | null;
    pickingStart?: boolean;
    onStartPicked?: (location: Location) => void;
}

const NODE_COLORS: Record<string, string> = {
    entrance:   '#22C55E',
    service:    '#8B5CF6',
    study:      '#3B82F6',
    lab:        '#F59E0B',
    office:     '#14B8A6',
    restroom:   '#EC4899',
    food:       '#F97316',
    rest:       '#6366F1',
    collection: '#D97706',
    walkway:    '#9CA3AF',
    exit:       '#EF4444',
};

const LEGEND_TYPES = [
    { type: 'entrance', label: 'Entrance' },
    { type: 'study',    label: 'Study' },
    { type: 'office',   label: 'Office' },
    { type: 'lab',      label: 'Lab' },
    { type: 'service',  label: 'Service' },
    { type: 'walkway',  label: 'Walkway' },
];


// Inner controls component — must be used inside TransformWrapper
function ZoomControls({ onToggleGraph, showGraph }: { onToggleGraph: () => void; showGraph: boolean }) {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="flex items-center gap-2">
            <button onClick={() => zoomIn()} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm">+</button>
            <button onClick={() => zoomOut()} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm">−</button>
            <button onClick={() => resetTransform()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm">Reset</button>
            <button
                onClick={onToggleGraph}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm border transition ${showGraph ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
                {showGraph ? 'Hide Graph' : 'Show Graph'}
            </button>
        </div>
    );
}

export default function SimpleFloorPlanViewer({
    floorConfig,
    buildingName = 'Building',
    route = null,
    locations = [],
    selectedStart = null,
    selectedEnd = null,
    userPosition = null,
    pickingStart = false,
    onStartPicked,
}: SimpleFloorPlanViewerProps) {
    const [showGraphOverlay, setShowGraphOverlay] = useState(false);

    const { svgWidth: svgW, svgHeight: svgH, svgFile, floorId, name: floorName } = floorConfig;

    let graphData: GraphData | null = null;
    try {
        graphData = getFloorGraphData(floorId);
    } catch {
        graphData = null;
    }

    return (
        <div className="w-full space-y-4">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800">{buildingName} — {floorName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {locations.length} locations{route && ` · Route: ${route.distance.toFixed(1)} m`}
                </p>
            </div>

            <TransformWrapper
                centerOnInit
                minScale={0.6}
                maxScale={3}
                smooth
                doubleClick={{ mode: 'reset' }}
                wheel={{ step: 0.03 }}
            >
                {/* Controls bar sits inside TransformWrapper so useControls works */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-wrap">
                    <ZoomControls
                        onToggleGraph={() => setShowGraphOverlay(v => !v)}
                        showGraph={showGraphOverlay}
                    />
                    {userPosition && (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-700 font-medium">You are here</span>
                        </div>
                    )}
                </div>

                {/* Map canvas */}
                <div className="relative w-full bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden" style={{ height: '700px' }}>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                        <svg
                            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
                            viewBox={`0 0 ${svgW} ${svgH}`}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            {/* Floor plan image */}
                            <image href={`/Floor Plans/${svgFile}`} x="0" y="0" width={svgW} height={svgH} />

                            {/* Graph overlay — edges then nodes */}
                            {showGraphOverlay && graphData && (
                                <g>
                                    {graphData.edges.map(edge => {
                                        const from = graphData!.vertices.find(v => v.id === edge.from);
                                        const to   = graphData!.vertices.find(v => v.id === edge.to);
                                        if (!from || !to) return null;
                                        return (
                                            <line key={`e-${edge.id}`}
                                                x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                                                stroke="#94A3B8" strokeWidth="1.2" strokeOpacity="0.6"
                                            />
                                        );
                                    })}
                                    {graphData.vertices
                                        .filter(v => v.type === 'walkway')
                                        .map(vertex => (
                                            <circle key={`v-${vertex.id}`}
                                                cx={vertex.cx} cy={vertex.cy} r="3.5"
                                                fill="#9CA3AF" stroke="white" strokeWidth="1" opacity="0.7"
                                            />
                                        ))
                                    }
                                </g>
                            )}

                            {/* Route path — dashed blue line, destination dot only */}
                            {route?.waypoints && route.waypoints.length > 1 && (
                                <g>
                                    {/* Outer glow */}
                                    <polyline
                                        points={route.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none" stroke="#93C5FD" strokeWidth="8"
                                        strokeLinecap="round" strokeLinejoin="round" opacity="0.4"
                                    />
                                    {/* Dashed line */}
                                    <polyline
                                        points={route.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none" stroke="#3B82F6" strokeWidth="3"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        strokeDasharray="8 6"
                                    />
                                    {/* Destination dot */}
                                    <circle
                                        cx={route.waypoints[route.waypoints.length - 1].x}
                                        cy={route.waypoints[route.waypoints.length - 1].y}
                                        r="7" fill="#3B82F6" stroke="white" strokeWidth="2.5"
                                    />
                                </g>
                            )}

                            {/* Start marker */}
                            {selectedStart && (
                                <g>
                                    <circle cx={selectedStart.x_coordinate} cy={selectedStart.y_coordinate}
                                        r="10" fill="#10B981" stroke="white" strokeWidth="3"
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                                    />
                                    <text x={selectedStart.x_coordinate} y={selectedStart.y_coordinate - 14}
                                        textAnchor="middle" fontSize="9" fontWeight="700"
                                        fill="#065F46" stroke="white" strokeWidth="2" paintOrder="stroke"
                                        style={{ pointerEvents: 'none' }}
                                    >{selectedStart.name}</text>
                                </g>
                            )}
                            {/* End marker */}
                            {selectedEnd && (
                                <g>
                                    <circle cx={selectedEnd.x_coordinate} cy={selectedEnd.y_coordinate}
                                        r="10" fill="#EF4444" stroke="white" strokeWidth="3"
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                                    />
                                    <text x={selectedEnd.x_coordinate} y={selectedEnd.y_coordinate - 14}
                                        textAnchor="middle" fontSize="9" fontWeight="700"
                                        fill="#7F1D1D" stroke="white" strokeWidth="2" paintOrder="stroke"
                                        style={{ pointerEvents: 'none' }}
                                    >{selectedEnd.name}</text>
                                </g>
                            )}

                            {/* Pick-start mode — all named locations become clickable */}
                            {pickingStart && locations.map(loc => (
                                <g key={`pick-${loc.id}`}
                                    onClick={() => onStartPicked?.(loc)}
                                    style={{ cursor: 'crosshair' }}
                                >
                                    <circle cx={loc.x_coordinate} cy={loc.y_coordinate}
                                        r="12" fill="#F97316" stroke="white" strokeWidth="3" opacity="0.9"
                                        style={{ filter: 'drop-shadow(0 2px 6px rgba(249,115,22,0.5))' }}
                                    />
                                    <text x={loc.x_coordinate} y={loc.y_coordinate - 16}
                                        textAnchor="middle" fontSize="9" fontWeight="700"
                                        fill="#7C2D12" stroke="white" strokeWidth="2" paintOrder="stroke"
                                        style={{ pointerEvents: 'none' }}
                                    >{loc.name}</text>
                                </g>
                            ))}

                            {/* User position */}
                            {userPosition && (
                                <g>
                                    <circle cx={userPosition.x} cy={userPosition.y} r={userPosition.accuracy}
                                        fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.5)"
                                        strokeWidth="2" strokeDasharray="5,5"
                                    />
                                    <circle cx={userPosition.x} cy={userPosition.y} r="8"
                                        fill="#10B981" stroke="white" strokeWidth="3"
                                        style={{ filter: 'drop-shadow(0 2px 6px rgba(16,185,129,0.4))' }}
                                    />
                                </g>
                            )}

                        </svg>
                    </TransformComponent>

                    {/* Info panel — top-right, outside SVG */}
                    <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur px-4 py-3 rounded-lg border border-gray-300 shadow-lg text-xs z-10 pointer-events-none">
                        <div className="text-gray-700 font-semibold mb-1.5">Floor Plan Info</div>
                        <div className="space-y-1 text-gray-600">
                            <div>Building: <span className="font-medium">{buildingName}</span></div>
                            <div>Floor: <span className="font-medium">{floorName}</span></div>
                            {route && <div>Distance: <span className="font-medium text-blue-600">{route.distance.toFixed(1)} m</span></div>}
                        </div>
                        {showGraphOverlay && graphData && (
                            <>
                                <div className="border-t border-gray-200 mt-2 pt-2 font-semibold text-gray-700 mb-1">Node Types</div>
                                <div className="space-y-1">
                                    {LEGEND_TYPES.map(({ type, label }) => (
                                        <div key={type} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </TransformWrapper>
        </div>
    );
}
