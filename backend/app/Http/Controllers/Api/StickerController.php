<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sticker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class StickerController extends Controller
{
    /** Public: active stickers only. */
    public function index()
    {
        return Sticker::where('active', true)->orderByDesc('id')->get();
    }

    /** Admin: every sticker regardless of active state. */
    public function adminIndex()
    {
        return Sticker::orderByDesc('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'image' => ['required', 'image', 'max:2048'],
        ]);

        return Sticker::create([
            'name' => $data['name'],
            'image' => $this->storeImage($request),
        ]);
    }

    public function update(Request $request, Sticker $sticker)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
            'image' => ['sometimes', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $this->storeImage($request);
        }

        $sticker->update($data);

        return $sticker;
    }

    public function destroy(Sticker $sticker)
    {
        $sticker->delete();

        return response()->json(['message' => 'Stiker dihapus']);
    }

    private function storeImage(Request $request): string
    {
        $dir = public_path('images/stickers/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
        $file->move($dir, $filename);

        return asset('images/stickers/uploads/'.$filename);
    }
}
