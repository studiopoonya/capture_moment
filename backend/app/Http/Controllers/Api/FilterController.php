<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhotoFilter;
use App\Services\XmpFilterParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class FilterController extends Controller
{
    /** Public: active filters only. */
    public function index()
    {
        return PhotoFilter::where('active', true)->orderByDesc('id')->get();
    }

    /** Admin: every filter regardless of active state. */
    public function adminIndex()
    {
        return PhotoFilter::orderByDesc('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'xmp' => ['required', 'file', 'max:2048'],
        ]);

        $content = File::get($request->file('xmp')->getRealPath());
        $path = $this->storeXmp($request);

        return PhotoFilter::create([
            'name' => $data['name'],
            'css' => XmpFilterParser::toCss($content),
            'source_xmp' => $path,
        ]);
    }

    public function update(Request $request, PhotoFilter $filter)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
            'xmp' => ['sometimes', 'file', 'max:2048'],
        ]);

        if ($request->hasFile('xmp')) {
            $content = File::get($request->file('xmp')->getRealPath());
            $data['source_xmp'] = $this->storeXmp($request);
            $data['css'] = XmpFilterParser::toCss($content);
            unset($data['xmp']);
        }

        $filter->update($data);

        return $filter;
    }

    public function destroy(PhotoFilter $filter)
    {
        $filter->delete();

        return response()->json(['message' => 'Filter dihapus']);
    }

    private function storeXmp(Request $request): string
    {
        $dir = public_path('xmp/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('xmp');
        $filename = Str::uuid().'.xmp';
        $file->move($dir, $filename);

        return 'xmp/uploads/'.$filename;
    }
}
