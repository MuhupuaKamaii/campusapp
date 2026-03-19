<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Path extends Model
{
    protected $fillable = [
        'start_location_id',
        'end_location_id',
        'distance',
    ];

    public function startLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'start_location_id');
    }

    public function endLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'end_location_id');
    }
}
