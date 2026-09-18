<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->string('welcome_message', 500)->nullable()->after('welcome_title');
        });
    }

    public function down(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->dropColumn('welcome_message');
        });
    }
};
