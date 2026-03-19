<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * WiFi Indoor Positioning Database Schema
 * 
 * This migration creates tables for WiFi-based indoor navigation:
 * - wifi_access_points: Known access point locations and characteristics
 * - wifi_signal_readings: Calibration data (RSSI at known locations)
 * - wifi_user_positions: User position logs for analytics
 */
return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Creates three tables for WiFi-based indoor positioning system
     */
    public function up(): void
    {
        // ============================================
        // Table 1: WiFi Access Points
        // ============================================
        // Stores the physical locations and characteristics of WiFi access points
        // This is the master data for positioning calculations
        Schema::create('wifi_access_points', function (Blueprint $table) {
            $table->id();
            
            // Foreign key to floors table - which floor this AP is on
            $table->foreignId('floor_id')->constrained()->onDelete('cascade');
            
            // Network identification
            $table->string('ssid');                    // WiFi network name (e.g., "Library-WiFi")
            $table->string('bssid')->unique();         // MAC address (e.g., "AA:BB:CC:DD:EE:FF")
            
            // Physical location on floor (in pixels)
            $table->decimal('x_coordinate', 8, 2);    // X position on floor plan
            $table->decimal('y_coordinate', 8, 2);    // Y position on floor plan
            
            // Signal characteristic
            // TX power at 1 meter distance, used in trilateration calculations
            // Typical values: -10 to -30 dBm (higher = stronger signal)
            $table->integer('tx_power')->default(-30);
            
            // Optional notes (e.g., location, ceiling height, obstructions)
            $table->text('notes')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Indexes for common queries
            $table->index('floor_id');                 // Find APs by floor
            $table->index('bssid');                    // Find AP by MAC address
        });

        // ============================================
        // Table 2: WiFi Signal Readings (Calibration Data)
        // ============================================
        // Records RSSI measurements at known locations for calibration
        // Used to improve positioning accuracy via fingerprinting
        Schema::create('wifi_signal_readings', function (Blueprint $table) {
            $table->id();
            
            // Foreign keys
            $table->foreignId('floor_id')->constrained()->onDelete('cascade');
            $table->foreignId('access_point_id')
                ->constrained('wifi_access_points')
                ->onDelete('cascade');
            
            // Known calibration point location
            $table->decimal('x_coordinate', 8, 2);    // Where measurement was taken
            $table->decimal('y_coordinate', 8, 2);
            
            // Signal strength measurement
            // RSSI ranges from -30 (very strong) to -100 (very weak) dBm
            $table->integer('rssi');
            
            // Device identifier for multi-user calibration
            $table->string('device_id')->nullable();
            
            // When measurement was taken
            $table->timestamp('measured_at');
            
            // Timestamps
            $table->timestamps();
            
            // Indexes for queries
            $table->index('floor_id');                 // Get all readings for a floor
            $table->index('access_point_id');          // Get readings for an AP
            $table->index('measured_at');              // Get readings by time range
        });

        // ============================================
        // Table 3: User Positions (Analytics Log)
        // ============================================
        // Logs calculated user positions over time
        // Used for tracking, analytics, and validation
        Schema::create('wifi_user_positions', function (Blueprint $table) {
            $table->id();
            
            // Foreign key to floors
            $table->foreignId('floor_id')->constrained()->onDelete('cascade');
            
            // Device identifier for tracking movement
            $table->string('device_id')->nullable();
            
            // Calculated position
            $table->decimal('x_coordinate', 8, 2);    // Estimated X coordinate
            $table->decimal('y_coordinate', 8, 2);    // Estimated Y coordinate
            
            // Position quality metrics
            // Accuracy is the estimated error radius in meters
            // Lower values = more confident position estimate
            $table->decimal('accuracy', 5, 2);
            
            // How many access points were used in calculation
            // Minimum 3 for trilateration, more = better quality
            $table->integer('signal_count');
            
            // When this position was recorded
            $table->timestamp('recorded_at');
            
            // Timestamps
            $table->timestamps();
            
            // Indexes for analytics queries
            $table->index('floor_id');                 // Get positions on a floor
            $table->index('device_id');                // Track device movement
            $table->index('recorded_at');              // Get positions by time range
        });
    }

    /**
     * Reverse the migrations.
     * 
     * Drops all WiFi-related tables in reverse order
     */
    public function down(): void
    {
        // Drop in reverse order of creation to respect foreign keys
        Schema::dropIfExists('wifi_user_positions');
        Schema::dropIfExists('wifi_signal_readings');
        Schema::dropIfExists('wifi_access_points');
    }
};
