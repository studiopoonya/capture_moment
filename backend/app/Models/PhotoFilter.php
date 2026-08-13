<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PhotoFilter extends Model
{
    use HasFactory;

    protected $table = 'filters';

    protected $fillable = [
        'name',
        'css',
        'source_xmp',
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
        return $this->belongsToMany(PhotoSession::class, 'photo_session_filter')->withTimestamps();
    }
}
