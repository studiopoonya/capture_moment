<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoSessionResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'photo_session_id',
        'frame_id',
        'image',
        'gif',
        'voice',
        'video',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(PhotoSession::class, 'photo_session_id');
    }

    public function frame(): BelongsTo
    {
        return $this->belongsTo(Frame::class);
    }
}
