<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Frame;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class FrameController extends Controller
{
    /** Public: active frames only, for the customer-facing frame picker. */
    public function index()
    {
        return Frame::where('active', true)->orderByDesc('id')->get();
    }

    /** Admin: every frame regardless of active state. */
    public function adminIndex()
    {
        return Frame::orderByDesc('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'tone' => ['required', 'string', 'in:primary,mint,lemon,sky,lilac'],
            'image' => ['required', 'string'],
            'active' => ['boolean'],
            'rounded' => ['boolean'],
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.id' => ['required', 'string'],
            'slots.*.x' => ['required', 'numeric'],
            'slots.*.y' => ['required', 'numeric'],
            'slots.*.w' => ['required', 'numeric'],
            'slots.*.h' => ['required', 'numeric'],
        ]);

        return Frame::create($data);
    }

    public function update(Request $request, Frame $frame)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'tone' => ['sometimes', 'required', 'string', 'in:primary,mint,lemon,sky,lilac'],
            'image' => ['sometimes', 'required', 'string'],
            'active' => ['sometimes', 'boolean'],
            'rounded' => ['sometimes', 'boolean'],
            'slots' => ['sometimes', 'required', 'array', 'min:1'],
            'slots.*.id' => ['required_with:slots', 'string'],
            'slots.*.x' => ['required_with:slots', 'numeric'],
            'slots.*.y' => ['required_with:slots', 'numeric'],
            'slots.*.w' => ['required_with:slots', 'numeric'],
            'slots.*.h' => ['required_with:slots', 'numeric'],
        ]);

        $frame->update($data);

        return $frame;
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $dir = public_path('images/frames/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->move($dir, $filename);

        return response()->json(['url' => asset('images/frames/uploads/' . $filename)]);
    }

    public function destroy(Frame $frame)
    {
        $frame->delete();

        return response()->json(['message' => 'Frame dihapus']);
    }
}
