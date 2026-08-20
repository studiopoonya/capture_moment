<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FilterController;
use App\Http\Controllers\Api\FrameController;
use App\Http\Controllers\Api\GifFrameController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PhotoSessionController;
use App\Http\Controllers\Api\PhotoSessionResultController;
use App\Http\Controllers\Api\StickerController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::get('/frames', [FrameController::class, 'index']);
Route::get('/filters', [FilterController::class, 'index']);
Route::get('/stickers', [StickerController::class, 'index']);
Route::get('/sessions/{slug}', [PhotoSessionController::class, 'show']);
Route::get('/shared-sessions/{token}', [PhotoSessionController::class, 'showSharedGallery']);
Route::post('/sessions/{session}/results', [PhotoSessionResultController::class, 'store']);
Route::post('/session-results/{result}/gif', [PhotoSessionResultController::class, 'attachGif']);
Route::post('/session-results/{result}/voice', [PhotoSessionResultController::class, 'attachVoice']);
Route::post('/session-results/{result}/video', [PhotoSessionResultController::class, 'generateVideo']);

/** CORS-friendly passthrough for public images, needed so the browser can read them into a <canvas> for export. */
Route::get('/media', [MediaController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/admin/frames', [FrameController::class, 'adminIndex']);
    Route::post('/frames', [FrameController::class, 'store']);
    Route::post('/frames/upload-image', [FrameController::class, 'uploadImage']);
    Route::put('/frames/{frame}', [FrameController::class, 'update']);
    Route::delete('/frames/{frame}', [FrameController::class, 'destroy']);

    Route::get('/admin/filters', [FilterController::class, 'adminIndex']);
    Route::post('/filters', [FilterController::class, 'store']);
    Route::put('/filters/{filter}', [FilterController::class, 'update']);
    Route::delete('/filters/{filter}', [FilterController::class, 'destroy']);

    Route::get('/admin/stickers', [StickerController::class, 'adminIndex']);
    Route::post('/stickers', [StickerController::class, 'store']);
    Route::put('/stickers/{sticker}', [StickerController::class, 'update']);
    Route::delete('/stickers/{sticker}', [StickerController::class, 'destroy']);

    Route::get('/admin/gif-frames', [GifFrameController::class, 'adminIndex']);
    Route::post('/gif-frames', [GifFrameController::class, 'store']);
    Route::put('/gif-frames/{gifFrame}', [GifFrameController::class, 'update']);
    Route::delete('/gif-frames/{gifFrame}', [GifFrameController::class, 'destroy']);

    Route::get('/admin/sessions', [PhotoSessionController::class, 'index']);
    Route::post('/sessions', [PhotoSessionController::class, 'store']);
    Route::post('/sessions/upload-welcome-photo', [PhotoSessionController::class, 'uploadWelcomePhoto']);
    Route::put('/sessions/{session}', [PhotoSessionController::class, 'update']);
    Route::delete('/sessions/{session}', [PhotoSessionController::class, 'destroy']);
    Route::delete('/session-results/{result}', [PhotoSessionResultController::class, 'destroy']);
});
