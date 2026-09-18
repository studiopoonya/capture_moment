import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, SwitchCamera, VideoOff, Zap, ZapOff } from "lucide-react";
import type { Frame } from "@/lib/api";
import { captureSlots } from "@/lib/frame-slots";
import { usePhotobooth, type Shot } from "@/lib/photobooth-store";
import { cn } from "@/lib/utils";

type Props = {
  frame: Frame;
  /** Storage key for this capture run — a frame id or a customer session slug. */
  sessionKey: string;
  /** Small label above the frame name, e.g. the customer's name for a session link. */
  eyebrow?: string;
  onDone: () => void;
  /** Overrides the back button to pop a step within the current flow instead of the default "go home" link — used by customer sessions, which shouldn't exit to the public landing page. */
  onBack?: () => void;
};

/** Torch is a non-standard capability — not in lib.dom's MediaTrack* types. */
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean };

export function PhotoboothCapture({ frame, sessionKey, eyebrow, onDone, onBack }: Props) {
  const { shots: allShots, setShots } = usePhotobooth();
  const taken: Shot[] = allShots[sessionKey] ?? [];
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // A slot's shotGroup lets several visual boxes share one photo (e.g. 6 boxes, 3 shutter
  // presses) — the camera flow only cares about these distinct capture points, never the
  // full slot layout.
  const shootSlots = captureSlots(frame);
  const total = shootSlots.length;
  const done = taken.length >= total;
  // The slot about to be filled, so the customer can see what will actually end up in the
  // frame — handy when the frame is portrait but a wide group shot won't fully fit, so people
  // on the edges would otherwise get cropped out without warning.
  const nextSlot = shootSlots[taken.length];
  // Slot x/y/w/h are percentages of the frame's fixed 2:3 (1000×1500) composite canvas, so a
  // slot's real aspect ratio also carries that 2:3 factor, not just its own w:h percentages.
  const cropAspect = nextSlot ? (nextSlot.w / nextSlot.h) * (2 / 3) : null;
  const showCropGuide = !cameraError && cropAspect !== null;

  useEffect(() => {
    if (done) return;
    let cancelled = false;
    // Some in-app browsers (WhatsApp/Instagram) grant the camera stream but never actually
    // start playback — no error is thrown, the preview just stays blank forever. Treat that
    // as a failure too, instead of leaving the customer stuck with no feedback at all.
    let stuckTimer: ReturnType<typeof setTimeout> | null = null;
    let attachedVideo: HTMLVideoElement | null = null;

    const clearStuckTimer = () => {
      if (stuckTimer) {
        clearTimeout(stuckTimer);
        stuckTimer = null;
      }
    };
    const onPlaying = () => {
      clearStuckTimer();
      setCameraError(null);
    };

    async function startCamera() {
      setCameraError(null);
      setTorchSupported(false);
      setTorchOn(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        stuckTimer = setTimeout(() => {
          if (!cancelled) {
            setCameraError("Kamera gak kunjung muncul. Coba lagi, atau refresh halaman ini.");
          }
        }, 6000);

        const video = videoRef.current;
        if (video) {
          attachedVideo = video;
          video.addEventListener("playing", onPlaying);
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // autoplay can be rejected in some in-app browsers — the stuck-timer above
            // catches this too, but retrying play() immediately often just works.
          }
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
        setTorchSupported(!!capabilities?.torch);
      } catch (err) {
        clearStuckTimer();
        setCameraError(
          err instanceof Error
            ? err.message
            : "Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan.",
        );
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      clearStuckTimer();
      attachedVideo?.removeEventListener("playing", onPlaying);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode, done, retryToken]);

  const retryCamera = () => setRetryToken((n) => n + 1);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextOn = !torchOn;
      const constraints: { advanced: TorchConstraintSet[] } = { advanced: [{ torch: nextOn }] };
      await track.applyConstraints(constraints as MediaTrackConstraints);
      setTorchOn(nextOn);
    } catch {
      // Some browsers report the torch capability but reject the constraint anyway — no-op.
    }
  };

  const capturePhoto = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const dataUrl = capturePhoto();
      if (dataUrl) {
        const shot: Shot = { slotId: shootSlots[taken.length]!.id, dataUrl };
        setShots(sessionKey, [...taken, shot]);
      }
      setFlash(true);
      setCountdown(null);
      const t = setTimeout(() => setFlash(false), 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  return (
    <main className="flex min-h-screen flex-col bg-background/95">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pt-5 pb-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="tap-press grid h-10 w-10 place-items-center rounded-2xl bg-card/15 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Kembali"
            className="tap-press grid h-10 w-10 place-items-center rounded-2xl bg-card/15 text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0 text-center">
          {eyebrow && <p className="truncate text-xs font-bold text-foreground/60">{eyebrow}</p>}
          <p className="truncate font-display text-base font-extrabold text-foreground">
            Foto {Math.min(taken.length + 1, total)} dari {total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              onClick={toggleTorch}
              aria-label={torchOn ? "Matikan flash" : "Nyalakan flash"}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-2xl text-foreground",
                torchOn ? "bg-primary text-primary-foreground" : "bg-card/15",
              )}
            >
              {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            aria-label="Ganti kamera"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-card/15 text-foreground"
          >
            <SwitchCamera className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="px-5">
        <div className="flex gap-1.5">
          {shootSlots.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                i < taken.length ? "bg-primary" : "bg-foreground/25",
              )}
            />
          ))}
        </div>
      </div>

      {/* Real camera preview */}
      <div className="relative mx-5 mt-4 flex-1 overflow-hidden rounded-3xl bg-secondary">
        {cameraError ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <VideoOff className="mx-auto h-8 w-8 text-foreground/50" />
              <p className="mt-3 text-sm font-bold text-foreground">Kamera tidak tersedia</p>
              <p className="mt-1 text-xs font-medium text-foreground/60">{cameraError}</p>
              <button
                onClick={retryCamera}
                className="tap-press mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              facingMode === "user" && "-scale-x-100",
            )}
          />
        )}

        {/* Crop guide — everything dimmed outside is trimmed away once the shot lands in its
            slot, so the customer can reframe (step back, turn the phone) before shooting. */}
        {showCropGuide && (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0 m-auto rounded-lg border-2 border-white/80"
              style={{
                aspectRatio: String(cropAspect),
                maxWidth: "92%",
                maxHeight: "92%",
                boxShadow: "0 0 0 999px rgba(0,0,0,0.45)",
              }}
            />
          </div>
        )}

        {/* camera HUD — the crop guide above already frames the shot once it's showing, so this
            generic viewfinder border only appears when there's nothing else to frame it. */}
        {!showCropGuide && <div className="absolute inset-4 rounded-2xl border-2 border-card/50" />}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-background/40 px-2.5 py-1 text-[11px] font-extrabold text-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> LIVE
        </div>

        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 grid place-items-center bg-background/25">
            <span
              key={countdown}
              className="animate-countdown font-display text-[7rem] leading-none font-extrabold text-foreground drop-shadow-lg"
            >
              {countdown}
            </span>
          </div>
        )}
        {flash && <div className="animate-flash absolute inset-0 bg-white" />}
        {done && (
          <div className="animate-pop-in absolute inset-x-4 bottom-4 rounded-2xl bg-card/90 p-3 text-center backdrop-blur">
            <p className="text-sm font-extrabold">Semua foto selesai! 🎉</p>
            <p className="text-xs font-semibold text-muted-foreground">
              Lanjut lihat hasil composite kamu
            </p>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="mt-4 flex justify-center gap-2.5 overflow-x-auto px-5 pb-1">
        {shootSlots.map((slot, i) => {
          const shot = taken[i];
          return (
            <div key={slot.id} className="shrink-0">
              <div
                className={cn(
                  "relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border-2 text-xl",
                  shot ? "animate-pop-in border-primary" : "border-foreground/25 bg-card/10",
                  !shot && i === taken.length && "border-foreground/70",
                )}
              >
                {shot ? (
                  <img src={shot.dataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-foreground/50">{i + 1}</span>
                )}
              </div>
              {shot && (
                <button
                  onClick={() => setShots(sessionKey, taken.filter((_, idx) => idx !== i))}
                  className="tap-press mt-1.5 flex w-16 items-center justify-center gap-1 rounded-full bg-card/15 py-1 text-[10px] font-extrabold text-foreground"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Retake
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 pt-4 pb-7">
        {done ? (
          <button
            onClick={onDone}
            className="tap-press w-full rounded-full bg-gradient-primary py-4 font-display text-base font-extrabold text-primary-foreground shadow-pop"
          >
            Lihat Hasil ✨
          </button>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShots(sessionKey, [])}
                disabled={taken.length === 0}
                className="tap-press flex h-12 items-center gap-1.5 rounded-full bg-card/15 px-4 text-xs font-extrabold text-foreground disabled:opacity-30"
              >
                <RefreshCw className="h-4 w-4" /> Retake
              </button>
            </div>
            <button
              onClick={() => setCountdown(3)}
              disabled={countdown !== null || !!cameraError}
              aria-label="Ambil foto"
              className="tap-press grid h-20 w-20 place-items-center rounded-full border-4 border-foreground/70 bg-gradient-primary shadow-pop disabled:opacity-60"
            >
              <span className="h-14 w-14 rounded-full bg-foreground/20" />
            </button>
            <div className="flex justify-start">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-card/15 text-xs font-extrabold text-foreground">
                {taken.length}/{total}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
