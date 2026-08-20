<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PhotoFilter;
use App\Models\PhotoSession;
use App\Models\Sticker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class PhotoSessionController extends Controller
{
    private const RELATIONS = ['frames', 'filters', 'stickers', 'gifFrame'];

    /** Admin: every session, newest first, for management. */
    public function index()
    {
        return PhotoSession::with([...self::RELATIONS, 'results.frame'])->orderByDesc('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'event_date' => ['sometimes', 'nullable', 'date'],
            'gif_frame_id' => ['sometimes', 'nullable', 'exists:gif_frames,id'],
            'frame_ids' => ['required', 'array', 'min:1'],
            'frame_ids.*' => ['exists:frames,id'],
            'filter_ids' => ['sometimes', 'array'],
            'filter_ids.*' => ['exists:filters,id'],
            'sticker_ids' => ['sometimes', 'array'],
            'sticker_ids.*' => ['exists:stickers,id'],
            'welcome_photo' => ['sometimes', 'nullable', 'string'],
            'welcome_title' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $session = PhotoSession::create([
            'customer_name' => $data['customer_name'],
            'slug' => $this->uniqueSlug($data['customer_name']),
            'event_date' => $data['event_date'] ?? null,
            'gif_frame_id' => $data['gif_frame_id'] ?? null,
            'welcome_photo' => $data['welcome_photo'] ?? null,
            'welcome_title' => $data['welcome_title'] ?? null,
        ]);

        $session->frames()->attach($data['frame_ids']);

        // An empty/omitted selection means "no restriction" — the customer gets every active item.
        $filterIds = $data['filter_ids'] ?? [];
        $session->filters()->attach(
            $filterIds !== [] ? $filterIds : PhotoFilter::where('active', true)->pluck('id'),
        );

        $stickerIds = $data['sticker_ids'] ?? [];
        $session->stickers()->attach(
            $stickerIds !== [] ? $stickerIds : Sticker::where('active', true)->pluck('id'),
        );

        return $session->load(self::RELATIONS);
    }

    public function update(Request $request, PhotoSession $session)
    {
        $data = $request->validate([
            'customer_name' => ['sometimes', 'required', 'string', 'max:255'],
            'event_date' => ['sometimes', 'nullable', 'date'],
            'gif_frame_id' => ['sometimes', 'nullable', 'exists:gif_frames,id'],
            'frame_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'frame_ids.*' => ['exists:frames,id'],
            'filter_ids' => ['sometimes', 'array'],
            'filter_ids.*' => ['exists:filters,id'],
            'sticker_ids' => ['sometimes', 'array'],
            'sticker_ids.*' => ['exists:stickers,id'],
            'welcome_photo' => ['sometimes', 'nullable', 'string'],
            'welcome_title' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        // The slug stays put on rename — it's already baked into a shared link.
        $session->update(array_filter(
            $data,
            fn ($key) => in_array($key, ['customer_name', 'event_date', 'gif_frame_id', 'welcome_photo', 'welcome_title'], true),
            ARRAY_FILTER_USE_KEY,
        ));

        if (isset($data['frame_ids'])) {
            $session->frames()->sync($data['frame_ids']);
        }

        if (array_key_exists('filter_ids', $data)) {
            $filterIds = $data['filter_ids'] ?: PhotoFilter::where('active', true)->pluck('id');
            $session->filters()->sync($filterIds);
        }

        if (array_key_exists('sticker_ids', $data)) {
            $stickerIds = $data['sticker_ids'] ?: Sticker::where('active', true)->pluck('id');
            $session->stickers()->sync($stickerIds);
        }

        return $session->load(self::RELATIONS);
    }

    public function show(string $slug)
    {
        $session = PhotoSession::with(self::RELATIONS)->where('slug', $slug)->firstOrFail();

        return $session;
    }

    /**
     * Public: view-only gallery for the "Bagikan Semua" link in the admin gallery — every result
     * for this session, no delete route reachable from here, no session management data (frames/
     * filters/stickers) exposed.
     */
    public function showSharedGallery(string $token)
    {
        return PhotoSession::where('share_token', $token)
            ->with('results.frame')
            ->firstOrFail();
    }

    public function destroy(PhotoSession $session)
    {
        $session->delete();

        return response()->json(['message' => 'Sesi dihapus']);
    }

    /** Admin: uploads the couple's welcome-screen photo, returning its public URL. */
    public function uploadWelcomePhoto(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $dir = public_path('images/sessions/uploads');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
        $file->move($dir, $filename);

        return response()->json(['url' => asset('images/sessions/uploads/'.$filename)]);
    }

    private function uniqueSlug(string $customerName): string
    {
        $base = Str::slug($customerName) ?: 'customer';
        $slug = $base;
        $suffix = 1;

        while (PhotoSession::where('slug', $slug)->exists()) {
            $suffix++;
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }
}
