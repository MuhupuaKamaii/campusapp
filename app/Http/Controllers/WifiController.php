<?php

namespace App\Http\Controllers;

use App\Models\WifiAccessPoint;
use App\Models\WifiSignalReading;
use App\Models\WifiUserPosition;
use App\Services\WifiScanningService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * WiFi Controller
 * 
 * Handles WiFi-based indoor positioning operations:
 * - Scanning for available WiFi networks
 * - Managing access point CRUD
 * - Recording calibration data
 * - Tracking user positions
 */
class WifiController extends Controller
{
    /**
     * WiFi scanning service instance
     */
    private WifiScanningService $wifiScanner;

    /**
     * Initialize controller with WiFi scanning service
     */
    public function __construct(WifiScanningService $wifiScanner)
    {
        $this->wifiScanner = $wifiScanner;
    }

    /**
     * Scan for available WiFi networks
     * 
     * Detects visible WiFi networks in the current environment.
     * Returns SSID, BSSID (MAC address), and signal strength (RSSI).
     * 
     * Endpoint: GET /api/scan-wifi-networks
     * 
     * @return JsonResponse Array of networks [['ssid' => '', 'bssid' => '', 'rssi' => int], ...]
     */
    public function scanNetworks(): JsonResponse
    {
        try {
            // Perform actual WiFi scan
            $networks = $this->wifiScanner->scanNetworks();

            return response()->json($networks);
        } catch (\Exception $e) {
            \Log::error('WiFi scan error: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to scan for WiFi networks'],
                500
            );
        }
    }

    /**
     * Get all access points for a specific floor
     * 
     * Retrieves all configured WiFi access points on a given floor.
     * Used to load AP positions for trilateration calculations.
     * 
     * Endpoint: GET /api/floor/{floorId}/wifi-access-points
     * 
     * @param int $floorId Floor ID
     * @return JsonResponse Array of access points
     */
    public function getFloorAccessPoints(int $floorId): JsonResponse
    {
        try {
            $accessPoints = WifiAccessPoint::where('floor_id', $floorId)
                ->orderBy('ssid')
                ->get();

            return response()->json($accessPoints);
        } catch (\Exception $e) {
            \Log::error('Failed to get access points: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to retrieve access points'],
                500
            );
        }
    }

    /**
     * Create a new WiFi access point
     * 
     * Adds a new access point location and characteristics to a floor.
     * 
     * Endpoint: POST /api/wifi-ap
     * 
     * Required fields:
     * - floor_id (int): Floor where AP is located
     * - ssid (string): Network name
     * - bssid (string): MAC address (AA:BB:CC:DD:EE:FF)
     * - x_coordinate (float): X position in pixels
     * - y_coordinate (float): Y position in pixels
     * - tx_power (int): Transmission power in dBm
     * 
     * @param Request $request
     * @return JsonResponse Created access point
     */
    public function createAccessPoint(Request $request): JsonResponse
    {
        try {
            // Validate input
            $validated = $request->validate([
                'floor_id' => 'required|integer|exists:floors,id',
                'ssid' => 'required|string|max:255',
                'bssid' => 'required|string|max:17|regex:/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i|unique:wifi_access_points',
                'x_coordinate' => 'required|numeric',
                'y_coordinate' => 'required|numeric',
                'tx_power' => 'required|integer|between:-100,-10',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Create access point
            $accessPoint = WifiAccessPoint::create($validated);

            return response()->json($accessPoint, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                ['errors' => $e->errors()],
                422
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create access point: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to create access point'],
                500
            );
        }
    }

    /**
     * Update a WiFi access point
     * 
     * Modifies existing access point data (location, power, notes).
     * 
     * Endpoint: PUT /api/wifi-ap/{id}
     * 
     * @param Request $request
     * @param int $id Access point ID
     * @return JsonResponse Updated access point
     */
    public function updateAccessPoint(Request $request, int $id): JsonResponse
    {
        try {
            // Find access point
            $accessPoint = WifiAccessPoint::findOrFail($id);

            // Validate input (all fields optional)
            $validated = $request->validate([
                'ssid' => 'sometimes|string|max:255',
                'bssid' => 'sometimes|string|max:17|regex:/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i|unique:wifi_access_points,bssid,' . $id,
                'x_coordinate' => 'sometimes|numeric',
                'y_coordinate' => 'sometimes|numeric',
                'tx_power' => 'sometimes|integer|between:-100,-10',
                'notes' => 'sometimes|nullable|string|max:1000',
            ]);

            // Update access point
            $accessPoint->update($validated);

            return response()->json($accessPoint);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                ['errors' => $e->errors()],
                422
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(
                ['error' => 'Access point not found'],
                404
            );
        } catch (\Exception $e) {
            \Log::error('Failed to update access point: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to update access point'],
                500
            );
        }
    }

    /**
     * Delete a WiFi access point
     * 
     * Removes an access point and all associated calibration data.
     * 
     * Endpoint: DELETE /api/wifi-ap/{id}
     * 
     * @param int $id Access point ID
     * @return JsonResponse Success message
     */
    public function deleteAccessPoint(int $id): JsonResponse
    {
        try {
            // Find and delete access point
            $accessPoint = WifiAccessPoint::findOrFail($id);
            $floorId = $accessPoint->floor_id;
            $accessPoint->delete();

            return response()->json([
                'message' => 'Access point deleted successfully',
                'floor_id' => $floorId,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(
                ['error' => 'Access point not found'],
                404
            );
        } catch (\Exception $e) {
            \Log::error('Failed to delete access point: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to delete access point'],
                500
            );
        }
    }

    /**
     * Record WiFi signal calibration data at a specific location
     * 
     * Saves RSSI measurements from all detected access points at a known location.
     * Used for fingerprinting and improving positioning accuracy.
     * 
     * Endpoint: POST /api/floor/calibration-data
     * 
     * Required fields:
     * - floor_id (int): Floor where calibration point is
     * - x_coordinate (float): Known X position
     * - y_coordinate (float): Known Y position
     * - signals (array): Array of {bssid, rssi} objects
     * 
     * @param Request $request
     * @return JsonResponse Success response with total points
     */
    public function recordCalibrationData(Request $request): JsonResponse
    {
        try {
            // Validate input
            $validated = $request->validate([
                'floor_id' => 'required|integer|exists:floors,id',
                'x_coordinate' => 'required|numeric',
                'y_coordinate' => 'required|numeric',
                'signals' => 'required|array|min:1',
                'signals.*.bssid' => 'required|string|max:17',
                'signals.*.rssi' => 'required|integer|between:-100,-10',
            ]);

            $recordCount = 0;

            // Record each signal reading
            foreach ($validated['signals'] as $signal) {
                // Find access point by BSSID
                $accessPoint = WifiAccessPoint::where('bssid', $signal['bssid'])
                    ->where('floor_id', $validated['floor_id'])
                    ->first();

                if (!$accessPoint) {
                    // Skip signals from unknown access points
                    continue;
                }

                // Create calibration data
                WifiSignalReading::create([
                    'floor_id' => $validated['floor_id'],
                    'access_point_id' => $accessPoint->id,
                    'x_coordinate' => $validated['x_coordinate'],
                    'y_coordinate' => $validated['y_coordinate'],
                    'rssi' => $signal['rssi'],
                    'device_id' => $request->ip(), // Use IP as device ID
                    'measured_at' => now(),
                ]);

                $recordCount++;
            }

            // Get total calibration points for this floor
            $totalPoints = WifiSignalReading::where('floor_id', $validated['floor_id'])
                ->distinct('access_point_id')
                ->count('access_point_id');

            return response()->json([
                'message' => 'Calibration data recorded',
                'recordings' => $recordCount,
                'total_points' => $totalPoints,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                ['errors' => $e->errors()],
                422
            );
        } catch (\Exception $e) {
            \Log::error('Failed to record calibration data: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to record calibration data'],
                500
            );
        }
    }

    /**
     * Log a calculated user position for analytics
     * 
     * Records the estimated user position along with accuracy metrics.
     * Used for tracking and validation of positioning algorithm.
     * 
     * Endpoint: POST /api/user-position
     * 
     * @param Request $request
     * @return JsonResponse Success message
     */
    public function recordUserPosition(Request $request): JsonResponse
    {
        try {
            // Validate input
            $validated = $request->validate([
                'floor_id' => 'required|integer|exists:floors,id',
                'x_coordinate' => 'required|numeric',
                'y_coordinate' => 'required|numeric',
                'accuracy' => 'required|numeric|min:0',
                'signal_count' => 'required|integer|min:1',
            ]);

            // Create position log
            $position = WifiUserPosition::create([
                ...$validated,
                'device_id' => $request->ip(),
                'recorded_at' => now(),
            ]);

            return response()->json([
                'message' => 'Position recorded',
                'position_id' => $position->id,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                ['errors' => $e->errors()],
                422
            );
        } catch (\Exception $e) {
            \Log::error('Failed to record user position: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to record position'],
                500
            );
        }
    }

    /**
     * Get calibration statistics for a floor
     * 
     * Returns data about how much calibration has been done.
     * Useful for understanding positioning accuracy potential.
     * 
     * Endpoint: GET /api/floor/{floorId}/calibration-stats
     * 
     * @param int $floorId Floor ID
     * @return JsonResponse Statistics
     */
    public function getCalibrationStats(int $floorId): JsonResponse
    {
        try {
            $stats = [
                'access_points' => WifiAccessPoint::where('floor_id', $floorId)->count(),
                'calibration_points' => WifiSignalReading::where('floor_id', $floorId)
                    ->distinct('access_point_id')
                    ->count('access_point_id'),
                'total_readings' => WifiSignalReading::where('floor_id', $floorId)->count(),
                'position_logs' => WifiUserPosition::where('floor_id', $floorId)->count(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            \Log::error('Failed to get calibration stats: ' . $e->getMessage());
            
            return response()->json(
                ['error' => 'Failed to retrieve statistics'],
                500
            );
        }
    }
}
