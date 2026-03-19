<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WifiUserPosition Model
 * 
 * Logs calculated user positions over time for analytics and validation.
 * Tracks movement patterns and positioning accuracy.
 * 
 * @property int $id
 * @property int $floor_id - Floor where position was calculated
 * @property string|null $device_id - Device identifier for tracking user
 * @property float $x_coordinate - Calculated X position
 * @property float $y_coordinate - Calculated Y position
 * @property float $accuracy - Confidence radius in meters (error estimate)
 * @property int $signal_count - Number of APs used in calculation
 * @property string $recorded_at - Timestamp of recording
 */
class WifiUserPosition extends Model
{
    /**
     * The table associated with the model
     */
    protected $table = 'wifi_user_positions';

    /**
     * Mass assignable attributes
     */
    protected $fillable = [
        'floor_id',
        'device_id',
        'x_coordinate',
        'y_coordinate',
        'accuracy',
        'signal_count',
        'recorded_at',
    ];

    /**
     * Attribute casting
     */
    protected $casts = [
        'x_coordinate' => 'float',
        'y_coordinate' => 'float',
        'accuracy' => 'float',
        'signal_count' => 'integer',
        'recorded_at' => 'datetime',
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
}
