<?php

use App\Http\Controllers\IndoorNavigationController;
use App\Http\Controllers\WifiController;

// ============================================
// Indoor Navigation Routes
// ============================================
Route::get('/buildings', [IndoorNavigationController::class, 'getAllBuildings']);
Route::get('/building/{buildingId}/floors', [IndoorNavigationController::class, 'getFloors']);
Route::get('/floor/{floorId}/graph', [IndoorNavigationController::class, 'getGraphData']);
Route::get('/floor-plans', [IndoorNavigationController::class, 'getFloorPlans']);
Route::post('/indoor-route', [IndoorNavigationController::class, 'calculateRoute']);
Route::get('/locations/search', [IndoorNavigationController::class, 'searchLocations']);
Route::post('/save-geojson', [IndoorNavigationController::class, 'saveGeoJSON']);
Route::post('/seed-floor-locations', [IndoorNavigationController::class, 'seedFloorLocations']);

// ============================================
// WiFi Scanning Routes
// ============================================
// Scan for available WiFi networks
Route::get('/scan-wifi-networks', [WifiController::class, 'scanNetworks']);

// ============================================
// WiFi Access Point Management (CRUD)
// ============================================
// Get all access points for a floor
Route::get('/floor/{floorId}/wifi-access-points', [WifiController::class, 'getFloorAccessPoints']);

// Create new access point
Route::post('/wifi-ap', [WifiController::class, 'createAccessPoint']);

// Update access point
Route::put('/wifi-ap/{id}', [WifiController::class, 'updateAccessPoint']);

// Delete access point
Route::delete('/wifi-ap/{id}', [WifiController::class, 'deleteAccessPoint']);

// ============================================
// WiFi Calibration & Data Recording
// ============================================
// Record calibration data (signal readings at known locations)
Route::post('/floor/calibration-data', [WifiController::class, 'recordCalibrationData']);

// Record user position (for analytics and validation)
Route::post('/user-position', [WifiController::class, 'recordUserPosition']);

// Get calibration statistics for a floor
Route::get('/floor/{floorId}/calibration-stats', [WifiController::class, 'getCalibrationStats']);
