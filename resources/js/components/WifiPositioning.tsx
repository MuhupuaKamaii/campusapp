/**
 * WiFi Positioning Display Component
 * 
 * Renders a visual representation of:
 * - Floor plan canvas
 * - WiFi access point locations
 * - User current position with accuracy radius
 * - WiFi signal strength visualization
 * - Calibration mode for mapping signal patterns
 */

import { useRef, useEffect } from 'react';
import WifiPlugin, { WifiNetwork } from './Plugins/WifiPlugin';
import { Capacitor } from '@capacitor/core';
//import { Wifi } from '@capgo/capacitor-wifi';

/**
 * Interface for WiFi access point data
 */
interface WifiAccessPoint {
    id: number;
    x_coordinate: number;
    y_coordinate: number;
    ssid: string;
    bssid: string;
    tx_power: number;
}

/**
 * Interface for user position
 */
interface UserPosition {
    x: number;
    y: number;
    accuracy: number;
    timestamp: string;
}

/**
 * Interface for detected WiFi signal
 */
interface WifiSignal {
    bssid: string;
    ssid?: string;
    rssi: number;
}

/**
 * Props for WifiPositioning component
 */
interface Props {
    userPosition: UserPosition | null;          // Current calculated position
    accessPoints: WifiAccessPoint[];            // Known AP locations
    wifiSignals: WifiSignal[];                  // Currently detected signals
    floorWidth: number;                         // Floor plan width in pixels
    floorHeight: number;                        // Floor plan height in pixels
    calibrationMode?: boolean;                  // Enable calibration visualization
    onMapClick?: (e: React.MouseEvent<HTMLDivElement>) => void;  // Calibration click handler
    calibrationLocation?: { x: number; y: number } | null;       // Selected calibration point
}

