<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Sticker extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'image',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function sessions(): BelongsToMany
    {
        return $this->belongsToMany(PhotoSession::class, 'photo_session_sticker')->withTimestamps();
    }
}
