<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->string('welcome_photo')->nullable()->after('slug');
            $table->string('welcome_title')->nullable()->after('welcome_photo');
        });
    }

    public function down(): void
    {
        Schema::table('photo_sessions', function (Blueprint $table) {
            $table->dropColumn(['welcome_photo', 'welcome_title']);
        });
    }
};
