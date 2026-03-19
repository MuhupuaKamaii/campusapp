import { useState, useCallback, useEffect } from 'react';
import IndoorMapViewer from './IndoorMapViewer';
import { useWifiPositioning } from './useWifiPositioning';

interface Location {
    id: number;
    name: string;
    type: string;
    x_coordinate: number;
    y_coordinate: number;
    floor_id?: number;
}

interface NavigationContainerProps {
    floorId: number;
    floorPlanFilename: string;
    initialNodes?: Location[];
    paths?: any[];
}

export default function NavigationContainer({
    floorId,
    floorPlanFilename,
    initialNodes = [],
    paths = [],
}: NavigationContainerProps) {
    // Map state
    const [nodes, setNodes] = useState<Location[]>(initialNodes);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
    const [highlightedPath, setHighlightedPath] = useState<number[]>([]);
    
    // WiFi positioning state (managed here)
    const [accessPoints, setAccessPoints] = useState<any[]>([]);
    const [positioningEnabled, setPositioningEnabled] = useState(false);
    const [showWifiOverlay, setShowWifiOverlay] = useState(true);

    // Load access points from API
    useEffect(() => {
        const loadAPs = async () => {
            try {
                const response = await fetch(`/api/floor/${floorId}/wifi-access-points`);
                if (response.ok) {
                    const aps = await response.json();
                    setAccessPoints(aps);
                }
            } catch (error) {
                console.error('Failed to load APs:', error);
                // Fallback for testing
                setAccessPoints([
                    { id: 1, bssid: "aa:bb:cc:dd:ee:01", ssid: "AP-1", x_coordinate: 200, y_coordinate: 200, tx_power: -30 },
                    { id: 2, bssid: "aa:bb:cc:dd:ee:02", ssid: "AP-2", x_coordinate: 600, y_coordinate: 200, tx_power: -30 },
                    { id: 3, bssid: "aa:bb:cc:dd:ee:03", ssid: "AP-3", x_coordinate: 400, y_coordinate: 500, tx_power: -30 },
                ]);
            }
        };
        loadAPs();
    }, [floorId]);

    // Use your existing hook
    const {
        userPosition,
        wifiSignals,
        isScanning,
        error,
        detectedCount,
        startScanning,
        stopScanning
    } = useWifiPositioning({
        accessPoints,
        enabled: positioningEnabled,
        scanIntervalMs: 3000,
        onPositionUpdate: useCallback((pos: { x: number; y: number; accuracy: number; timestamp: string } | null) => {
            console.log('Position:', pos);
            // Optional: Auto-update route based on current position
            if (pos && selectedEnd !== null) {
                // Recalculate path from current position
            }
        }, [selectedEnd]),
    });

    // Navigation logic
    const handleNodeClick = useCallback((nodeId: number, location: Location) => {
        const nodeIndex = nodes.findIndex(n => n.id === nodeId);
        
        if (selectedStart === null) {
            setSelectedStart(nodeIndex);
        } else if (selectedEnd === null && nodeIndex !== selectedStart) {
            setSelectedEnd(nodeIndex);
            // Calculate path here
            // const path = calculatePath(selectedStart, nodeIndex);
            // setHighlightedPath(path);
        } else {
            // Reset selection
            setSelectedStart(nodeIndex);
            setSelectedEnd(null);
            setHighlightedPath([]);
        }
    }, [nodes, selectedStart, selectedEnd]);

    const togglePositioning = () => {
        if (positioningEnabled) {
            stopScanning();
            setPositioningEnabled(false);
        } else {
            setPositioningEnabled(true);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header with Controls */}
            <div className="bg-white border-b p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-xl font-bold text-gray-800">Indoor Navigation</h1>
                    
                    {/* WiFi Positioning Controls */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
                            <span className="text-sm font-medium text-gray-700">WiFi Positioning:</span>
                            
                            <button
                                onClick={togglePositioning}
                                disabled={accessPoints.length < 3}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                    positioningEnabled 
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                } disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                            >
                                {positioningEnabled ? '⏹ Stop' : '▶ Start'}
                            </button>
                            
                            {accessPoints.length < 3 && (
                                <span className="text-xs text-amber-600">Need 3+ APs</span>
                            )}
                            
                            {positioningEnabled && (
                                <button
                                    onClick={() => setShowWifiOverlay(!showWifiOverlay)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                        showWifiOverlay ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {showWifiOverlay ? 'Hide APs' : 'Show APs'}
                                </button>
                            )}
                        </div>

                        {/* Status Display */}
                        {positioningEnabled && (
                            <div className="flex items-center gap-3 text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                {userPosition ? (
                                    <>
                                        <span className="text-blue-800 font-mono">
                                            ({userPosition.x.toFixed(0)}, {userPosition.y.toFixed(0)})
                                        </span>
                                        <span className="text-blue-600">
                                            ±{userPosition.accuracy.toFixed(1)}m
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            ({detectedCount} APs)
                                        </span>
                                    </>
                                ) : error ? (
                                    <span className="text-red-600 text-xs">{error}</span>
                                ) : (
                                    <span className="text-amber-600 text-xs">Acquiring...</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Status */}
                    <div className="text-sm text-gray-600">
                        {!positioningEnabled && selectedStart === null && 'Select start point or enable positioning'}
                        {!positioningEnabled && selectedStart !== null && selectedEnd === null && 'Select destination'}
                        {positioningEnabled && !userPosition && 'Waiting for position fix...'}
                        {positioningEnabled && userPosition && selectedEnd === null && 'Position acquired. Select destination.'}
                        {highlightedPath.length > 0 && 'Route active'}
                    </div>
                </div>
            </div>

            {/* Map Component - Clean separation, just props */}
            <div className="flex-1 p-4 overflow-hidden">
                <IndoorMapViewer
                    floorPlanFilename={floorPlanFilename}
                    floorId={floorId}
                    nodes={nodes}
                    paths={paths}
                    highlightedPath={highlightedPath}
                    onNodeClick={handleNodeClick}
                    selectedStart={selectedStart}
                    selectedEnd={selectedEnd}
                    
                    // WiFi positioning - just data, no logic
                    userPosition={userPosition}
                    wifiSignals={wifiSignals}
                    accessPoints={accessPoints}
                    showWifiOverlay={showWifiOverlay}
                    isPositioning={isScanning}
                    positioningError={error}
                />
            </div>

            {/* Debug Panel (Optional) */}
            {process.env.NODE_ENV === 'development' && positioningEnabled && (
                <div className="bg-gray-900 text-green-400 p-3 font-mono text-xs h-32 overflow-auto border-t">
                    <div className="font-bold mb-1">Debug Log:</div>
                    <div>Scanning: {isScanning ? 'YES' : 'NO'} | APs Configured: {accessPoints.length} | Detected: {detectedCount}</div>
                    {wifiSignals.map((s, i) => (
                        <div key={i} className="ml-2 opacity-75">
                            {s.ssid || s.bssid}: {s.rssi}dBm
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}