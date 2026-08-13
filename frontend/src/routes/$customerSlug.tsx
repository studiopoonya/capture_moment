import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/api";
import { usePhotobooth } from "@/lib/photobooth-store";
import { PhotoboothCapture } from "@/components/PhotoboothCapture";
import { PhotoboothResult } from "@/components/PhotoboothResult";
import { FrameComposite } from "@/components/FrameComposite";
import { WelcomeScreen } from "@/components/WelcomeScreen";

export const Route = createFileRoute("/$customerSlug")({
  head: () => ({
    meta: [{ title: "Sesi Foto — Capture Moments" }],
  }),
  component: CustomerSessionPage,
});

function CustomerSessionPage() {
  const { customerSlug } = Route.useParams();
  const { shots, setShots } = usePhotobooth();
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("session-luxe");
    return () => document.documentElement.classList.remove("session-luxe");
  }, []);

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["session", customerSlug],
    queryFn: () => getSession(customerSlug),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-hero px-5">
        <p className="text-sm font-bold text-muted-foreground">Menyiapkan sesi kamu...</p>
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
            Sesi ini mungkin sudah tidak berlaku. Cek lagi link dari admin ya.
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

  if (!welcomeSeen) {
    return (
      <WelcomeScreen
        photoUrl={session.welcome_photo}
        title={session.welcome_title}
        customerName={session.customer_name}
        onContinue={() => setWelcomeSeen(true)}
      />
    );
  }

  const hasMultipleFrames = session.frames.length > 1;
  const selectedFrame = hasMultipleFrames
    ? (session.frames.find((f) => f.id === selectedFrameId) ?? null)
    : (session.frames[0] ?? null);

  if (!selectedFrame) {
    return (
      <main className="min-h-screen bg-hero px-5 py-10">
        <div className="mx-auto max-w-sm">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lemon px-3 py-1 text-xs font-extrabold text-lemon-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Halo, {session.customer_name}
            </span>
            <h1 className="mt-3 font-display text-2xl font-extrabold">Pilih frame kamu</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Ada {session.frames.length} pilihan frame buat sesi foto kamu.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {session.frames.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFrameId(f.id)}
                className="tap-press flex w-full items-center gap-4 rounded-2xl bg-card p-3 text-left shadow-soft"
              >
                <div className="w-16 shrink-0">
                  <FrameComposite frame={f} className="rounded-lg" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-extrabold">{f.name}</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {f.slots.length} foto
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const sessionKey = `${customerSlug}-${selectedFrame.id}`;
  const taken = shots[sessionKey] ?? [];
  const done = taken.length >= selectedFrame.slots.length;

  if (done) {
    return (
      <PhotoboothResult
        frame={selectedFrame}
        sessionKey={sessionKey}
        eyebrow={`hasil buat ${session.customer_name}`}
        homeLabel="Home"
        filters={session.filters}
        stickers={session.stickers}
        sessionId={session.id}
        onRetake={() => setShots(sessionKey, [])}
      />
    );
  }

  return (
    <PhotoboothCapture
      frame={selectedFrame}
      sessionKey={sessionKey}
      eyebrow={session.customer_name}
      onDone={() => {}}
      onBack={hasMultipleFrames ? () => setSelectedFrameId(null) : () => setWelcomeSeen(false)}
    />
  );
}
