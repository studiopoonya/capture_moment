<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_session_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('frame_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_session_results');
    }
};
