/**
 * Indoor Navigation - WiFi-Based Positioning Page
 * 
 * This page provides WiFi-based indoor positioning and navigation:
 * - Real-time position tracking using WiFi RSSI triangulation
 * - WiFi access point management (CRUD operations)
 * - Calibration mode for signal fingerprinting
 * - Wi-Fi signal strength visualization
 */

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition, applyKalmanFilter } from '@/utils/wifiTriangulation';

// Breadcrumb navigation
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

/**
 * Building information - basic building data with coordinates
 */
interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

/**
 * Floor data - represents a single floor within a building
 */
interface Floor {
    id: number;
    building_id: number;  // Parent building
    level: number;        // Floor number (-1 = basement, 0 = ground, 1 = first, etc.)
    width: number;        // Floor plan width in pixels
    height: number;       // Floor plan height in pixels
}

/**
 * WiFi Access Point - represents a real physical access point location
 */
interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;                // Network name
    bssid: string;               // MAC address (unique identifier)
    x_coordinate: number;        // Position on floor plan
    y_coordinate: number;
    tx_power: number;            // Transmission power in dBm at 1 meter
    notes?: string;              // Optional notes
}

/**
 * WiFi Signal Reading - records RSSI measurement at a known location (for calibration)
 */
interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;        // Calibration point location
    y_coordinate: number;
    rssi: number;                // Signal strength in dBm
    measured_at: string;         // Timestamp
}

/**
 * User Position - calculated from WiFi trilateration
 */
interface UserPosition {
    x: number;                   // Estimated X coordinate
    y: number;                   // Estimated Y coordinate
    accuracy: number;            // Error radius in meters
    timestamp: string;           // ISO timestamp of calculation
}

