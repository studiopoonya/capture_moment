import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Film, ImagePlus, Mic, Sparkles, Video } from "lucide-react";
import JSZip from "jszip";
import { getSharedSessionGallery, generateSessionResultVideo, type PhotoSessionResult } from "@/lib/api";
import { toCanvasSafeUrl } from "@/lib/compose-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/shared-sessions/$token")({
  head: () => ({
    meta: [{ title: "Galeri Dibagikan — Capture Moments" }],
  }),
  component: SharedSessionGalleryPage,
});

async function downloadBlob(url: string, filename: string) {
  const res = await fetch(toCanvasSafeUrl(url));
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function SharedSessionGalleryPage() {
  const { token } = Route.useParams();
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [active, setActive] = useState<PhotoSessionResult | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("session-luxe");
    return () => document.documentElement.classList.remove("session-luxe");
  }, []);

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["shared-session", token],
    queryFn: () => getSharedSessionGallery(token),
    retry: false,
  });

  const results = session?.results ?? [];

  const handleDownloadAll = async () => {
    if (downloadingAll || !session) return;
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        results.map(async (r, i) => {
          const res = await fetch(toCanvasSafeUrl(r.image));
          zip.file(`foto-${i + 1}.png`, await res.blob());
          if (r.gif) {
            const gifRes = await fetch(toCanvasSafeUrl(r.gif));
            zip.file(`foto-${i + 1}.gif`, await gifRes.blob());
          }
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.customer_name}-foto.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-hero px-5">
        <p className="text-sm font-bold text-muted-foreground">Memuat galeri...</p>
      </main>
    );
  }

  if (isError || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-hero px-5 text-center">
        <div>
          <p className="text-4xl">🔗</p>
          <h1 className="mt-3 font-display text-xl font-extrabold">Link tidak ditemukan</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Link ini mungkin sudah tidak berlaku.
          </p>
          <Link
            to="/"
            className="tap-press mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground"
          >
            Ke Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lemon px-3 py-1 text-xs font-extrabold text-lemon-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Capture Moments
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold">{session.customer_name}</h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{results.length} foto</p>
        </div>

        {results.length > 0 && (
          <button
            type="button"
            disabled={downloadingAll}
            onClick={handleDownloadAll}
            className="tap-press mx-auto mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-display text-sm font-extrabold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloadingAll ? "Menyiapkan..." : "Download Semua"}
          </button>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActive(r)}
              className="tap-press relative aspect-2/3 overflow-hidden rounded-2xl border border-border shadow-soft"
            >
              <img src={r.image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <Link
          to="/"
          className="tap-press mt-6 block text-center text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          Buat photobooth kamu sendiri →
        </Link>
      </div>

      <SharedResultLightbox item={active} onClose={() => setActive(null)} />
    </main>
  );
}

/** Public, view-only counterpart to the admin gallery's lightbox — same GIF/photo/voice/video
    viewing and downloading, but no delete route reachable from here. */
function SharedResultLightbox({
  item,
  onClose,
}: {
  item: PhotoSessionResult | null;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"photo" | "gif">("photo");
  const [downloading, setDownloading] = useState<"photo" | "gif" | "video" | null>(null);

  useEffect(() => {
    setViewMode("photo");
  }, [item?.id]);

  const handleDownloadPhoto = async () => {
    if (!item || downloading) return;
    setDownloading("photo");
    try {
      await downloadBlob(item.image, `capture-moments-${item.id}.png`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadGif = async () => {
    if (!item?.gif || downloading) return;
    setDownloading("gif");
    try {
      await downloadBlob(item.gif, `capture-moments-${item.id}.gif`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadVideo = async () => {
    if (!item?.voice || downloading) return;
    setDownloading("video");
    try {
      const updated = item.video ? item : await generateSessionResultVideo(item.id);
      if (!updated.video) throw new Error("Video gagal dibuat");
      await downloadBlob(updated.video, `capture-moments-${item.id}-suara.mp4`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{item.frame?.name ?? "Hasil Foto"}</DialogTitle>
              <DialogDescription>
                {new Date(item.created_at).toLocaleString("id-ID")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
              <div className="overflow-hidden rounded-2xl border border-border">
                <img
                  src={viewMode === "gif" && item.gif ? item.gif : item.image}
                  alt=""
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                {item.gif && (
                  <button
                    type="button"
                    onClick={() => setViewMode((m) => (m === "photo" ? "gif" : "photo"))}
                    className="tap-press flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-extrabold text-muted-foreground hover:bg-muted/70"
                  >
                    {viewMode === "photo" ? (
                      <>
                        <Film className="h-3.5 w-3.5" /> Lihat GIF
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-3.5 w-3.5" /> Lihat Foto
                      </>
                    )}
                  </button>
                )}
                {item.voice && (
                  <div className="rounded-2xl border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                      <Mic className="h-3.5 w-3.5" /> Pesan suara
                    </p>
                    <audio controls src={item.voice} className="mt-2 w-full" />
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={!!downloading}
                  onClick={handleDownloadPhoto}
                  className="tap-press w-full rounded-full font-bold"
                >
                  <Download className="h-4 w-4" />
                  {downloading === "photo" ? "Menyiapkan..." : "Download Foto"}
                </Button>
                {item.voice && (
                  <Button
                    disabled={!!downloading}
                    onClick={handleDownloadVideo}
                    className="tap-press w-full rounded-full bg-gradient-primary font-bold text-primary-foreground"
                  >
                    <Video className="h-4 w-4" />
                    {downloading === "video" ? "Menyiapkan video..." : "Download Foto + Suara"}
                  </Button>
                )}
                {item.gif && (
                  <Button
                    variant="outline"
                    disabled={!!downloading}
                    onClick={handleDownloadGif}
                    className="tap-press w-full rounded-full font-bold"
                  >
                    <Film className="h-4 w-4" />
                    {downloading === "gif" ? "Menyiapkan..." : "Download GIF"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
