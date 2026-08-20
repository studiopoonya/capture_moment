<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GifFrame;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GifFrameController extends Controller
{
    /** Admin: every GIF frame regardless of active state — picked per-session when creating a link. */
    public function adminIndex()
    {
        return GifFrame::orderByDesc('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'image' => ['required', 'image', 'max:2048'],
            'slot_x' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'slot_y' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'slot_w' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'slot_h' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'rounded' => ['sometimes', 'boolean'],
        ]);

        return GifFrame::create([
            'name' => $data['name'],
            'image' => $this->storeImage($request),
            'slot_x' => $data['slot_x'] ?? 0,
            'slot_y' => $data['slot_y'] ?? 0,
            'slot_w' => $data['slot_w'] ?? 100,
            'slot_h' => $data['slot_h'] ?? 100,
            'rounded' => $data['rounded'] ?? false,
        ]);
    }

    public function update(Request $request, GifFrame $gifFrame)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
            'image' => ['sometimes', 'image', 'max:2048'],
            'slot_x' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'slot_y' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'slot_w' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'slot_h' => ['sometimes', 'numeric', 'min:1', 'max:100'],
            'rounded' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->storeImage($request);
        }

        $gifFrame->update($data);

        return $gifFrame;
    }

    public function destroy(GifFrame $gifFrame)
    {
        $gifFrame->delete();

        return response()->json(['message' => 'GIF frame dihapus']);
    }

    private function storeImage(Request $request): string
    {
        $dir = public_path('images/gif-frames/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
        $file->move($dir, $filename);

        return asset('images/gif-frames/uploads/'.$filename);
    }
}
