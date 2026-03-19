/**
 * WiFi Triangulation & Positioning Utility
 * 
 * This module provides functions for calculating user position indoors
 * using WiFi access points and RSSI (Received Signal Strength Indicator)
 * measurements via trilateration and Kalman filtering.
 */

/**
 * Represents a WiFi signal measurement
 */
interface WifiSignal {
    bssid: string;           // WiFi access point MAC address
    ssid?: string;           // Network name
    rssi: number;            // Received Signal Strength in dBm (negative value)
}

/**
 * Represents a known WiFi access point location and characteristics
 */
interface WifiAccessPoint {
    id: number;
    bssid: string;           // MAC address (unique identifier)
    x_coordinate: number;    // X position on floor plan
    y_coordinate: number;    // Y position on floor plan
    tx_power: number;        // Transmission power at 1 meter in dBm
}

/**
 * Represents estimated user position with accuracy
 */
interface Position {
    x: number;               // X coordinate
    y: number;               // Y coordinate
    accuracy: number;        // Estimated error radius in meters
    timestamp: string;       // ISO timestamp of calculation
}

/**
 * Convert RSSI (received signal strength) to distance using Free Space Path Loss Model
 * 
 * Formula: RSSI = TX_Power - 20*log10(distance) - 20*log10(freq_ghz) - 32.45
 * Rearranged: distance = 10^((TX_Power - RSSI - 20*log10(freq_ghz) - 32.45) / 20)
 * 
 * @param rssi - Received signal strength in dBm (negative number)
 * @param txPower - Transmission power at 1 meter in dBm
 * @param freqGhz - Operating frequency in GHz (default 2.4 GHz for WiFi)
 * @returns Estimated distance in meters
 */
export function rssiToDistance(rssi: number, txPower: number, freqGhz: number = 2.4): number {
    // Calculate path loss in dB
    const pathLoss = txPower - rssi;
    
    // Apply free space model to convert path loss to distance
    const distance = Math.pow(10, (pathLoss - 20 * Math.log10(freqGhz) - 32.45) / 20);
    
    // Enforce minimum distance of 0.5 meters to avoid division errors
    return Math.max(distance, 0.5);
}

/**
 * Trilateration: Calculate position from 3+ distance measurements using weighted least squares
 * 
 * This algorithm:
 * 1. Takes distance measurements from known anchor points (WiFi APs)
 * 2. Uses weighted least squares to find the point minimizing measurement errors
 * 3. Weights are inversely proportional to distance (closer points trusted more)
 * 4. Calculates accuracy as average error between calculated and measured distances
 * 
 * @param points - Array of anchor points with known (x,y) and measured distance
 * @returns Calculated position with accuracy estimate, or null if insufficient data
 */
export function trilaterate(
    points: Array<{ x: number; y: number; distance: number }>
): { x: number; y: number; accuracy: number } | null {
    // Need at least 3 anchor points for trilateration
    if (points.length < 3) {
        console.warn('⚠️ Trilateration requires at least 3 points');
        return null;
    }

    // Weighted least squares approach: closer APs have more influence
    let sumWeightedX = 0;
    let sumWeightedY = 0;
    let sumWeights = 0;

    // Weight is inverse of distance: closer = higher weight
    for (const point of points) {
        const weight = 1 / (point.distance || 1);
        sumWeightedX += point.x * weight;
        sumWeightedY += point.y * weight;
        sumWeights += weight;
    }

    // Calculate weighted average position
    const estimatedX = sumWeightedX / sumWeights;
    const estimatedY = sumWeightedY / sumWeights;

    // Calculate accuracy as Root Mean Square Error
    let totalError = 0;
    for (const point of points) {
        const dx = estimatedX - point.x;
        const dy = estimatedY - point.y;
        // Calculate distance from estimated position to this anchor point
        const calculatedDistance = Math.sqrt(dx * dx + dy * dy);
        // Measure error between calculated and measured distance
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
 * Calculate current user position from WiFi signal measurements
 * 
 * Process:
 * 1. Match detected WiFi signals to known access points (by BSSID)
 * 2. Convert RSSI to distance for each matched signal
 * 3. Use trilateration to calculate position from 3+ signals
 * 4. Return position with confidence estimate
 * 
 * @param signals - WiFi signals currently detected by device
 * @param accessPoints - Known WiFi access point locations on this floor
 * @returns Calculated position with timestamp, or null if positioning failed
 */
export function calculatePosition(
    signals: WifiSignal[],
    accessPoints: WifiAccessPoint[],
): Position | null {
    // Require both signal measurements and known access points
    if (signals.length === 0 || accessPoints.length === 0) {
        return null;
    }

    // Match detected signals to known access points and convert to distances
    const matchedSignals: Array<{ x: number; y: number; distance: number }> = [];

    for (const signal of signals) {
        // Find access point matching this signal's BSSID
        const ap = accessPoints.find(a => a.bssid === signal.bssid);
        if (!ap) continue; // Skip unknown access points

        // Convert RSSI to distance estimate
        const distance = rssiToDistance(signal.rssi, ap.tx_power);
        matchedSignals.push({
            x: ap.x_coordinate,
            y: ap.y_coordinate,
            distance,
        });
    }

    // Cannot triangulate with fewer than 3 anchor points
    if (matchedSignals.length < 3) {
        console.warn(`⚠️ Only ${matchedSignals.length} matching access points found (need 3+)`);
        return null;
    }

    // Calculate position using trilateration
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
 * Kalman Filter: Smooth position estimates for less jittery movement
 * 
 * The Kalman filter combines:
 * 1. Previous position estimate (prediction)
 * 2. New measurement (observation)
 * 3. Uncertainty estimates (process & measurement noise)
 * 
 * Result: Smoother position tracks and reduced noise
 * 
 * @param previousPosition - Last calculated position (may be null on first call)
 * @param newPosition - Latest position measurement
 * @param processNoise - How much we expect position to change (0-1, lower = smoother)
 * @param measurementNoise - How much we trust measurements (lower = more trust)
 * @returns Filtered position estimate
 */
export function applyKalmanFilter(
    previousPosition: Position | null,
    newPosition: Position,
    processNoise: number = 0.5,
    measurementNoise: number = 2.0,
): Position {
    // On first call, return the new position as-is
    if (!previousPosition) {
        return newPosition;
    }

    /**
     * Helper: Apply 1D Kalman filter to a single axis
     * Combines prediction and measurement weighted by uncertainty
     */
    const kalmanAxis = (prev: number, curr: number, prevAccuracy: number): number => {
        // Prediction: expected position variance increases over time
        const predictedAccuracy = prevAccuracy + processNoise;
        
        // Kalman Gain: how much to trust new measurement vs prediction
        // High gain → trust measurement more
        // Low gain → trust prediction more
        const kalmanGain = predictedAccuracy / (predictedAccuracy + measurementNoise);
        
        // Update: blend previous estimate with new measurement
        return prev + kalmanGain * (curr - prev);
    };

    return {
        x: kalmanAxis(previousPosition.x, newPosition.x, previousPosition.accuracy),
        y: kalmanAxis(previousPosition.y, newPosition.y, previousPosition.accuracy),
        // New accuracy is geometric mean of old and new
        accuracy: Math.sqrt(previousPosition.accuracy * newPosition.accuracy),
        timestamp: newPosition.timestamp,
    };
}
