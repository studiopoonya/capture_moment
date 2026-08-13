<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_session_filter', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('filter_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('photo_session_sticker', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sticker_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_session_sticker');
        Schema::dropIfExists('photo_session_filter');
    }
};
