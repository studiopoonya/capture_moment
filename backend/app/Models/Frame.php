<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Frame extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image',
        'active',
        'rounded',
        'slots',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'rounded' => 'boolean',
            'slots' => 'array',
        ];
    }

    public function sessions(): BelongsToMany
    {
        return $this->belongsToMany(PhotoSession::class, 'photo_session_frame')->withTimestamps();
    }
}
