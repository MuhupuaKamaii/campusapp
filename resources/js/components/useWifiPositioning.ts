// hooks/useWifiPositioning.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import WifiScanner from './WifiScanner';

export interface WifiAccessPoint {
    id: number;
    x_coordinate: number;
    y_coordinate: number;
    bssid: string;
    ssid: string;
    tx_power: number;
}

export interface WifiSignal {
    bssid: string;
    ssid?: string;
    rssi: number;
    frequency?: number;
}

export interface UserPosition {
    x: number;
    y: number;
    accuracy: number;
    timestamp: string;
}

export interface UseWifiPositioningOptions {
    accessPoints: WifiAccessPoint[];
    enabled: boolean;
    scanIntervalMs?: number;
    onPositionUpdate?: (position: UserPosition | null) => void;
    onError?: (error: string) => void;
}

export interface UseWifiPositioningReturn {
    userPosition: UserPosition | null;
    wifiSignals: WifiSignal[];
    isScanning: boolean;
    error: string | null;
    detectedCount: number;      // Number of APs detected in last scan
    startScanning: () => void;  // Manual start
    stopScanning: () => void;   // Manual stop
}

export function useWifiPositioning({
    accessPoints,
    enabled,
    scanIntervalMs = 3000,
    onPositionUpdate,
    onError
}: UseWifiPositioningOptions): UseWifiPositioningReturn {
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
    const [wifiSignals, setWifiSignals] = useState<WifiSignal[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Convert RSSI to distance using log-distance path loss model
    const rssiToDistance = useCallback((rssi: number, txPower: number): number => {
        const pathLossExponent = 3.0;
        const distance = Math.pow(10, (txPower - rssi) / (10 * pathLossExponent));
        return Math.max(0.5, Math.min(distance, 50));
    }, []);

    // Weighted centroid trilateration
    const calculatePosition = useCallback((signals: WifiSignal[]): UserPosition | null => {
        const measurements = signals
            .map(signal => {
                const ap = accessPoints.find(a => 
                    a.bssid.toLowerCase() === signal.bssid.toLowerCase()
                );
                if (!ap) return null;
                
                const distance = rssiToDistance(signal.rssi, ap.tx_power);
                const weight = Math.pow(1 / Math.max(distance, 0.1), 2);
                
                return { x: ap.x_coordinate, y: ap.y_coordinate, distance, weight };
            })
            .filter((m): m is NonNullable<typeof m> => m !== null);

        if (measurements.length < 3) return null;

        const totalWeight = measurements.reduce((sum, m) => sum + m.weight, 0);
        const x = measurements.reduce((sum, m) => sum + m.x * m.weight, 0) / totalWeight;
        const y = measurements.reduce((sum, m) => sum + m.y * m.weight, 0) / totalWeight;
        
        const avgDist = measurements.reduce((sum, m) => sum + m.distance, 0) / measurements.length;
        const accuracy = (avgDist / Math.sqrt(measurements.length)) * (1 + 1 / measurements.length);

        return { 
            x, 
            y, 
            accuracy: Math.max(accuracy, 1.0), 
            timestamp: new Date().toISOString() 
        };
    }, [accessPoints, rssiToDistance]);

    // Perform single scan
    const performScan = useCallback(async () => {
        try {
            let networks: WifiSignal[] = [];
            
            try {
                const WifiScannerModule = await import('./WifiScanner');
                const result = await WifiScannerModule.default.startScan();
                networks = result.networks || [];
            } catch (pluginError) {
                // Web fallback for development
                if (process.env.NODE_ENV === 'development' && accessPoints.length > 0) {
                    networks = accessPoints.map((ap, i) => ({
                        bssid: ap.bssid,
                        ssid: ap.ssid,
                        rssi: -45 - (i * 8) + Math.random() * 6,
                        frequency: 2412
                    }));
                } else {
                    throw pluginError;
                }
            }
            
            setWifiSignals(networks);
            
            if (accessPoints.length > 0) {
                const position = calculatePosition(networks);
                if (position) {
                    setUserPosition(position);
                    setError(null);
                    onPositionUpdate?.(position);
                } else {
                    const msg = `Need 3+ matching APs (found ${networks.length} networks)`;
                    setError(msg);
                    onError?.(msg);
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Scan failed';
            setError(msg);
            onError?.(msg);
            setUserPosition(null);
            onPositionUpdate?.(null);
        }
    }, [accessPoints, calculatePosition, onPositionUpdate, onError]);

    // Start continuous scanning
    const startScanning = useCallback(() => {
        if (intervalRef.current || accessPoints.length < 3) {
            if (accessPoints.length < 3) {
                const msg = `Need at least 3 APs configured, have ${accessPoints.length}`;
                setError(msg);
                onError?.(msg);
            }
            return;
        }
        
        setIsScanning(true);
        setError(null);
        performScan();
        intervalRef.current = setInterval(performScan, scanIntervalMs);
    }, [accessPoints.length, performScan, scanIntervalMs, onError]);

    // Stop scanning
    const stopScanning = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsScanning(false);
        setUserPosition(null);
        setWifiSignals([]);
        setError(null);
        onPositionUpdate?.(null);
    }, [onPositionUpdate]);

    // Auto-start/stop when enabled changes
    useEffect(() => {
        if (enabled) {
            startScanning();
        } else {
            stopScanning();
        }
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, startScanning, stopScanning]);

    return {
        userPosition,
        wifiSignals,
        isScanning,
        error,
        detectedCount: wifiSignals.length,
        startScanning,
        stopScanning
    };
}