<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GifFrame extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image',
        'slot_x',
        'slot_y',
        'slot_w',
        'slot_h',
        'rounded',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'slot_x' => 'float',
            'slot_y' => 'float',
            'slot_w' => 'float',
            'slot_h' => 'float',
            'rounded' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(PhotoSession::class);
    }
}
