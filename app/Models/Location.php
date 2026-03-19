<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    protected $fillable = [
        'floor_id',
        'x_coordinate',
        'y_coordinate',
        'name',
        'type',
    ];

    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    public function pathsFrom(): HasMany
    {
        return $this->hasMany(Path::class, 'start_location_id');
    }

    public function pathsTo(): HasMany
    {
        return $this->hasMany(Path::class, 'end_location_id');
    }
}
