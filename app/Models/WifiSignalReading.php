<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WifiSignalReading Model
 * 
 * Records RSSI (signal strength) measurements at known locations.
 * Used for WiFi fingerprinting and calibration to improve positioning accuracy.
 * 
 * @property int $id
 * @property int $floor_id - Floor where reading was taken
 * @property int $access_point_id - Which access point the signal came from
 * @property float $x_coordinate - Known location (X) where reading was taken
 * @property float $y_coordinate - Known location (Y) where reading was taken
 * @property int $rssi - Received Signal Strength in dBm (negative value)
 * @property string|null $device_id - Device identifier for tracking
 * @property string $measured_at - Timestamp of measurement
 */
class WifiSignalReading extends Model
{
    /**
     * The table associated with the model
     */
    protected $table = 'wifi_signal_readings';

    /**
     * Mass assignable attributes
     */
    protected $fillable = [
        'floor_id',
        'access_point_id',
        'x_coordinate',
        'y_coordinate',
        'rssi',
        'device_id',
        'measured_at',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'x_coordinate' => 'float',
        'y_coordinate' => 'float',
        'rssi' => 'integer',
        'measured_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: Belongs to a Floor
     */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /**
     * Relationship: Belongs to an Access Point
     */
    public function accessPoint(): BelongsTo
    {
        return $this->belongsTo(WifiAccessPoint::class, 'access_point_id');
    }
}
