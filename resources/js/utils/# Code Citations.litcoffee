# Code Citations

## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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
                    signals: wifiSignals.
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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
                    signals: wifiSignals.
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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
                    signals: wifiSignals.
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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
                    signals: wifiSignals.
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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

    const endCalibration = () => {
        setCalibrationMode(false);
        setCalibrationLocation(null);
        console.log('✅ Calibration mode ended');
    };

    // Handle map click for calibration or routing
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
                                <select
                                    id="building"
                                    value={selectedBuilding || ''}
                                    onChange={(e) => setSelectedBuilding(Number(e.target.value))}
                                    disabled={loading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a building...</option>
                                    {buildings.map(building => (
                                        <option key={building.id} value={building.id}>
                                            {building.name}
                                        </option>
                                    ))}
                                </select>
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
                                    <select
                                        value={scanInterval}
                                        onChange={(e) => setScanInterval(Number(e.target.value))}
                                        disabled={isScanning}
                                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value={1000}>1 second</option>
                                        <option value={2000}>2 seconds</option>
                                        <option value={5000}>5 seconds</option>
                                    </select>
                                </div>

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
                                            🎯 Start Calibration
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
                                            🎯 Calibration Mode Active - Click on the map to record signal strengths at specific locations
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

                        {/* Debug Info */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-6 p-3 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                                <p>selectedFloor: {selectedFloor}</p>
                                <p>accessPoints.length: {accessPoints.length}</p>
                                <p>wifiSignals.length: {wifiSignals.length}</p>
                                <p>isScanning: {isScanning ? 'true' : 'false'}</p>
                                {userPosition && (
                                    <>
                                        <p>userPosition: ({userPosition.x.toFixed(1)}, {userPosition.y.toFixed(1)})</p>
                                        <p>accuracy: ±{userPosition.accuracy.toFixed(2)}m</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
````

Now create the **Wi-Fi triangulation utility**:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\utils\wifiTriangulation.ts
interface WifiSignal {
    bssid: string;
    ssid?: string;
    rssi: number; // dBm
}

interface WifiAccessPoint {
    id: number;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
}

interface Position {
    x: number;
    y: number;
    accuracy: number;
    timestamp: string;
}

/**
 * Convert RSSI (dBm) to distance using free space path loss model
 * RSSI = TX_Power - 20*log10(distance) - 20*log10(freq_ghz) - 32.45
 */
export function rssiToDistance(rssi: number, txPower: number, freqGhz: number = 2.4): number {
    const pathLoss = txPower - rssi;
    const distance = Math.pow(10, (pathLoss - 20 * Math.log10(freqGhz) - 32.45) / 20);
    return Math.max(distance, 0.5); // Minimum 0.5 meters
}

/**
 * Trilateration: Calculate position from 3+ distance measurements
 */
export function trilaterate(
    points: Array<{ x: number; y: number; distance: number }>
): { x: number; y: number; accuracy: number } | null {
    if (points.length < 3) {
        console.warn('⚠️ Trilateration requires at least 3 points');
        return null;
    }

    // Weighted least squares approach
    let sumWeightedX = 0;
    let sumWeightedY = 0;
    let sumWeights = 0;

    // Points with shorter distances get higher weight
    const maxDistance = Math.max(...points.map(p => p.distance));

    for (const point of points) {
        const weight = 1 / (point.distance || 1);
        sumWeightedX += point.x * weight;
        sumWeightedY += point.y * weight;
        sumWeights += weight;
    }

    const estimatedX = sumWeightedX / sumWeights;
    const estimatedY = sumWeightedY / sumWeights;

    // Calculate accuracy as average error
    let totalError = 0;
    for (const point of points) {
        const dx = estimatedX - point.x;
        const dy = estimatedY - point.y;
        const calculatedDistance = Math.sqrt(dx * dx + dy * dy);
        totalError += Math.abs(calculatedDistance - point.distance);
    }
    const accuracy = totalError / points.length;

    return {
        x: estimatedX,
        y: estimatedY,
        accuracy,
    };
}

/**
 * Calculate position from Wi-Fi signals using RSSI measurements
 */
export function calculatePosition(
    signals: WifiSignal[],
    accessPoints: WifiAccessPoint[],
): Position | null {
    if (signals.length === 0 || accessPoints.length === 0) {
        return null;
    }

    // Match detected signals to known access points
    const matchedSignals: Array<{ x: number; y: number; distance: number }> = [];

    for (const signal of signals) {
        const ap = accessPoints.find(a => a.bssid === signal.bssid);
        if (!ap) continue;

        const distance = rssiToDistance(signal.rssi, ap.tx_power);
        matchedSignals.push({
            x: ap.x_coordinate,
            y: ap.y_coordinate,
            distance,
        });
    }

    if (matchedSignals.length < 3) {
        console.warn(`⚠️ Only ${matchedSignals.length} matching access points found (need 3+)`);
        return null;
    }

    const trilateratedPosition = trilaterate(matchedSignals);
    if (!trilateratedPosition) {
        return null;
    }

    return {
        x: trilateratedPosition.x,
        y: trilateratedPosition.y,
        accuracy: trilateratedPosition.accuracy,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Apply Kalman filter to smooth position estimates
 */
export function applyKalmanFilter(
    previousPosition: Position | null,
    newPosition: Position,
    processNoise: number = 0.5,
    measurementNoise: number = 2.0,
): Position {
    if (!previousPosition) {
        return newPosition;
    }

    // Simple 1D Kalman for each axis
    const kalmanAxis = (prev: number, curr: number, prevAccuracy: number): number => {
        const predictedAccuracy = prevAccuracy + processNoise;
        const kalmanGain = predictedAccuracy / (predictedAccuracy + measurementNoise);
        return prev + kalmanGain * (curr - prev);
    };

    return {
        x: kalmanAxis(previousPosition.x, newPosition.x, previousPosition.accuracy),
        y: kalmanAxis(previousPosition.y, newPosition.y, previousPosition.accuracy),
        accuracy: Math.sqrt(previousPosition.accuracy * newPosition.accuracy),
        timestamp: newPosition.timestamp,
    };
}
````

Now create the **Wi-Fi AP Management component**:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\components\WifiAPManager.tsx
import { useState } from 'react';

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number;
    notes?: string;
}

interface Props {
    floorId: number | null;
    accessPoints: WifiAccessPoint[];
    onAccessPointsChange: (aps: WifiAccessPoint[]) => void;
}

export default function WifiAPManager({ floorId, accessPoints, onAccessPointsChange }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<WifiAccessPoint>>({
        ssid: '',
        bssid: '',
        x_coordinate: 0,
        y_coordinate: 0,
        tx_power: -30,
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const handleAddClick = () => {
        setIsAdding(true);
        setFormData({
            ssid: '',
            bssid: '',
            x_coordinate: 0,
            y_coordinate: 0,
            tx_power: -30,
            notes: '',
        });
    };

    const handleEditClick = (ap: WifiAccessPoint) => {
        setEditingId(ap.id);
        setFormData(ap);
    };

    const handleSave = async () => {
        if (!floorId) {
            alert('Please select a floor first');
            return;
        }

        if (!formData.ssid || !formData.bssid) {
            alert('SSID and BSSID are required');
            return;
        }

        setLoading(true);
        try {
            const endpoint = editingId ? `/api/wifi-ap/${editingId}` : '/api/wifi-ap';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    ...formData,
                    floor_id: floorId,
                
```


## License: unknown
https://github.com/faizzed/weird-salads/blob/e89d23b909086a04243290b0fbb6a191950d35ab/app/javascript/components/common/api.ts

```
I'll help you refactor the component for Wi-Fi-based indoor navigation. Let me break this into steps:

1. **Refactored Component** (remove SVG/nodes/paths)
2. **Wi-Fi AP Management UI**
3. **Positioning/Triangulation Utility**
4. **Database Schema**

Let's start:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\pages\IndoorNavigation.tsx
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import WifiAPManager from '@/components/WifiAPManager';
import WifiPositioning from '@/components/WifiPositioning';
import { calculatePosition } from '@/utils/wifiTriangulation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface Building {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

interface Floor {
    id: number;
    building_id: number;
    level: number;
    width: number;
    height: number;
}

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
    notes?: string;
}

interface WifiSignalReading {
    id: number;
    access_point_id: number;
    x_coordinate: number;
    y_coordinate: number;
    rssi: number; // dBm
    measured_at: string;
}

interface UserPosition {
    x: number;
    y: number;
    accuracy: number; // estimated error radius in meters
    timestamp: string;
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

    // Initialize: Load buildings
    useEffect(() => {
        setLoading(true);
        fetch('/api/buildings')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBuildings(data);
                    const library = data.find((b: Building) => b.name.includes('Library'));
                    setSelectedBuilding(library?.id || data[0].id);
                }
            })
            .catch(err => console.error('Failed to load buildings:', err))
            .finally(() => setLoading(false));
    }, []);

    // Load floors when building is selected
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

        setUserPosition(null);
        setAccessPoints([]);
    }, [selectedBuilding]);

    // Load Wi-Fi access points when floor is selected
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

    // Start Wi-Fi scanning
    const startWifiScanning = () => {
        if (isScanning) return;
        
        setIsScanning(true);
        console.log('📡 Starting Wi-Fi scan...');

        scanIntervalRef.current = setInterval(async () => {
            try {
                // Get Wi-Fi networks visible to device
                const networks = await getVisibleNetworks();
                setWifiSignals(networks);

                // Calculate position based on RSSI readings
                if (networks.length > 0 && accessPoints.length > 0) {
                    const position = calculatePosition(networks, accessPoints);
                    if (position) {
                        setUserPosition(position);
                        console.log(`📍 Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) ±${position.accuracy.toFixed(1)}m`);
                    }
                }
            } catch (error) {
                console.error('Wi-Fi scan error:', error);
            }
        }, scanInterval);
    };

    // Stop Wi-Fi scanning
    const stopWifiScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
        console.log('⏹️ Wi-Fi scan stopped');
    };

    // Get visible Wi-Fi networks (browser API)
    const getVisibleNetworks = async (): Promise<any[]> => {
        try {
            // This would require a browser with WiFi scanning capability
            // For now, return mock data or integrate with device API
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

    // Calibration mode: Record signal strength at known location
    const startCalibration = () => {
        setCalibrationMode(true);
        setUserPosition(null);
        console.log('🎯 Calibration mode started');
    };

    const recordCalibrationPoint = async (x: number, y: number) => {
        if (!selectedFloor || wifiSignals.length === 0) {
            alert('No Wi-Fi signals detected. Move to a location with signal.');
            return;
        }

        setLoading(true);
        try {
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

    const endCalibration = () => {
        setCalibrationMode(false);
        setCalibrationLocation(null);
        console.log('✅ Calibration mode ended');
    };

    // Handle map click for calibration or routing
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
                                <select
                                    id="building"
                                    value={selectedBuilding || ''}
                                    onChange={(e) => setSelectedBuilding(Number(e.target.value))}
                                    disabled={loading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a building...</option>
                                    {buildings.map(building => (
                                        <option key={building.id} value={building.id}>
                                            {building.name}
                                        </option>
                                    ))}
                                </select>
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
                                    <select
                                        value={scanInterval}
                                        onChange={(e) => setScanInterval(Number(e.target.value))}
                                        disabled={isScanning}
                                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value={1000}>1 second</option>
                                        <option value={2000}>2 seconds</option>
                                        <option value={5000}>5 seconds</option>
                                    </select>
                                </div>

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
                                            🎯 Start Calibration
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
                                            🎯 Calibration Mode Active - Click on the map to record signal strengths at specific locations
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

                        {/* Debug Info */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-6 p-3 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                                <p>selectedFloor: {selectedFloor}</p>
                                <p>accessPoints.length: {accessPoints.length}</p>
                                <p>wifiSignals.length: {wifiSignals.length}</p>
                                <p>isScanning: {isScanning ? 'true' : 'false'}</p>
                                {userPosition && (
                                    <>
                                        <p>userPosition: ({userPosition.x.toFixed(1)}, {userPosition.y.toFixed(1)})</p>
                                        <p>accuracy: ±{userPosition.accuracy.toFixed(2)}m</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
````

Now create the **Wi-Fi triangulation utility**:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\utils\wifiTriangulation.ts
interface WifiSignal {
    bssid: string;
    ssid?: string;
    rssi: number; // dBm
}

interface WifiAccessPoint {
    id: number;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number; // dBm at 1 meter
}

interface Position {
    x: number;
    y: number;
    accuracy: number;
    timestamp: string;
}

/**
 * Convert RSSI (dBm) to distance using free space path loss model
 * RSSI = TX_Power - 20*log10(distance) - 20*log10(freq_ghz) - 32.45
 */
export function rssiToDistance(rssi: number, txPower: number, freqGhz: number = 2.4): number {
    const pathLoss = txPower - rssi;
    const distance = Math.pow(10, (pathLoss - 20 * Math.log10(freqGhz) - 32.45) / 20);
    return Math.max(distance, 0.5); // Minimum 0.5 meters
}

/**
 * Trilateration: Calculate position from 3+ distance measurements
 */
export function trilaterate(
    points: Array<{ x: number; y: number; distance: number }>
): { x: number; y: number; accuracy: number } | null {
    if (points.length < 3) {
        console.warn('⚠️ Trilateration requires at least 3 points');
        return null;
    }

    // Weighted least squares approach
    let sumWeightedX = 0;
    let sumWeightedY = 0;
    let sumWeights = 0;

    // Points with shorter distances get higher weight
    const maxDistance = Math.max(...points.map(p => p.distance));

    for (const point of points) {
        const weight = 1 / (point.distance || 1);
        sumWeightedX += point.x * weight;
        sumWeightedY += point.y * weight;
        sumWeights += weight;
    }

    const estimatedX = sumWeightedX / sumWeights;
    const estimatedY = sumWeightedY / sumWeights;

    // Calculate accuracy as average error
    let totalError = 0;
    for (const point of points) {
        const dx = estimatedX - point.x;
        const dy = estimatedY - point.y;
        const calculatedDistance = Math.sqrt(dx * dx + dy * dy);
        totalError += Math.abs(calculatedDistance - point.distance);
    }
    const accuracy = totalError / points.length;

    return {
        x: estimatedX,
        y: estimatedY,
        accuracy,
    };
}

/**
 * Calculate position from Wi-Fi signals using RSSI measurements
 */
export function calculatePosition(
    signals: WifiSignal[],
    accessPoints: WifiAccessPoint[],
): Position | null {
    if (signals.length === 0 || accessPoints.length === 0) {
        return null;
    }

    // Match detected signals to known access points
    const matchedSignals: Array<{ x: number; y: number; distance: number }> = [];

    for (const signal of signals) {
        const ap = accessPoints.find(a => a.bssid === signal.bssid);
        if (!ap) continue;

        const distance = rssiToDistance(signal.rssi, ap.tx_power);
        matchedSignals.push({
            x: ap.x_coordinate,
            y: ap.y_coordinate,
            distance,
        });
    }

    if (matchedSignals.length < 3) {
        console.warn(`⚠️ Only ${matchedSignals.length} matching access points found (need 3+)`);
        return null;
    }

    const trilateratedPosition = trilaterate(matchedSignals);
    if (!trilateratedPosition) {
        return null;
    }

    return {
        x: trilateratedPosition.x,
        y: trilateratedPosition.y,
        accuracy: trilateratedPosition.accuracy,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Apply Kalman filter to smooth position estimates
 */
export function applyKalmanFilter(
    previousPosition: Position | null,
    newPosition: Position,
    processNoise: number = 0.5,
    measurementNoise: number = 2.0,
): Position {
    if (!previousPosition) {
        return newPosition;
    }

    // Simple 1D Kalman for each axis
    const kalmanAxis = (prev: number, curr: number, prevAccuracy: number): number => {
        const predictedAccuracy = prevAccuracy + processNoise;
        const kalmanGain = predictedAccuracy / (predictedAccuracy + measurementNoise);
        return prev + kalmanGain * (curr - prev);
    };

    return {
        x: kalmanAxis(previousPosition.x, newPosition.x, previousPosition.accuracy),
        y: kalmanAxis(previousPosition.y, newPosition.y, previousPosition.accuracy),
        accuracy: Math.sqrt(previousPosition.accuracy * newPosition.accuracy),
        timestamp: newPosition.timestamp,
    };
}
````

Now create the **Wi-Fi AP Management component**:

````typescript
// filepath: c:\laragon\www\campusapp\resources\js\components\WifiAPManager.tsx
import { useState } from 'react';

interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;
    bssid: string;
    x_coordinate: number;
    y_coordinate: number;
    tx_power: number;
    notes?: string;
}

interface Props {
    floorId: number | null;
    accessPoints: WifiAccessPoint[];
    onAccessPointsChange: (aps: WifiAccessPoint[]) => void;
}

export default function WifiAPManager({ floorId, accessPoints, onAccessPointsChange }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<WifiAccessPoint>>({
        ssid: '',
        bssid: '',
        x_coordinate: 0,
        y_coordinate: 0,
        tx_power: -30,
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    const handleAddClick = () => {
        setIsAdding(true);
        setFormData({
            ssid: '',
            bssid: '',
            x_coordinate: 0,
            y_coordinate: 0,
            tx_power: -30,
            notes: '',
        });
    };

    const handleEditClick = (ap: WifiAccessPoint) => {
        setEditingId(ap.id);
        setFormData(ap);
    };

    const handleSave = async () => {
        if (!floorId) {
            alert('Please select a floor first');
            return;
        }

        if (!formData.ssid || !formData.bssid) {
            alert('SSID and BSSID are required');
            return;
        }

        setLoading(true);
        try {
            const endpoint = editingId ? `/api/wifi-ap/${editingId}` : '/api/wifi-ap';
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    ...formData,
                    floor_id: floorId,
                
```

