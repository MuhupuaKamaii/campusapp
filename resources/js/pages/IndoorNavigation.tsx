/**
 * Indoor Navigation - Wayfinding System
 * 
 * This page provides PathPal-style indoor wayfinding with:
 * - Location search with autocomplete
 * - Shortest path calculation using Dijkstra's algorithm
 * - Visual route display on SVG floor plans
 * - Start/End location selection
 * - Real-time location filtering
 */

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import SimpleFloorPlanViewer from '@/components/SimpleFloorPlanViewer';
import { getFloorGraphData, findPathOnGraph } from '../services/graphData';


// Breadcrumb navigation
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

// Floor configuration with IDs
interface FloorConfig {
    id: number;
    name: string;
    file: string;
}

const FLOORS: FloorConfig[] = [
    { id: 1, name: 'Basement Floor', file: 'Basement 1.5.svg' },
    { id: 2, name: 'Ground Floor', file: 'Ground 1.5.svg' },
    { id: 3, name: 'First Floor', file: 'First 1.5.svg' },
    { id: 4, name: 'Second Floor', file: 'Second 1.5.svg' },
];

// Floor ID mapping
const FLOOR_MAP: Record<number, number> = {
    0: 1, // Basement
    1: 2, // Ground
    2: 3, // First
    3: 4, // Second
};

interface Location {
    id: number;
    name: string;
    type: string;
    x_coordinate: number;
    y_coordinate: number;
}

interface Route {
    path: Location[];
    distance: number;
    waypoints: Array<{ x: number; y: number }>;
}