export default function WifiPositioning({
    userPosition,
    accessPoints,
    wifiSignals,
    floorWidth,
    floorHeight,
    calibrationMode = false,
    onMapClick,
    calibrationLocation,
}: Props) {
    // Reference to canvas element
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /**
     * Redraw canvas whenever position, signals, or APs change
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

    // Set canvas size to match floor plan dimensions    
    canvas.width = floorWidth;
    canvas.height = floorHeight;
    // Clear canvas with light gray background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    

      // Draw elements
        drawGrid(ctx, canvas.width, canvas.height);
        drawCoverageRanges(ctx, accessPoints);
        drawAccessPoints(ctx, accessPoints, wifiSignals);

        if (wifiSignals.length > 0) {
            drawSignalStrength(ctx, wifiSignals, accessPoints);
        }

        if (userPosition) {
            drawUserPosition(ctx, userPosition);
        }

        if (calibrationMode && calibrationLocation) {
            drawCalibrationPoint(ctx, calibrationLocation);
        }

    }, [userPosition, accessPoints, wifiSignals, floorWidth, floorHeight, calibrationMode, calibrationLocation]);
    /**
     * Draw background grid for positioning reference
     * Grid shows pixel coordinates on the floor plan for precise positioning
     */
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        const spacing = 50; // Grid spacing in pixels
        const labelSpacing = 100; // Label spacing in pixels (show numbers every 100px to reduce clutter)

        // Vertical lines
        for (let x = 0; x < width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw dimension labels (reduced frequency for clarity)
        ctx.fillStyle = '#999999';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (let x = labelSpacing; x < width; x += labelSpacing) {
            ctx.fillText(x.toString(), x, 2);
        }
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let y = labelSpacing; y < height; y += labelSpacing) {
            ctx.fillText(y.toString(), 2, y);
        }
    };

    /**
     * Draw estimated WiFi coverage range for each access point (theoretical)
     */
    const drawCoverageRanges = (ctx: CanvasRenderingContext2D, aps: WifiAccessPoint[]) => {
        // Typical WiFi range is ~30-50 meters, visualize as ~100-150 pixels
        const estimatedRange = 100;

        for (const ap of aps) {
            // Semi-transparent circle around each AP
            ctx.fillStyle = 'rgba(100, 150, 255, 0.05)';
            ctx.beginPath();
            ctx.arc(ap.x_coordinate, ap.y_coordinate, estimatedRange, 0, Math.PI * 2);
            ctx.fill();

            // Thin circle outline
            ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    /**
     * Draw access point markers on map
     */
    const drawAccessPoints = (
        ctx: CanvasRenderingContext2D,
        aps: WifiAccessPoint[],
        signals: WifiSignal[]
    ) => {
        for (const ap of aps) {
            // Check if this AP is currently detected
            const isDetected = signals.some(s => s.bssid === ap.bssid);

            // Draw circle marker
            ctx.fillStyle = isDetected ? '#00aa00' : '#0066cc';
            ctx.beginPath();
            ctx.arc(ap.x_coordinate, ap.y_coordinate, 8, 0, Math.PI * 2);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw WiFi symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📡', ap.x_coordinate, ap.y_coordinate);

            // Draw SSID label below marker
            ctx.fillStyle = '#333333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(ap.ssid, ap.x_coordinate, ap.y_coordinate + 20);
        }
    };

    /**
     * Visualize detected WiFi signal strengths
     * Stronger signals = larger circles from their APs
     */
    const drawSignalStrength = (
        ctx: CanvasRenderingContext2D,
        signals: WifiSignal[],
        aps: WifiAccessPoint[]
    ) => {
        for (const signal of signals) {
            const ap = aps.find(a => a.bssid === signal.bssid);
            if (!ap) continue;

            // RSSI ranges from -30 (very strong) to -100 (very weak)
            // Normalize to 0-1 range
            const signalStrength = Math.max(0, Math.min(1, (signal.rssi + 100) / 70));

            // Draw signal strength indicator ring (larger = stronger)
            const ringRadius = 20 + signalStrength * 40;
            ctx.strokeStyle = `rgba(0, 200, 0, ${0.3 * signalStrength})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ap.x_coordinate, ap.y_coordinate, ringRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw RSSI value
            ctx.fillStyle = '#00aa00';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${signal.rssi}dBm`, ap.x_coordinate, ap.y_coordinate - 30);
        }
    };

    /**
     * Draw estimated user position with accuracy radius
     */
    const drawUserPosition = (ctx: CanvasRenderingContext2D, position: UserPosition) => {
        // Draw accuracy radius (confidence circle)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
        ctx.beginPath();
        ctx.arc(position.x, position.y, position.accuracy, 0, Math.PI * 2);
        ctx.fill();

        // Draw accuracy circle outline
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw position marker
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(position.x, position.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner white dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(position.x, position.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw position label
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📍', position.x, position.y - 15);
        ctx.font = '9px Arial';
        ctx.fillText(`±${position.accuracy.toFixed(1)}m`, position.x, position.y + 15);
    };

    /**
     * Draw calibration point indicator
     */
    const drawCalibrationPoint = (
        ctx: CanvasRenderingContext2D,
        point: { x: number; y: number }
    ) => {
        // Draw crosshair
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        const size = 15;

        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y);
        ctx.lineTo(point.x + size, point.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x, point.y + size);
        ctx.stroke();

        // Draw circle
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
        ctx.stroke();
    };

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-300">
            {/* LEGEND - This is what you're seeing at the top */}
            <div className="bg-gray-50 border-b border-gray-300 p-4">
                <div className="flex flex-wrap gap-6 items-center justify-start">
                    {/* Legend Item 1 */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-medium text-gray-700">Access Point (inactive)</span>
                    </div>

                    {/* Legend Item 2 */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-gray-700">Access Point (detected)</span>
                    </div>

                    {/* Legend Item 3 */}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-xs font-medium text-gray-700">Your Position</span>
                    </div>

                    {/* Legend Item 4 */}
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-orange-400 bg-transparent"></div>
                        <span className="text-xs font-medium text-gray-700">Accuracy Radius</span>
                    </div>
                </div>
            </div>

            {/* CANVAS - Where the map is drawn */}
            <div className="flex-1 relative overflow-hidden bg-gray-50">
                <canvas
                    ref={canvasRef}
                    onClick={(calibrationMode && onMapClick) ? (e: any) => onMapClick?.(e) : undefined}
                    className={calibrationMode ? 'cursor-crosshair' : 'cursor-default'}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#fafafa',
                    }}
                />
            </div>

            {/* STATS PANEL - Shows signal information */}
            {wifiSignals.length > 0 && (
                <div className="border-t border-gray-300 bg-gray-50 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Signal stats here */}
                    </div>
                </div>
            )}
        </div>
    );
}
