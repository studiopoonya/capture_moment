<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PhotoSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'slug',
        'event_date',
        'gif_frame_id',
        'welcome_photo',
        'welcome_title',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
        ];
    }

    protected static function booted(): void
    {
        // share_token is intentionally not fillable — it's a server-generated opaque id for the
        // public, view-only "share whole gallery" link, never client-set.
        static::creating(function (self $session) {
            $session->share_token ??= Str::random(32);
        });
    }

    public function frames(): BelongsToMany
    {
        return $this->belongsToMany(Frame::class, 'photo_session_frame')->withTimestamps();
    }

    /** Optional reusable GIF-border asset — null means the customer's GIF has no border. */
    public function gifFrame(): BelongsTo
    {
        return $this->belongsTo(GifFrame::class);
    }

    public function filters(): BelongsToMany
    {
        return $this->belongsToMany(PhotoFilter::class, 'photo_session_filter', 'photo_session_id', 'filter_id')->withTimestamps();
    }

    public function stickers(): BelongsToMany
    {
        return $this->belongsToMany(Sticker::class, 'photo_session_sticker')->withTimestamps();
    }

    public function results(): HasMany
    {
        return $this->hasMany(PhotoSessionResult::class)->latest();
    }
}