export default function IndoorNavigationPage() {
    const [selectedFloorIndex] = useState(2); // First Floor by default
    const selectedFloor = FLOORS[selectedFloorIndex];
    const floorId = FLOOR_MAP[selectedFloorIndex];

    // Load graph data for the selected floor (client-side, no API needed)
    const graphData = useMemo(() => {
        try { return getFloorGraphData(floorId); } catch { return null; }
    }, [floorId]);

    // Named locations derived from graph vertices (exclude walkway junction nodes)
    const locations = useMemo<Location[]>(() => {
        if (!graphData) return [];
        return graphData.vertices
            .filter(v => v.type !== 'walkway')
            .map(v => ({ id: v.id, name: v.name, type: v.type, x_coordinate: v.cx, y_coordinate: v.cy }));
    }, [graphData]);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    const [startLocation, setStartLocation] = useState<Location | null>(null);
    const [endLocation, setEndLocation] = useState<Location | null>(null);
    const [route, setRoute] = useState<Route | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [userPosition, setUserPosition] = useState<{ x: number; y: number; accuracy: number } | null>(null);
    const [pickingStart, setPickingStart] = useState(false);


    const filteredLocations = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return locations.filter(loc => loc.name.toLowerCase().includes(q));
    }, [searchQuery, locations]);

    // Core pathfinding — runs immediately with given start/end
    const runRoute = (from: Location, to: Location) => {
        if (!graphData) { setRouteError('No map data available for this floor'); return; }
        if (from.id === to.id) { setRouteError('Start and destination are the same'); return; }

        const { nodeIds, distance } = findPathOnGraph(graphData, from.id, to.id);
        if (nodeIds.length === 0) {
            setRouteError('No route found between these locations');
            setRoute(null);
            return;
        }

        const waypoints = nodeIds
            .map(id => graphData.vertices.find(v => v.id === id))
            .filter(Boolean)
            .map(v => ({ x: v!.cx, y: v!.cy }));

        const pathLocations = nodeIds
            .map(id => locations.find(l => l.id === id))
            .filter(Boolean) as Location[];

        setRoute({ path: pathLocations, distance, waypoints });
        setRouteError(null);
    };

    // Searching navigates TO the selected location — auto-picks start if not set
    const selectDestinationFromSearch = (destination: Location) => {
        setSearchQuery('');
        setShowSearchResults(false);
        setEndLocation(destination);

        const origin = startLocation ?? locations[0] ?? null;
        if (!origin) { setRouteError('No start location available'); return; }
        if (!startLocation) setStartLocation(origin);

        runRoute(origin, destination);
    };

    const selectLocationAsEnd = (location: Location) => {
        setEndLocation(location);
        const origin = startLocation ?? locations[0] ?? null;
        if (origin) runRoute(origin, location);
    };

    const findMyLocation = () => {
        setPickingStart(true);
        setRouteError(null);
    };

    const handleStartPicked = (location: Location) => {
        setPickingStart(false);
        setStartLocation(location);
        setUserPosition({ x: location.x_coordinate, y: location.y_coordinate, accuracy: 30 });
        if (endLocation) runRoute(location, endLocation);
    };

    const calculateRoute = () => {
        if (!startLocation || !endLocation) { setRouteError('Please select both locations'); return; }
        runRoute(startLocation, endLocation);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Indoor Navigation" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-visible rounded-xl p-4">
                {/* Main Container - Vertical Layout */}
                <div className="flex flex-col gap-4">
                    {/* Top Row - Search + My Location */}
                    <div className="flex items-center gap-2 max-w-sm">
                        {/* Search Box */}
                        <div className="relative flex-1">
                            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {showSearchResults && filteredLocations.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
                                        <p className="text-xs text-gray-500">{filteredLocations.length} result{filteredLocations.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    {filteredLocations.map((location) => (
                                        <button
                                            key={location.id}
                                            onClick={() => selectDestinationFromSearch(location)}
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0 transition"
                                        >
                                            <div className="font-medium text-gray-900">{location.name}</div>
                                            <div className="text-xs text-gray-400">{location.type}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showSearchResults && searchQuery && filteredLocations.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 text-xs text-gray-500">
                                    No locations found
                                </div>
                            )}
                        </div>

                        {/* My Location Button — square icon */}
                        <button
                            onClick={findMyLocation}
                            className={`h-9 w-9 flex-shrink-0 text-white rounded-lg flex items-center justify-center shadow transition ${pickingStart ? 'bg-orange-500 hover:bg-orange-600 animate-pulse' : 'bg-green-500 hover:bg-green-600'}`}
                            title={pickingStart ? 'Click a location on the map…' : 'Set My Location'}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Compact route strip */}
                    {(startLocation || endLocation || route || routeError) && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Start chip */}
                            {startLocation && (
                                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-sm">
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">From</span>
                                    <span className="font-medium text-gray-800">{startLocation.name}</span>
                                    <button onClick={() => { setStartLocation(null); setRoute(null); }} className="text-gray-400 hover:text-gray-600 ml-1">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {startLocation && endLocation && (
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            )}

                            {/* End chip */}
                            {endLocation && (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-sm">
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">To</span>
                                    <span className="font-medium text-gray-800">{endLocation.name}</span>
                                    <button onClick={() => { setEndLocation(null); setRoute(null); }} className="text-gray-400 hover:text-gray-600 ml-1">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* Route distance badge */}
                            {route && (
                                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm ml-auto">
                                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <span className="font-semibold text-blue-700">{route.distance.toFixed(1)} m</span>
                                </div>
                            )}

                            {/* Error */}
                            {routeError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{routeError}</div>
                            )}
                        </div>
                    )}

                    {/* Location picker lists */}
                    {(!startLocation || !endLocation) && (
                        <div className="flex gap-3">
                            {/* Pick start */}
                            {!startLocation && (
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">Select Start</div>
                                    <div className="max-h-36 overflow-y-auto divide-y divide-gray-100">
                                        {locations.map(loc => (
                                            <button key={loc.id} onClick={() => { setStartLocation(loc); if (endLocation) runRoute(loc, endLocation); }}
                                                className="w-full text-left px-3 py-2 hover:bg-green-50 transition">
                                                <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                                                <div className="text-xs text-gray-400">{loc.type}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Pick end */}
                            {!endLocation && (
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">Select Destination</div>
                                    <div className="max-h-36 overflow-y-auto divide-y divide-gray-100">
                                        {locations.filter(loc => loc.id !== startLocation?.id).map(loc => (
                                            <button key={loc.id} onClick={() => selectLocationAsEnd(loc)}
                                                className="w-full text-left px-3 py-2 hover:bg-red-50 transition">
                                                <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                                                <div className="text-xs text-gray-400">{loc.type}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Section - Floor Plan Full Width */}
                    {pickingStart && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>Click any location on the map to set as your starting point</span>
                            <button onClick={() => setPickingStart(false)} className="ml-auto text-orange-500 hover:text-orange-700 font-medium">Cancel</button>
                        </div>
                    )}
                    <div className="w-full">
                        <div className="rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border h-full min-h-96">
                            <SimpleFloorPlanViewer
                                floorName={selectedFloor.name}
                                buildingName="Library"
                                route={route}
                                locations={locations}
                                selectedStart={startLocation}
                                selectedEnd={endLocation}
                                userPosition={userPosition}
                                pickingStart={pickingStart}
                                onStartPicked={handleStartPicked}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

