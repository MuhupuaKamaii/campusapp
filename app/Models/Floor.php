<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    protected $fillable = [
        'building_id',
        'level',
        'image_path',
        'pdf_path',
        'width',
        'height',
    ];

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function paths(): HasMany
    {
        return $this->hasMany(Path::class, 'start_location_id');
    }
}
