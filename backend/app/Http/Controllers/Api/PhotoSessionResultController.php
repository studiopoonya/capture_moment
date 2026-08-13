<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhotoSession;
use App\Models\PhotoSessionResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

class PhotoSessionResultController extends Controller
{
    /** Public: called by the customer-facing page right after a shoot finishes. */
    public function store(Request $request, PhotoSession $session)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'max:8192'],
            'frame_id' => ['nullable', 'exists:frames,id'],
        ]);

        $dir = public_path('images/results/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $filename = Str::uuid().'.png';
        $file->move($dir, $filename);

        return $session->results()->create([
            'frame_id' => $data['frame_id'] ?? null,
            'image' => asset('images/results/uploads/'.$filename),
        ])->load('frame');
    }

    /**
     * Public: called separately from store(), once the looping GIF has finished
     * encoding client-side — GIF encoding is slow, so it shouldn't hold up saving
     * the still image first.
     */
    public function attachGif(Request $request, PhotoSessionResult $result)
    {
        $request->validate([
            'gif' => ['required', 'file', 'mimes:gif', 'max:8192'],
        ]);

        $dir = public_path('images/results/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('gif');
        $filename = Str::uuid().'.gif';
        $file->move($dir, $filename);

        $result->update(['gif' => asset('images/results/uploads/'.$filename)]);

        return $result;
    }

    /**
     * Public: attaches an optional voice message for the couple, recorded by the guest
     * right after picking stickers. Uploaded separately since it's fully optional.
     */
    public function attachVoice(Request $request, PhotoSessionResult $result)
    {
        $request->validate([
            'voice' => ['required', 'file', 'mimes:webm,ogg,mp3,wav,m4a,mp4', 'max:8192'],
        ]);

        $dir = public_path('images/results/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('voice');
        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
        $file->move($dir, $filename);

        $result->update(['voice' => asset('images/results/uploads/'.$filename)]);

        return $result;
    }

    /**
     * Public: called by both the customer result screen and the admin gallery. Renders a
     * short MP4 combining the still photo with the guest's voice message — the only way the
     * voice message can travel along when shared to Instagram/etc, since PNG/GIF can't carry
     * audio. Done server-side via ffmpeg: a client-side attempt using
     * canvas.captureStream()+MediaRecorder turned out to be unreliable (a timing race in
     * Chromium's media pipeline sometimes produced an empty recording). Cached on first
     * generation so repeat downloads don't re-run ffmpeg.
     */
    public function generateVideo(PhotoSessionResult $result)
    {
        if (! $result->voice) {
            return response()->json(['message' => 'Sesi ini belum ada pesan suara'], 422);
        }

        if ($result->video) {
            return $result;
        }

        $imagePath = $this->localPathFromAssetUrl($result->image);
        $voicePath = $this->localPathFromAssetUrl($result->voice);

        $dir = public_path('images/results/uploads');
        File::ensureDirectoryExists($dir);
        $filename = Str::uuid().'.mp4';
        $outputPath = $dir.'/'.$filename;

        $process = Process::timeout(60)->run([
            config('services.ffmpeg.path'),
            '-y',
            '-loop', '1',
            '-i', $imagePath,
            '-i', $voicePath,
            '-c:v', 'libx264',
            '-tune', 'stillimage',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1080:-2',
            '-shortest',
            $outputPath,
        ]);

        if ($process->failed()) {
            report(new \RuntimeException('ffmpeg gagal: '.$process->errorOutput()));

            return response()->json(['message' => 'Gagal membuat video'], 500);
        }

        $result->update(['video' => asset('images/results/uploads/'.$filename)]);

        return $result;
    }

    public function destroy(PhotoSessionResult $result)
    {
        $result->delete();

        return response()->json(['message' => 'Hasil foto dihapus']);
    }

    /** Converts a stored asset() URL (e.g. http://host/images/x.png) back to a local filesystem path. */
    private function localPathFromAssetUrl(string $url): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);

        return public_path(ltrim($path, '/'));
    }
}