export default function IndoorNavigationPage() {
    // Main state
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

    // Wi-Fi state
    const [accessPoints, setAccessPoints] = useState<WifiAccessPoint[]>([]);
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
    const [wifiSignals, setWifiSignals] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [calibrationMode, setCalibrationMode] = useState(false);
    const [calibrationLocation, setCalibrationLocation] = useState<{ x: number; y: number } | null>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'map' | 'aps' | 'calibrate'>('map');
    const [scanInterval, setScanInterval] = useState(2000); // ms
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Reference to previous position for Kalman filtering (smooth tracking)
    const previousPositionRef = useRef<UserPosition | null>(null);

    /**
     * Initialize: Load buildings on component mount
     */
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    // Pre-select Library if available, otherwise first building
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    /**
     * Load floors when building is selected
     */
    useEffect(() => {
        if (!selectedBuilding) return;

        setLoading(true);
        fetch(`/api/building/${selectedBuilding}/floors`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setFloors(data);
                    setSelectedFloor(data[0].id);
                }
            })
            .catch(err => console.error('Failed to load floors:', err))
            .finally(() => setLoading(false));

        // Clear position when building changes
        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    /**
     * Load Wi-Fi access points when floor is selected
     */
    useEffect(() => {
        if (!selectedFloor) return;

        setLoading(true);
        fetch(`/api/floor/${selectedFloor}/wifi-access-points`)
            .then(res => res.json())
            .then(data => {
                setAccessPoints(data || []);
            })
            .catch(err => console.error('Failed to load access points:', err))
            .finally(() => setLoading(false));

        // Clear position when floor changes
        setUserPosition(null);
    }, [selectedFloor]);

    /**
     * Start WiFi scanning for position calculation
     * Scans for available WiFi networks at specified interval
     */
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        // Create periodic scan interval
        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get WiFi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position from RSSI measurements if we have enough data
                if (networks.length > 0 && accessPoints.length > 0) {
                    let position = calculatePosition(networks, accessPoints);
                    
                    if (position) {
                        // Apply Kalman filter for smoother tracking
                        position = applyKalmanFilter(previousPositionRef.current, position);
                        previousPositionRef.current = position;
                        
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                        
                        // Optionally log position to server for analytics
                        if (selectedFloor) {
                            logPositionToServer(position);
                        }
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    /**
     * Stop WiFi scanning
     */
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    /**
     * Get visible WiFi networks from device or API
     * This would integrate with native WiFi scanning capabilities
     */
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // Call backend API to scan for networks
            // In production, this would have device-specific implementation
            const response = await fetch('/api/scan-wifi-networks', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            
            if (!response.ok) {
                throw new Error('Failed to scan networks');
            }

            return await response.json();
        } catch (error) {
            console.warn('Wi-Fi scan not available:', error);
            return [];
        }
    };

    /**
     * Log calculated position to server for analytics
     * Optional: Saves position data for tracking and validation
     */
    const logPositionToServer = async (position: UserPosition) => {
        try {
            // Don't log too frequently to avoid overwhelming the server
            // Only log every few position updates
            if (Math.random() > 0.2) return; // Log 20% of positions

            await fetch('/api/user-position', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    floor_id: selectedFloor,
                    x_coordinate: position.x,
                    y_coordinate: position.y,
                    accuracy: position.accuracy,
                    signal_count: wifiSignals.length,
                }),
            });
        } catch (error) {
            // Silently fail - don't interrupt positioning if logging fails
            console.debug('Position logging failed:', error);
        }
    };

    /**
     * Enter calibration mode for WiFi signal fingerprinting
     * Users record signal strengths at known locations to improve accuracy
     */
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    /**
     * Record a WiFi signal fingerprint at a specific location
     * Saves the RSSI values from all detected APs at this point
     */
    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
            // Send calibration data to backend for storage
            const response = await fetch('/api/floor/calibration-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    floor_id: selectedFloor,
                    x_coordinate: x,
                    y_coordinate: y,
                    // Include all signal strengths from detected APs
                    signals: wifiSignals.map((s: any) => ({
                        bssid: s.bssid,
                        rssi: s.rssi,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save calibration data');
            }

            const result = await response.json();
            console.log(`✅ Calibration point recorded at (${x}, ${y})`);
            alert(`Calibration point saved! Total: ${result.total_points}`);
        } catch (error) {
            console.error('Calibration error:', error);
            alert('Failed to save calibration data');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Exit calibration mode
     */
    const endCalibration = () => {
        setCalibrationMode(false);
        setCalibrationLocation(null);
        console.log('✅ Calibration mode ended');
    };

    /**
     * Handle floor plan click during calibration
     * Records the clicked position for signal measurement
     */
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (calibrationMode) {
            setCalibrationLocation({ x, y });
        }
    };

    const currentFloor = floors.find(f => f.id === selectedFloor);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Indoor Navigation - Wi-Fi Based" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4">
                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border">
                        {/* Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.251a.375.375 0 01-.469.469l-2.08-2.08a.375.375 0 00-.53 0l-2.08 2.08a.375.375 0 01-.469-.469l2.08-2.08a.375.375 0 000-.53l-2.08-2.08a.375.375 0 01.469-.469l2.08 2.08a.375.375 0 00.53 0l2.08-2.08a.375.375 0 01.469.469l-2.08 2.08a.375.375 0 000 .53l2.08 2.08z" />
                                </svg>
                                <h3 className="font-semibold">Wi-Fi Indoor Navigation</h3>
                            </div>
                            {isScanning && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></div>
                                    <span className="text-sm font-medium">Scanning...</span>
                                </div>
                            )}
                        </div>

                        {/* Tab Navigation */}
                        <div className="mb-6 flex gap-2 border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('map')}
                                className={`px-4 py-2 font-medium border-b-2 transition ${
                                    activeTab === 'map'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                📍 Position Map
                            </button>
                            <button
                                onClick={() => setActiveTab('aps')}
                                className={`px-4 py-2 font-medium border-b-2 transition ${
                                    activeTab === 'aps'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                📡 Access Points
                            </button>
                            <button
                                onClick={() => setActiveTab('calibrate')}
                                className={`px-4 py-2 font-medium border-b-2 transition ${
                                    activeTab === 'calibrate'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                🎯 Calibration
                            </button>
                        </div>

                        {/* Building and Floor Selection */}
                        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                                <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-2">
                                    Building
                                </label>
                                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700"> NUST Library (Campus)</span>
                                </div>
                                <input
                                    type="hidden"
                                    id="building"
                                    value={selectedBuilding || ''}
                                />
                            </div>

                            <div>
                                <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
                                    Floor
                                </label>
                                <select
                                    id="floor"
                                    value={selectedFloor || ''}
                                    onChange={(e) => setSelectedFloor(Number(e.target.value))}
                                    disabled={loading || floors.length === 0}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a floor...</option>
                                    {floors.map(floor => (
                                        <option key={floor.id} value={floor.id}>
                                            Floor {floor.level}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* TAB: Position Map */}
                        {activeTab === 'map' && (
                            <>
                                <div className="mb-4 flex gap-2">
                                    {/* Start/Stop Scanning Button */}
                                    <button
                                        onClick={isScanning ? stopWifiScanning : startWifiScanning}
                                        disabled={!selectedFloor}
                                        className={`px-4 py-2 rounded font-medium transition ${
                                            isScanning
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                        } disabled:bg-gray-300`}
                                    >
                                        {isScanning ? '⏹️ Stop Scanning' : '📡 Start Scanning'}
                                    </button>

                                    {/* Scan Interval Selector */}
                                    <select
                                        value={scanInterval}
                                        onChange={(e) => setScanInterval(Number(e.target.value))}
                                        disabled={isScanning}
                                        title="Lower values = more frequent scans (faster but uses more power)"
                                        className="px-3 py-2 border border-gray-300 rounded text-sm font-medium"
                                    >
                                        <option value={1000}>⚡ 1 second (fast)</option>
                                        <option value={2000}>⚙️ 2 seconds (balanced)</option>
                                        <option value={3000}>⏳ 3 seconds (accurate)</option>
                                        <option value={5000}>🔋 5 seconds (battery)</option>
                                    </select>
                                </div>

                                {/* Position Visualization */}
                                <WifiPositioning
                                    userPosition={userPosition}
                                    accessPoints={accessPoints}
                                    wifiSignals={wifiSignals}
                                    floorWidth={currentFloor?.width || 800}
                                    floorHeight={currentFloor?.height || 600}
                                />
                            </>
                        )}

                        {/* TAB: Access Points Management */}
                        {activeTab === 'aps' && (
                            <WifiAPManager
                                floorId={selectedFloor}
                                accessPoints={accessPoints}
                                onAccessPointsChange={setAccessPoints}
                            />
                        )}

                        {/* TAB: Calibration */}
                        {activeTab === 'calibrate' && (
                            <>
                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold text-blue-900 mb-2">Wi-Fi Fingerprinting Calibration</h4>
                                    <p className="text-sm text-blue-700 mb-4">
                                        Click on the map at specific locations and record the Wi-Fi signal strengths. This data helps improve positioning accuracy.
                                    </p>
                                    {!calibrationMode ? (
                                        <button
                                            onClick={startCalibration}
                                            disabled={!selectedFloor}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 font-medium"
                                        >
                                             Start Calibration
                                        </button>
                                    ) : (
                                        <button
                                            onClick={endCalibration}
                                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                                        >
                                            ✓ End Calibration
                                        </button>
                                    )}
                                </div>

                                {calibrationMode && (
                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-700">
                                             Calibration Mode Active - Click on the map to record signal strengths at specific locations
                                        </p>
                                        {calibrationLocation && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => recordCalibrationPoint(calibrationLocation.x, calibrationLocation.y)}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 font-medium text-sm"
                                                >
                                                    💾 Save Point at ({calibrationLocation.x.toFixed(0)}, {calibrationLocation.y.toFixed(0)})
                                                </button>
                                                <button
                                                    onClick={() => setCalibrationLocation(null)}
                                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Calibration Map Display */}
                                <WifiPositioning
                                    userPosition={null}
                                    accessPoints={accessPoints}
                                    wifiSignals={wifiSignals}
                                    floorWidth={currentFloor?.width || 800}
                                    floorHeight={currentFloor?.height || 600}
                                    calibrationMode={calibrationMode}
                                    onMapClick={handleMapClick}
                                    calibrationLocation={calibrationLocation}
                                />
                            </>
                        )}

                        {/* Debug Info - Move to bottom with better visibility */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-8 rounded-lg border border-gray-300 bg-gray-50 p-4">
                                <h4 className="mb-3 font-semibold text-gray-800">🐛 Debug Information</h4>
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                    {/* Column 1: Selection State */}
                                    <div className="rounded bg-white p-3 border border-gray-200">
                                        <p className="text-xs font-bold text-gray-600 mb-2">🏢 Selection</p>
                                        <div className="space-y-1 text-xs font-mono text-gray-700">
                                            <p>building: {selectedBuilding || 'none'}</p>
                                            <p>floor: {selectedFloor || 'none'}</p>
                                        </div>
                                    </div>

                                    {/* Column 2: Data Counts */}
                                    <div className="rounded bg-white p-3 border border-gray-200">
                                        <p className="text-xs font-bold text-gray-600 mb-2">📊 Counts</p>
                                        <div className="space-y-1 text-xs font-mono text-gray-700">
                                            <p>buildings: {buildings.length}</p>
                                            <p>floors: {floors.length}</p>
                                            <p>APs: {accessPoints.length}</p>
                                            <p>signals: {wifiSignals.length}</p>
                                        </div>
                                    </div>

                                    {/* Column 3: Scanning State */}
                                    <div className="rounded bg-white p-3 border border-gray-200">
                                        <p className="text-xs font-bold text-gray-600 mb-2">📡 Scanning</p>
                                        <div className="space-y-1 text-xs font-mono text-gray-700">
                                            <p>active: <span className={isScanning ? 'text-green-600 font-bold' : 'text-red-600'}>{isScanning ? 'YES' : 'NO'}</span></p>
                                            <p>interval: {scanInterval}ms</p>
                                            <p>calibration: <span className={calibrationMode ? 'text-yellow-600 font-bold' : 'text-gray-600'}>{calibrationMode ? 'ON' : 'OFF'}</span></p>
                                        </div>
                                    </div>

                                    {/* Column 4: Position Data */}
                                    <div className="rounded bg-white p-3 border border-gray-200">
                                        <p className="text-xs font-bold text-gray-600 mb-2">📍 Position</p>
                                        <div className="space-y-1 text-xs font-mono text-gray-700">
                                            {userPosition ? (
                                                <>
                                                    <p>x: {userPosition.x.toFixed(1)}px</p>
                                                    <p>y: {userPosition.y.toFixed(1)}px</p>
                                                    <p>acc: ±{userPosition.accuracy.toFixed(2)}m</p>
                                                </>
                                            ) : (
                                                <p className="text-gray-400">no position</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Signal Info */}
                                {wifiSignals.length > 0 && (
                                    <div className="mt-4 rounded bg-white p-3 border border-gray-200">
                                        <p className="text-xs font-bold text-gray-600 mb-2">📶 Detected Signals</p>
                                        <div className="max-h-40 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-100 border-b">
                                                        <th className="text-left px-2 py-1">SSID</th>
                                                        <th className="text-left px-2 py-1">BSSID</th>
                                                        <th className="text-right px-2 py-1">RSSI</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="font-mono">
                                                    {wifiSignals.slice(0, 10).map((signal: any, idx: number) => (
                                                        <tr key={idx} className="border-b hover:bg-gray-50">
                                                            <td className="px-2 py-1 text-gray-700">{signal.ssid || '?'}</td>
                                                            <td className="px-2 py-1 text-gray-600 text-xs">{signal.bssid}</td>
                                                            <td className="text-right px-2 py-1 font-bold text-green-600">{signal.rssi}dBm</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {wifiSignals.length > 10 && (
                                                <p className="text-center text-gray-500 mt-2 text-xs">
                                                    +{wifiSignals.length - 10} more signals...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

