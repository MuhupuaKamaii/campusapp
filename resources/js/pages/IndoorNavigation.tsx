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
import { getTransitions } from '../services/floorTransitions';


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
    floorId: number;
}

interface Route {
    path: Location[];
    distance: number;
    waypoints: Array<{ x: number; y: number }>;
}

interface CrossFloorLeg {
    waypoints: { x: number; y: number }[];
    distance: number;
    floorId: number;
}

interface CrossFloorTransition {
    name: string;
    type: 'lift' | 'stairs';
    fromFloor: number;
    toFloor: number;
}

interface CrossFloorRoute {
    legs: CrossFloorLeg[];              // one per floor visited
    transitions: CrossFloorTransition[]; // transitions[i] links legs[i] → legs[i+1]
    totalDistance: number;
}

export default function IndoorNavigationPage() {
    const [selectedFloorIndex, setSelectedFloorIndex] = useState(2); // First Floor by default
    const selectedFloor = FLOORS[selectedFloorIndex];
    const floorId = FLOOR_MAP[selectedFloorIndex];

    const handleFloorChange = (index: number) => {
        setSelectedFloorIndex(index);
        // Cross-floor route is active — just switch the view, keep all route state intact
        if (crossFloorRoute) return;
        // No cross-floor route: reset destination so user can pick one on the new floor,
        // but preserve start location so they don't have to re-select it
        if (!startLocation) {
            setUserPosition(null);
            setPickingStart(false);
        }
        setEndLocation(null);
        setRoute(null);
        setRouteError(null);
    };

    // Load graph data for the selected floor (client-side, no API needed)
    const graphData = useMemo(() => {
        try { return getFloorGraphData(floorId); } catch { return null; }
    }, [floorId]);

    // Named locations derived from graph vertices (exclude walkway junction nodes)
    const locations = useMemo<Location[]>(() => {
        if (!graphData) return [];
        return graphData.vertices
            .filter(v => v.type !== 'walkway' && v.type !== 'exit')
            .map(v => ({ id: v.id, name: v.name, type: v.type, x_coordinate: v.cx, y_coordinate: v.cy, floorId: v.floor_id }));
    }, [graphData]);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    const [startLocation, setStartLocation] = useState<Location | null>(null);
    const [endLocation, setEndLocation] = useState<Location | null>(null);
    const [route, setRoute] = useState<Route | null>(null);
    const [crossFloorRoute, setCrossFloorRoute] = useState<CrossFloorRoute | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [userPosition, setUserPosition] = useState<{ x: number; y: number; accuracy: number } | null>(null);
    const [pickingStart, setPickingStart] = useState(false);


    const filteredLocations = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return locations.filter(loc => loc.name.toLowerCase().includes(q));
    }, [searchQuery, locations]);

    // Steps for the route instruction card
    type RouteStep =
        | { type: 'start' | 'arrive'; label: string; floorId: number; dist: null }
        | { type: 'walk';   label: string; floorId: number; dist: number }
        | { type: 'lift' | 'stairs'; label: string; floorId: number; toFloorId: number; dist: null };

    const routeSteps = useMemo((): RouteStep[] => {
        if (route && startLocation && endLocation) {
            return [
                { type: 'start',  label: startLocation.name, floorId: startLocation.floorId, dist: null },
                { type: 'walk',   label: 'Walk',             floorId: startLocation.floorId, dist: route.distance },
                { type: 'arrive', label: endLocation.name,   floorId: endLocation.floorId,   dist: null },
            ];
        }
        if (crossFloorRoute && startLocation && endLocation) {
            const steps: RouteStep[] = [];
            steps.push({ type: 'start', label: startLocation.name, floorId: startLocation.floorId, dist: null });
            crossFloorRoute.legs.forEach((leg, i) => {
                steps.push({ type: 'walk', label: 'Walk', floorId: leg.floorId, dist: leg.distance });
                if (i < crossFloorRoute.transitions.length) {
                    const tr = crossFloorRoute.transitions[i];
                    steps.push({ type: tr.type, label: `Take ${tr.name}`, floorId: tr.fromFloor, toFloorId: tr.toFloor, dist: null });
                }
            });
            steps.push({ type: 'arrive', label: endLocation.name, floorId: endLocation.floorId, dist: null });
            return steps;
        }
        return [];
    }, [route, crossFloorRoute, startLocation, endLocation]);

    // Floors that have graph data (used for 2-hop routing)
    const GRAPH_FLOOR_IDS = [1, 3, 4];

    // Build waypoints array from a path result + graph
    const toWaypoints = (nodeIds: number[], graph: ReturnType<typeof getFloorGraphData>) =>
        nodeIds.map(id => graph.vertices.find(v => v.id === id)).filter(Boolean).map(v => ({ x: v!.cx, y: v!.cy }));

    // Cross-floor pathfinding — tries direct transitions first, then 2-hop via intermediate floor
    const runCrossFloorRoute = (from: Location, fromFloorId: number, to: Location, toFloorId: number) => {
        const fromGraph = getFloorGraphData(fromFloorId);
        const toGraph   = getFloorGraphData(toFloorId);

        // ── 1-hop: direct transition ─────────────────────────────────
        const directCandidates = getTransitions(fromFloorId, toFloorId);
        let best1: { trans: ReturnType<typeof getTransitions>[0]; r1: ReturnType<typeof findPathOnGraph>; r2: ReturnType<typeof findPathOnGraph>; total: number } | null = null;

        for (const trans of directCandidates) {
            const r1 = findPathOnGraph(fromGraph, from.id, trans.fromVertexId);
            const r2 = findPathOnGraph(toGraph, trans.toVertexId, to.id);
            if (!r1.nodeIds.length || !r2.nodeIds.length) continue;
            const total = r1.distance + r2.distance;
            if (!best1 || total < best1.total) best1 = { trans, r1, r2, total };
        }

        if (best1) {
            setCrossFloorRoute({
                legs: [
                    { waypoints: toWaypoints(best1.r1.nodeIds, fromGraph), distance: best1.r1.distance, floorId: fromFloorId },
                    { waypoints: toWaypoints(best1.r2.nodeIds, toGraph),   distance: best1.r2.distance, floorId: toFloorId },
                ],
                transitions: [{ name: best1.trans.name, type: best1.trans.type, fromFloor: fromFloorId, toFloor: toFloorId }],
                totalDistance: best1.total,
            });
            setRoute(null); setRouteError(null);
            // Switch view to the start floor so user sees leg 1 first
            const startIdx = Object.entries(FLOOR_MAP).find(([, id]) => id === fromFloorId)?.[0];
            if (startIdx !== undefined) setSelectedFloorIndex(Number(startIdx));
            return;
        }

        // ── 2-hop: route through an intermediate floor ───────────────
        let best2: {
            t1: ReturnType<typeof getTransitions>[0]; t2: ReturnType<typeof getTransitions>[0];
            midFloorId: number;
            r1: ReturnType<typeof findPathOnGraph>; rMid: ReturnType<typeof findPathOnGraph>; r2: ReturnType<typeof findPathOnGraph>;
            total: number;
        } | null = null;

        for (const midFloorId of GRAPH_FLOOR_IDS) {
            if (midFloorId === fromFloorId || midFloorId === toFloorId) continue;
            const toMid   = getTransitions(fromFloorId, midFloorId);
            const fromMid = getTransitions(midFloorId, toFloorId);
            if (!toMid.length || !fromMid.length) continue;

            const midGraph = getFloorGraphData(midFloorId);

            for (const t1 of toMid) {
                for (const t2 of fromMid) {
                    const r1   = findPathOnGraph(fromGraph, from.id, t1.fromVertexId);
                    const rMid = findPathOnGraph(midGraph, t1.toVertexId, t2.fromVertexId);
                    const r2   = findPathOnGraph(toGraph, t2.toVertexId, to.id);
                    if (!r1.nodeIds.length || !rMid.nodeIds.length || !r2.nodeIds.length) continue;
                    const total = r1.distance + rMid.distance + r2.distance;
                    if (!best2 || total < best2.total) best2 = { t1, t2, midFloorId, r1, rMid, r2, total };
                }
            }
        }

        if (best2) {
            const midGraph = getFloorGraphData(best2.midFloorId);
            setCrossFloorRoute({
                legs: [
                    { waypoints: toWaypoints(best2.r1.nodeIds,   fromGraph), distance: best2.r1.distance,   floorId: fromFloorId },
                    { waypoints: toWaypoints(best2.rMid.nodeIds, midGraph),  distance: best2.rMid.distance,  floorId: best2.midFloorId },
                    { waypoints: toWaypoints(best2.r2.nodeIds,   toGraph),   distance: best2.r2.distance,    floorId: toFloorId },
                ],
                transitions: [
                    { name: best2.t1.name, type: best2.t1.type, fromFloor: fromFloorId,       toFloor: best2.midFloorId },
                    { name: best2.t2.name, type: best2.t2.type, fromFloor: best2.midFloorId,  toFloor: toFloorId },
                ],
                totalDistance: best2.total,
            });
            setRoute(null); setRouteError(null);
            // Switch view to the start floor so user sees leg 1 first
            const startIdx = Object.entries(FLOOR_MAP).find(([, id]) => id === fromFloorId)?.[0];
            if (startIdx !== undefined) setSelectedFloorIndex(Number(startIdx));
            return;
        }

        setRouteError('No route found between these locations');
    };

    // Core pathfinding — runs immediately with given start/end
    const runRoute = (from: Location, to: Location) => {
        if (from.floorId !== to.floorId) {
            runCrossFloorRoute(from, from.floorId, to, to.floorId);
            return;
        }
        const g = graphData;
        if (!g) { setRouteError('No map data available for this floor'); return; }
        if (from.id === to.id) { setRouteError('Start and destination are the same'); return; }

        const { nodeIds, distance } = findPathOnGraph(g, from.id, to.id);
        if (nodeIds.length === 0) {
            setRouteError('No route found between these locations');
            setRoute(null);
            return;
        }

        const waypoints = nodeIds
            .map(id => g.vertices.find(v => v.id === id))
            .filter(Boolean)
            .map(v => ({ x: v!.cx, y: v!.cy }));

        const pathLocations = nodeIds
            .map(id => locations.find(l => l.id === id))
            .filter(Boolean) as Location[];

        setCrossFloorRoute(null);
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
        if (!startLocation && origin) setStartLocation(origin);
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
                    {(startLocation || endLocation || route || crossFloorRoute || routeError) && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Start chip */}
                            {startLocation && (
                                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-sm">
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">From</span>
                                    <span className="font-medium text-gray-800">{startLocation.name}</span>
                                    <span className="text-[10px] text-green-500">({FLOORS.find(f => f.id === startLocation.floorId)?.name.replace(' Floor', '')})</span>
                                    <button onClick={() => { setStartLocation(null); setRoute(null); setCrossFloorRoute(null); }} className="text-gray-400 hover:text-gray-600 ml-1">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {startLocation && endLocation && (
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            )}

                            {/* Cross-floor transition badges — one per transition */}
                            {crossFloorRoute?.transitions.map((tr, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm">
                                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Via</span>
                                        <span className="font-medium text-gray-800">{tr.name}</span>
                                        {crossFloorRoute.legs.length > 2 && i === 0 && (
                                            <span className="text-[10px] text-purple-400">({FLOORS.find(f => f.id === crossFloorRoute.legs[1].floorId)?.name.replace(' Floor', '')})</span>
                                        )}
                                    </span>
                                </span>
                            ))}

                            {/* End chip */}
                            {endLocation && (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-sm">
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">To</span>
                                    <span className="font-medium text-gray-800">{endLocation.name}</span>
                                    <span className="text-[10px] text-red-400">({FLOORS.find(f => f.id === endLocation.floorId)?.name.replace(' Floor', '')})</span>
                                    <button onClick={() => { setEndLocation(null); setRoute(null); setCrossFloorRoute(null); }} className="text-gray-400 hover:text-gray-600 ml-1">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* Route distance badge */}
                            {(route || crossFloorRoute) && (
                                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm ml-auto">
                                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <span className="font-semibold text-blue-700">
                                        {crossFloorRoute ? crossFloorRoute.totalDistance.toFixed(1) : route!.distance.toFixed(1)} m
                                    </span>
                                </div>
                            )}

                            {/* Error */}
                            {routeError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{routeError}</div>
                            )}
                        </div>
                    )}

                    {/* Floor selector tabs */}
                    <div className="flex gap-2">
                        {FLOORS.map((floor, i) => {
                            const hasGraph = FLOOR_MAP[i] !== 2; // Ground Floor has no graph yet
                            return (
                                <button
                                    key={floor.id}
                                    onClick={() => hasGraph && handleFloorChange(i)}
                                    disabled={!hasGraph}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                                        ${selectedFloorIndex === i
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : hasGraph
                                                ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                >
                                    {floor.name.replace(' Floor', '')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Route instruction card */}
                    {routeSteps.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Route Instructions</span>
                                {(route || crossFloorRoute) && (
                                    <span className="text-xs font-bold text-blue-600">
                                        {(crossFloorRoute ? crossFloorRoute.totalDistance : route!.distance).toFixed(0)} m total
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-gray-50">
                                {routeSteps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                        {/* Icon */}
                                        <div className="flex-shrink-0 w-7 flex justify-center">
                                            {step.type === 'start'  && <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white ring-2 ring-green-400" />}
                                            {step.type === 'arrive' && <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white ring-2 ring-red-400" />}
                                            {step.type === 'walk'   && (
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                </svg>
                                            )}
                                            {step.type === 'stairs' && (
                                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h4v-4h4v-4h4v-4h4V3" />
                                                </svg>
                                            )}
                                            {step.type === 'lift' && (
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4 4 4M8 17l4 4 4-4" />
                                                </svg>
                                            )}
                                        </div>
                                        {/* Label */}
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-sm font-medium ${step.type === 'start' ? 'text-green-700' : step.type === 'arrive' ? 'text-red-700' : step.type === 'walk' ? 'text-gray-500' : 'text-purple-700'}`}>
                                                {step.type === 'start' && 'Start at '}
                                                {step.type === 'arrive' && 'Arrive at '}
                                                {step.label}
                                            </span>
                                        </div>
                                        {/* Right badges */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {step.type === 'walk' && step.dist !== null && (
                                                <span className="text-xs text-gray-400 font-medium">{step.dist.toFixed(0)} m</span>
                                            )}
                                            {(step.type === 'start' || step.type === 'arrive' || step.type === 'lift' || step.type === 'stairs') && (
                                                <button
                                                    onClick={() => {
                                                        const targetFloorId = step.type === 'stairs' || step.type === 'lift'
                                                            ? (step as { toFloorId: number }).toFloorId
                                                            : step.floorId;
                                                        const idx = Object.entries(FLOOR_MAP).find(([, id]) => id === targetFloorId)?.[0];
                                                        if (idx !== undefined) setSelectedFloorIndex(Number(idx));
                                                    }}
                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                                >
                                                    {step.type === 'stairs' || step.type === 'lift'
                                                        ? `→ ${FLOORS.find(f => f.id === (step as { toFloorId: number }).toFloorId)?.name.replace(' Floor', '') ?? ''}`
                                                        : FLOORS.find(f => f.id === step.floorId)?.name.replace(' Floor', '') ?? ''
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                route={(() => {
                                    if (!crossFloorRoute) return route;
                                    const leg = crossFloorRoute.legs.find(l => l.floorId === floorId);
                                    return leg ? { path: [], distance: leg.distance, waypoints: leg.waypoints } : null;
                                })()}
                                locations={locations}
                                selectedStart={startLocation?.floorId === floorId ? startLocation : null}
                                selectedEnd={endLocation?.floorId === floorId ? endLocation : null}
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

