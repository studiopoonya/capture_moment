import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFrames } from "@/lib/api";
import { PhotoboothCapture } from "@/components/PhotoboothCapture";

export const Route = createFileRoute("/capture/$frameId")({
  head: () => ({
    meta: [
      { title: "Ambil Foto — Capture Moments" },
      {
        name: "description",
        content: "Countdown 3-2-1, ambil foto berurutan sesuai jumlah slot frame pilihanmu.",
      },
      { property: "og:title", content: "Ambil Foto — Capture Moments" },
      {
        property: "og:description",
        content: "Sesi photobooth: live preview, countdown, dan retake per foto.",
      },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  const { frameId } = Route.useParams();
  const navigate = useNavigate();
  const { data: frames, isLoading } = useQuery({ queryKey: ["frames"], queryFn: getFrames });
  const frame = frames?.find((f) => String(f.id) === frameId);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-hero">
        <p className="text-sm font-bold text-muted-foreground">Memuat frame...</p>
      </main>
    );
  }

  if (!frame) {
    return (
      <main className="grid min-h-screen place-items-center bg-hero px-5 text-center">
        <div>
          <p className="text-4xl">🖼️</p>
          <h1 className="mt-3 font-display text-xl font-extrabold">Frame tidak ditemukan</h1>
          <Link
            to="/"
            className="tap-press mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground"
          >
            Pilih frame lain
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PhotoboothCapture
      frame={frame}
      sessionKey={frameId}
      onDone={() => navigate({ to: "/result/$frameId", params: { frameId } })}
    />
  );
}
