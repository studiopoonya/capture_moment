<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhotoSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'slug',
        'welcome_photo',
        'welcome_title',
    ];

    public function frames(): BelongsToMany
    {
        return $this->belongsToMany(Frame::class, 'photo_session_frame')->withTimestamps();
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
