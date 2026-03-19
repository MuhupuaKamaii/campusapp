<?php
/**
 * WiFi Database Setup Script
 * 
 * This script helps set up the WiFi positioning database with test data
 * Run after migrations: php artisan tinker < scripts/setup-wifi-database.php
 * Or from command line: php -r "include 'scripts/setup-wifi-database.php';"
 */

// Bootstrap Laravel
require 'bootstrap/app.php';
$app = require_once 'bootstrap/providers.php';

use App\Models\Building;
use App\Models\Floor;
use App\Models\User;

// Check if we can connect to database
try {
    DB::connection()->getPdo();
    echo "✅ Database connection successful!\n\n";
} catch (Exception $e) {
    echo "❌ Database connection failed: {$e->getMessage()}\n";
    exit(1);
}

// Create or update NUST Library building
echo "Creating NUST Library building...\n";
$library = Building::firstOrCreate(
    ['name' => 'NUST Library'],
    [
        'latitude' => 33.651486,  // Coordinates for NUST Islamabad
        'longitude' => 73.200867,
    ]
);
echo "✅ NUST Library building created/updated (ID: {$library->id})\n\n";

// Create floors for NUST Library
$floors = [
    -1 => ['name' => 'Basement', 'width' => 800, 'height' => 600],
    0  => ['name' => 'Ground Floor', 'width' => 800, 'height' => 600],
    1  => ['name' => 'First Floor', 'width' => 800, 'height' => 600],
    2  => ['name' => 'Second Floor', 'width' => 800, 'height' => 600],
    3  => ['name' => 'Third Floor', 'width' => 800, 'height' => 600],
];

foreach ($floors as $level => $floorData) {
    echo "Creating {$floorData['name']} ({$floorData ['floor']}level: $level)...\n";
    
    $floor = Floor::firstOrCreate(
        [
            'building_id' => $library->id,
            'level' => $level,
        ],
        [
            'width' => $floorData['width'],
            'height' => $floorData['height'],
        ]
    );
    
    echo "✅ {$floorData['name']} created/updated (ID: {$floor->id})\n";
}

echo "\n✅ Database setup complete!\n";
echo "\nFloors created for building ID: {$library->id}\n";
echo "You can now:\n";
echo "1. Add WiFi access points via the IndoorNavigation page\n";
echo "2. Or manually add APs in database:\n";
echo "   php artisan tinker\n";
echo "   \$floor = Floor::find(1); // Get floor ID\n";
echo "   \$floor->accessPoints()->create([\n";
echo "       'ssid' => 'Library-WiFi',\n";
echo "       'bssid' => '00:11:22:33:44:55',\n";
echo "       'x_coordinate' => 400,\n";
echo "       'y_coordinate' => 300,\n";
echo "       'tx_power' => -20,\n";
echo "       'notes' => 'Corner access point'\n";
echo "   ]);\n";
