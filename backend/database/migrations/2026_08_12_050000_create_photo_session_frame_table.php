<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_session_frame', function (Blueprint $table) {
            $table->id();
            $table->foreignId('photo_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('frame_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        DB::table('photo_sessions')->whereNotNull('frame_id')->get()->each(function ($session) {
            DB::table('photo_session_frame')->insert([
                'photo_session_id' => $session->id,
                'frame_id' => $session->frame_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->dropForeign(['frame_id']);
            $table->dropColumn('frame_id');
        });
    }

    public function down(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->foreignId('frame_id')->nullable()->after('slug')->constrained()->cascadeOnDelete();
        });

        DB::table('photo_session_frame')->orderBy('id')->get()->groupBy('photo_session_id')->each(function ($rows, $sessionId) {
            DB::table('photo_sessions')->where('id', $sessionId)->update([
                'frame_id' => $rows->first()->frame_id,
            ]);
        });

        Schema::dropIfExists('photo_session_frame');
    }
};
