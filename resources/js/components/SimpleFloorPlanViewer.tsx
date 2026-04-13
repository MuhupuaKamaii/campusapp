import { useState, useRef } from 'react';
import '../../css/AnimatedPath.css';
import FloorPlanWithGraph from './FloorPlanWithGraph';

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
    useGraphVisualization?: boolean;
}

/**
 * Main floor plan viewer component
 * Displays clean floor plan with route visualization (graph nodes hidden by default)
 */
export default function SimpleFloorPlanViewer({
    floorName = 'First',
    buildingName = 'Library',
    route = null,
    locations = [],
    selectedStart = null,
    selectedEnd = null,
    onLocationClick,
    userPosition = null,
    useGraphVisualization = false,
}: SimpleFloorPlanViewerProps) {
    const [showGraphDebug, setShowGraphDebug] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get floor ID from floor name
    const getFloorId = () => {
        const idMap: Record<string, number> = {
            'basement': 1,
            'ground': 2,
            'first': 3,
            'second': 4,
            '-1': 1,
            '0': 2,
            '1': 3,
            '2': 4,
        };
        return idMap[floorName.toLowerCase()] || 3;
    };

    // Convert route locations to vertex IDs
    const getRouteVertexPath = (): number[] | null => {
        if (!route || !route.path.length) return null;
        // Map location IDs to vertex IDs (they match currently)
        return route.path.map(loc => loc.id);
    };

    // Convert user position if provided
    const getUserPositionForGraph = () => {
        if (!userPosition) return null;
        return {
            cx: userPosition.x,
            cy: userPosition.y
        };
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
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-wrap">
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
                >
                    Reset View
                </button>
                <button
                    onClick={() => setShowGraphDebug(!showGraphDebug)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm ${
                        showGraphDebug 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                >
                    {showGraphDebug ? '🔧' : '○'} Nodes
                </button>
                <div className="text-sm text-gray-600 font-medium flex-1">
                    {route ? `Route: ${route.distance.toFixed(1)}m • ${getRouteVertexPath()?.length ?? 0} steps` : 'Select locations to navigate'}
                </div>
                {userPosition && (
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
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
                className="relative w-full bg-gray-900 border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg"
                style={{ height: '700px' }}
            >
                <FloorPlanWithGraph
                    floorId={getFloorId()}
                    floorPlanPath={`/Floor Plans/${getSvgFileName()}`}
                    viewBox="0 0 765.12 540.16"
                    currentRoutePath={getRouteVertexPath()}
                    userPosition={getUserPositionForGraph()}
                    highlightedVertexId={selectedEnd?.id || null}
                    onVertexClick={(vertexId, vertexName) => {
                        // Find the location and call the original callback
                        const location = locations.find(l => l.id === vertexId);
                        if (location) onLocationClick?.(location);
                    }}
                    showGraphOverlay={showGraphDebug}
                    showLabels={showGraphDebug}
                    animateRoute={true}
                />
            </div>

            {/* Footer Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm flex items-start gap-3">
                <div>
                    <span className="font-semibold text-blue-900">💡 Tip:</span>
                    <span className="text-blue-800 ml-1">
                        Your route is highlighted with an animated dashed line. 
                        Click the "Nodes" button to see location markers for debugging.
                    </span>
                </div>
            </div>
        </div>
    );
}
