<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * WifiAccessPoint Model
 * 
 * Represents a physical WiFi access point location and its characteristics.
 * Used for RSSI trilateration calculations and positioning.
 * 
 * @property int $id
 * @property int $floor_id - Floor this access point is located on
 * @property string $ssid - Network name (e.g., "Library-WiFi")
 * @property string $bssid - MAC address (unique identifier)
 * @property float $x_coordinate - Position on floor plan (pixels)
 * @property float $y_coordinate - Position on floor plan (pixels)
 * @property int $tx_power - Transmission power in dBm at 1 meter
 * @property string|null $notes - Optional notes about the location
 */
class WifiAccessPoint extends Model
{
    /**
     * The table associated with the model
     */
    protected $table = 'wifi_access_points';

    /**
     * Mass assignable attributes
     */
    protected $fillable = [
        'floor_id',
        'ssid',
        'bssid',
        'x_coordinate',
        'y_coordinate',
        'tx_power',
        'notes',
    ];

    /**
     * Attribute casting for proper type handling
     */
    protected $casts = [
        'x_coordinate' => 'float',
        'y_coordinate' => 'float',
        'tx_power' => 'integer',
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
     * Relationship: Has many signal readings
     * Calibration data collected at various locations for this AP
     */
    public function signalReadings(): HasMany
    {
        return $this->hasMany(WifiSignalReading::class, 'access_point_id');
    }

    /**
 * Always store BSSID in lowercase for consistent matching
 */
public function setBssidAttribute($value)
{
    $this->attributes['bssid'] = strtolower($value);
}
}
