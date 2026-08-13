import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFilters, getFrames, getStickers } from "@/lib/api";
import { usePhotobooth } from "@/lib/photobooth-store";
import { PhotoboothResult } from "@/components/PhotoboothResult";

export const Route = createFileRoute("/result/$frameId")({
  head: () => ({
    meta: [
      { title: "Hasil Photostrip — Capture Moments" },
      {
        name: "description",
        content: "Hasil foto kamu sudah tergabung ke dalam frame. Download atau bagikan sekarang.",
      },
      { property: "og:title", content: "Hasil Photostrip — Capture Moments" },
      {
        property: "og:description",
        content: "Photostrip pastel siap di-download dan dibagikan ke sosial media.",
      },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { frameId } = Route.useParams();
  const { setShots } = usePhotobooth();
  const navigate = useNavigate();
  const { data: frames, isLoading } = useQuery({ queryKey: ["frames"], queryFn: getFrames });
  const { data: filters } = useQuery({ queryKey: ["filters"], queryFn: getFilters });
  const { data: stickers } = useQuery({ queryKey: ["stickers"], queryFn: getStickers });
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
            Ke Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PhotoboothResult
      frame={frame}
      sessionKey={frameId}
      filters={filters ?? []}
      stickers={stickers ?? []}
      onRetake={() => {
        setShots(frameId, []);
        navigate({ to: "/capture/$frameId", params: { frameId } });
      }}
    />
  );
}
