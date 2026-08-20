<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gif_frames', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('image');
            // Where the photo window sits inside the uploaded border image, as percentages —
            // defaults to the full canvas so a plain full-bleed vignette needs no adjustment.
            $table->float('slot_x')->default(0);
            $table->float('slot_y')->default(0);
            $table->float('slot_w')->default(100);
            $table->float('slot_h')->default(100);
            $table->boolean('rounded')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->foreignId('gif_frame_id')->nullable()->after('event_date')
                ->constrained('gif_frames')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('gif_frame_id');
        });

        Schema::dropIfExists('gif_frames');
    }
};
