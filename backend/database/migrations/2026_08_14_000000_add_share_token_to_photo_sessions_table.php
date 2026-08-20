<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->string('share_token', 32)->nullable()->unique()->after('slug');
        });

        DB::table('photo_sessions')->whereNull('share_token')->orderBy('id')
            ->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('photo_sessions')->where('id', $row->id)
                        ->update(['share_token' => Str::random(32)]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->dropColumn('share_token');
        });
    }
};
