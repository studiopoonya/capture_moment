<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    /**
     * Streams a file from public/ with a permissive CORS header. Static files served
     * directly (e.g. /images/frames/x.jpg) don't go through Laravel's middleware, so
     * the browser can't read them into a <canvas> cross-origin — this route re-serves
     * the same file through Laravel so the header can be attached.
     */
    public function show(Request $request)
    {
        $relative = ltrim((string) $request->query('path', ''), '/');
        $full = realpath(public_path($relative));

        abort_if(
            $relative === ''
                || $full === false
                || ! str_starts_with($full, realpath(public_path()))
                || ! is_file($full),
            404,
        );

        return response()->file($full, [
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
