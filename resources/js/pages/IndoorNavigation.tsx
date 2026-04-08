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
import { useState, useEffect } from 'react';
import SimpleFloorPlanViewer from '@/components/SimpleFloorPlanViewer';

// API Configuration
const API_BASE = 'http://127.0.0.1:8000';

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
    // Floor state
    const [selectedFloorIndex, setSelectedFloorIndex] = useState(2); // First Floor by default
    const selectedFloor = FLOORS[selectedFloorIndex];
    const floorId = FLOOR_MAP[selectedFloorIndex];

    // Location data
    const [locations, setLocations] = useState<Location[]>([]);
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Route state
    const [startLocation, setStartLocation] = useState<Location | null>(null);
    const [endLocation, setEndLocation] = useState<Location | null>(null);
    const [route, setRoute] = useState<Route | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // User position state for displaying on map
    const [userPosition, setUserPosition] = useState<{ x: number; y: number; accuracy: number } | null>(null);

    // Load locations when floor changes
    useEffect(() => {
        const fetchLocations = async () => {
            setLoadingLocations(true);
            try {
                const response = await fetch(`${API_BASE}/api/floor/${floorId}/locations`);
                if (!response.ok) throw new Error('Failed to fetch locations');
                const data = await response.json();
                setLocations(Array.isArray(data.data) ? data.data : []);
                setRoute(null);
                setStartLocation(null);
                setEndLocation(null);
                setSearchQuery('');
                setRouteError(null);
            } catch (error) {
                console.error('Error fetching locations:', error);
                setLocations([]);
            } finally {
                setLoadingLocations(false);
            }
        };

        fetchLocations();
    }, [floorId]);

    // Filter locations based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredLocations([]);
            setShowSearchResults(false);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = locations.filter(loc =>
                loc.name.toLowerCase().includes(query)
            );
            setFilteredLocations(filtered);
            setShowSearchResults(true);
        }
    }, [searchQuery, locations]);

    // Select location from search
    const selectLocationAsStart = (location: Location) => {
        setStartLocation(location);
        setSearchQuery('');
        setShowSearchResults(false);
        setRoute(null);
        setRouteError(null);
    };

    const selectLocationAsEnd = (location: Location) => {
        setEndLocation(location);
    };

    // Try to find user's current location (placeholder for future WiFi integration)
    const findMyLocation = () => {
        if (locations.length === 0) {
            setRouteError('No locations available on this floor');
            return;
        }

        if (!navigator.geolocation) {
            setStartLocation(locations[0]);
            setRouteError(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const locationsWithCoords = locations.filter(loc => loc.x_coordinate && loc.y_coordinate);

                if (locationsWithCoords.length === 0) {
                    setStartLocation(locations[0]);}
                    else{
                        setStartLocation(locations[0]);
                    }
                // In a real implementation, we would use WiFi/BLE signals to determine location
        // For now, set to first location - in future integrate with WiFi positioning
        setStartLocation(locations[0]);
        setSearchQuery('');
        setShowSearchResults(false);
        console.log('GPS coords:', latitude, longitude);
                },
            (error) => {
                console.warn('GPS failed, using first location:', error.message);
                setStartLocation(locations[0]);
                setSearchQuery('');
                setShowSearchResults(false);
                setRouteError(null);
            },
            {timeout: 5000, maximumAge: 60000 }
        );
    };

    // Calculate route
    const calculateRoute = async () => {
        if (!startLocation || !endLocation) {
            setRouteError('Please select both start and end locations');
            return;
        }

        if (startLocation.id === endLocation.id) {
            setRouteError('Start and end locations must be different');
            return;
        }

        setCalculating(true);
        setRouteError(null);

        try {
            const response = await fetch(
                `${API_BASE}/api/path/${startLocation.id}/${endLocation.id}`
            );
            const data = await response.json();

            if (!data.success) {
                setRouteError(data.message || 'Could not calculate route');
                setRoute(null);
            } else {
                setRoute(data.data);
                setRouteError(null);
            }
        } catch (error) {
            setRouteError('Error calculating route');
            setRoute(null);
            console.error('Route calculation error:', error);
        } finally {
            setCalculating(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Indoor Navigation" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-visible rounded-xl p-4">
                {/* Main Container - Vertical Layout */}
                <div className="flex flex-col gap-4">
                    {/* Top Row - Search, Floor, My Location */}
                    <div className="flex gap-4">
                        {/* Search Box - Same Size as Floor */}
                        <div className="flex-1">
                            <div className="rounded-xl border border-gray-300 bg-white p-4 dark:border-sidebar-border h-full">
                                <label className="block text-sm font-semibold text-blue-700 mb-2">
                                    🔍 Search
                                </label>
                                <div className="relative">
                                    <div className="flex items-center gap-2 border-2 border-blue-300 rounded-md px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:border-blue-500">
                                        <svg className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Type location..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 outline-none"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {showSearchResults && filteredLocations.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                                            <div className="p-2 bg-blue-50 border-b border-blue-200 sticky top-0">
                                                <p className="text-xs font-semibold text-blue-700">
                                                    {filteredLocations.length} result{filteredLocations.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            {filteredLocations.map((location) => (
                                                <button
                                                    key={location.id}
                                                    onClick={() => selectLocationAsStart(location)}
                                                    className="w-full text-left px-3 py-2 hover:bg-blue-100 text-sm border-b border-gray-200 last:border-b-0 transition"
                                                >
                                                    <div className="font-medium text-gray-900">{location.name}</div>
                                                    <div className="text-xs text-gray-500">{location.type}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {showSearchResults && searchQuery && filteredLocations.length === 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-yellow-300 rounded-lg shadow-lg p-2 z-50 text-xs">
                                            <p className="text-gray-600">No locations found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Floor Selector */}
                        <div className="flex-1">
                            <div className="rounded-xl border border-gray-300 bg-white p-4 dark:border-sidebar-border h-full">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Floor
                                </label>
                                <select
                                    value={selectedFloorIndex}
                                    onChange={(e) => setSelectedFloorIndex(Number(e.target.value))}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                                >
                                    {FLOORS.map((floor, index) => (
                                        <option key={index} value={index}>
                                            {floor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* My Location Button */}
                        <div className="flex-1">
                            <button
                                onClick={() => {
                                    findMyLocation();
                                    // Set user position at first location
                                    if (locations.length > 0) {
                                        setUserPosition({
                                            x: locations[0].x_coordinate,
                                            y: locations[0].y_coordinate,
                                            accuracy: 30
                                        });
                                    }
                                }}
                                className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-105"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                My Location
                            </button>
                        </div>
                    </div>

                    {/* Start & End Location Cards Row */}
                    <div className="flex gap-4">
                        {/* Start Location Card */}
                        {startLocation && (
                            <div className="flex-1">
                                <div className="rounded-xl border border-green-300 bg-green-50 p-4 h-full">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-green-700 mb-1">START</div>
                                            <div className="font-semibold text-gray-900">{startLocation.name}</div>
                                            <div className="text-xs text-gray-500 mt-1">{startLocation.type}</div>
                                        </div>
                                        <button
                                            onClick={() => setStartLocation(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* End Location Card */}
                        {endLocation && (
                            <div className="flex-1">
                                <div className="rounded-xl border border-red-300 bg-red-50 p-4 h-full">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-red-700 mb-1">END</div>
                                            <div className="font-semibold text-gray-900">{endLocation.name}</div>
                                            <div className="text-xs text-gray-500 mt-1">{endLocation.type}</div>
                                        </div>
                                        <button
                                            onClick={() => setEndLocation(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Middle Section - Location Selection and Route Controls */}
                    <div className="flex gap-4">
                        {/* Location Selection List */}
                        {!startLocation && (
                            <div className="flex-1">
                                <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border h-full">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Select Start Location</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {loadingLocations ? (
                                            <div className="text-center py-4 text-gray-500">Loading locations...</div>
                                        ) : locations.length === 0 ? (
                                            <div className="text-center py-4 text-gray-500 text-sm">No locations available</div>
                                        ) : (
                                            locations.map(loc => (
                                                <button
                                                    key={loc.id}
                                                    onClick={() => selectLocationAsStart(loc)}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition"
                                                >
                                                    <div className="font-medium text-sm text-gray-900">{loc.name}</div>
                                                    <div className="text-xs text-gray-500">{loc.type}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {startLocation && !endLocation && (
                            <div className="flex-1">
                                <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border h-full">
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Select End Location</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {locations
                                            .filter(loc => loc.id !== startLocation.id)
                                            .map(loc => (
                                                <button
                                                    key={loc.id}
                                                    onClick={() => selectLocationAsEnd(loc)}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 border border-gray-200 hover:border-red-300 transition"
                                                >
                                                    <div className="font-medium text-sm text-gray-900">{loc.name}</div>
                                                    <div className="text-xs text-gray-500">{loc.type}</div>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Route and Info Section */}
                        <div className="flex-1">
                            <div className="space-y-4">
                                {/* Calculate Route Button */}
                                {startLocation && endLocation && (
                                    <button
                                        onClick={calculateRoute}
                                        disabled={calculating}
                                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-3 rounded-md font-semibold flex items-center justify-center gap-2"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {calculating ? 'Calculating...' : 'Calculate Route'}
                                    </button>
                                )}

                                {/* Route Information */}
                                {route && (
                                    <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                                        <div className="mb-3">
                                            <div className="text-sm font-semibold text-blue-900 mb-2">Route Information</div>
                                            <div className="text-2xl font-bold text-blue-600">{route.distance.toFixed(1)}m</div>
                                            <div className="text-xs text-blue-700 mt-1">{route.path.length} locations</div>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            {route.path.map((loc, idx) => (
                                                <div key={loc.id} className="text-gray-700">
                                                    {idx + 1}. {loc.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {routeError && (
                                    <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                                        <div className="text-sm font-semibold text-red-900">{routeError}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section - Floor Plan Full Width */}
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
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

