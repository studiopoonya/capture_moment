import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Home,
  Instagram,
  Mail,
  Mic,
  RefreshCw,
  Share2,
  Sticker as StickerIcon,
  Square,
  Trash2,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FrameComposite } from "@/components/FrameComposite";
import { RevealAnimation } from "@/components/RevealAnimation";
import {
  composeIndividualPhotos,
  composeResultGif,
  composeResultImage,
  toCanvasSafeUrl,
} from "@/lib/compose-result";
import { usePhotobooth } from "@/lib/photobooth-store";
import {
  attachSessionResultGif,
  attachSessionResultVoice,
  generateSessionResultVideo,
  uploadSessionResult,
  type Frame,
  type PhotoFilter,
  type Sticker,
} from "@/lib/api";

const SHARE_TARGETS = [
  { id: "email" as const, label: "Email", Icon: Mail, tone: "bg-sky text-sky-foreground" },
  {
    id: "instagram" as const,
    label: "Instagram",
    Icon: Instagram,
    tone: "bg-secondary text-secondary-foreground",
  },
  { id: "save" as const, label: "Simpan ke HP", Icon: Download, tone: "bg-mint text-mint-foreground" },
];

type FilterOption = { id: string; label: string; css: string };

const BUILTIN_FILTERS: FilterOption[] = [
  { id: "none", label: "Original", css: "" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.65) contrast(1.05) saturate(1.1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.3) contrast(0.9) saturate(0.85) brightness(1.05)" },
  { id: "warm", label: "Warm", css: "saturate(1.2) sepia(0.15) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(-10deg) brightness(1.02)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.5) contrast(1.1)" },
];

type StickerOption = { id: string; label: string; kind: "emoji" | "image"; value: string };

const BUILTIN_STICKERS: StickerOption[] = [
  "💖", "⭐", "✨", "🎉", "😎", "🎀", "🎈", "🌸", "👑", "🔥", "🥹", "💫",
].map((emoji, i) => ({ id: `emoji-${i}`, label: emoji, kind: "emoji", value: emoji }));

type PlacedSticker = {
  id: string;
  kind: "emoji" | "image";
  value: string;
  x: number;
  y: number;
  scale: number;
};

type Stage = "filter" | "sticker" | "voice" | "reveal" | "final";

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

type Props = {
  frame: Frame;
  sessionKey: string;
  eyebrow?: string;
  onRetake: () => void;
  homeLabel?: string;
  /** Filters this session is allowed to use — empty/omitted falls back to the built-in set. */
  filters?: PhotoFilter[];
  /** Stickers this session is allowed to use — empty/omitted falls back to the built-in emoji set. */
  stickers?: Sticker[];
  /** When set (customer-session flow only), the finished shot is auto-uploaded to the admin gallery. */
  sessionId?: number;
};

export function PhotoboothResult({
  frame,
  sessionKey,
  eyebrow,
  onRetake,
  homeLabel = "Frame Lain",
  filters,
  stickers,
  sessionId,
}: Props) {
  const { shots } = usePhotobooth();
  const taken = shots[sessionKey] ?? [];

  const filterOptions: FilterOption[] = [
    BUILTIN_FILTERS[0]!, // "Original" — always available, even when the session has custom filters.
    ...(filters && filters.length > 0
      ? filters.map((f) => ({ id: String(f.id), label: f.name, css: f.css }))
      : BUILTIN_FILTERS.slice(1)),
  ];
  const stickerOptions: StickerOption[] =
    stickers && stickers.length > 0
      ? stickers.map((s) => ({ id: String(s.id), label: s.name, kind: "image" as const, value: s.image }))
      : BUILTIN_STICKERS;

  const [stage, setStage] = useState<Stage>("filter");
  const [filterId, setFilterId] = useState(filterOptions[0]!.id);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifGenerating, setGifGenerating] = useState(false);
  const [gifProgress, setGifProgress] = useState<number | null>(null);
  const [singleUrls, setSingleUrls] = useState<string[] | null>(null);
  const [singleBlobs, setSingleBlobs] = useState<Blob[] | null>(null);
  const [singleIndex, setSingleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"photo" | "single" | "gif">("photo");
  const [resultId, setResultId] = useState<number | null>(null);
  const [isGeneratingVoiceVideo, setIsGeneratingVoiceVideo] = useState(false);
  const compositeRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeFilter = filterOptions.find((f) => f.id === filterId) ?? filterOptions[0]!;
  const interactive = stage === "sticker";

  const buildFile = async () => {
    const blob = await composeResultImage(frame, taken, activeFilter.css, placedStickers);
    return new File([blob], `capture-moments-${Date.now()}.png`, { type: "image/png" });
  };

  const saveFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setVoiceBlob(blob);
        setVoiceUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Gak bisa akses mikrofon — cek izin browser ya.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const discardRecording = () => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceBlob(null);
    setVoiceUrl(null);
    setRecordSeconds(0);
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    };
  }, [voiceUrl]);

  // Once the customer confirms the voice-message step and the reveal animation starts: save the
  // still photo to the gallery, attach the voice message (if any), then build the looping GIF for
  // on-screen preview (and attach it to the same gallery entry once ready). This all runs in the
  // background while the reveal animation plays on its own fixed timer.
  const finalizedRef = useRef(false);
  useEffect(() => {
    if (stage !== "reveal" || finalizedRef.current) return;
    finalizedRef.current = true;

    (async () => {
      let resultId: number | null = null;
      if (sessionId) {
        try {
          const file = await buildFile();
          const result = await uploadSessionResult(sessionId, frame.id, file);
          resultId = result.id;
          setResultId(result.id);
          if (voiceBlob) {
            const ext = voiceBlob.type.includes("mp4") ? "m4a" : "webm";
            const voiceFile = new File([voiceBlob], `capture-moments-voice-${Date.now()}.${ext}`, {
              type: voiceBlob.type || "audio/webm",
            });
            attachSessionResultVoice(resultId, voiceFile).catch(() => {});
          }
        } catch {
          // Best-effort — the gallery upload shouldn't block or worry the customer.
        }
      }

      try {
        const blobs = await composeIndividualPhotos(frame, taken, activeFilter.css, placedStickers);
        setSingleBlobs(blobs);
        setSingleUrls(blobs.map((b) => URL.createObjectURL(b)));
      } catch {
        // Best-effort — leave the "Satuan" tab unavailable if this fails.
      }

      setGifGenerating(true);
      try {
        const blob = await composeResultGif(frame, taken, activeFilter.css, placedStickers, (p) =>
          setGifProgress(Math.round(p * 100)),
        );
        setGifBlob(blob);
        setGifUrl(URL.createObjectURL(blob));
        if (resultId) {
          const gifFile = new File([blob], `capture-moments-${Date.now()}.gif`, {
            type: "image/gif",
          });
          attachSessionResultGif(resultId, gifFile).catch(() => {});
        }
      } catch {
        // Best-effort — leave the GIF card showing its "couldn't be made" fallback.
      } finally {
        setGifGenerating(false);
        setGifProgress(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  useEffect(() => {
    return () => {
      singleUrls?.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [singleUrls]);

  const handleDownloadPhotoFile = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const file = await buildFile();
      saveFile(file);
      toast.success("Foto tersimpan ke perangkat");
    } catch {
      toast.error("Gagal menyimpan foto");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePhoto = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const file = await buildFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Capture Moments" });
      } else {
        saveFile(file);
        toast("Browser ini belum bisa share langsung — foto didownload aja ya.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error("Gagal membagikan foto");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareTo = async (target: "email" | "instagram") => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const file = await buildFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Capture Moments",
          text: "Hasil photobooth dari Capture Moments ✨",
        });
      } else if (target === "email") {
        saveFile(file);
        window.location.href = `mailto:?subject=${encodeURIComponent("Hasil Capture Moments")}&body=${encodeURIComponent("Foto hasil photobooth aku udah kesimpan di HP, tinggal lampirkan ya!")}`;
      } else {
        saveFile(file);
        toast("Foto tersimpan — browser ini belum bisa share langsung, upload manual ke Instagram ya.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error("Gagal membagikan foto");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadGifFile = () => {
    if (!gifBlob) return;
    saveFile(new File([gifBlob], `capture-moments-${Date.now()}.gif`, { type: "image/gif" }));
    toast.success("GIF tersimpan ke perangkat");
  };

  const handleShareGif = async () => {
    if (!gifBlob) return;
    const file = new File([gifBlob], `capture-moments-${Date.now()}.gif`, { type: "image/gif" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Capture Moments" });
      } else {
        saveFile(file);
        toast("Browser ini belum bisa share langsung — GIF-nya didownload aja ya.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error("Gagal membagikan GIF");
      }
    }
  };

  const handleDownloadSingleFile = () => {
    const blob = singleBlobs?.[singleIndex];
    if (!blob) return;
    saveFile(
      new File([blob], `capture-moments-${singleIndex + 1}-${Date.now()}.png`, {
        type: "image/png",
      }),
    );
    toast.success("Foto tersimpan ke perangkat");
  };

  const handleShareSingle = async () => {
    const blob = singleBlobs?.[singleIndex];
    if (!blob) return;
    const file = new File([blob], `capture-moments-${singleIndex + 1}-${Date.now()}.png`, {
      type: "image/png",
    });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Capture Moments" });
      } else {
        saveFile(file);
        toast("Browser ini belum bisa share langsung — foto didownload aja ya.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error("Gagal membagikan foto");
      }
    }
  };

  const handleDownloadVoiceVideo = async () => {
    if (!resultId || isGeneratingVoiceVideo) return;
    setIsGeneratingVoiceVideo(true);
    try {
      const updated = await generateSessionResultVideo(resultId);
      if (!updated.video) throw new Error("Video gagal dibuat");
      const res = await fetch(toCanvasSafeUrl(updated.video));
      const blob = await res.blob();
      saveFile(new File([blob], `capture-moments-${Date.now()}-suara.mp4`, { type: "video/mp4" }));
      toast.success("Video foto + suara tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat video");
    } finally {
      setIsGeneratingVoiceVideo(false);
    }
  };

  const addSticker = (option: StickerOption) => {
    const id = `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const jitter = () => Math.random() * 12 - 6;
    setPlacedStickers((prev) => [
      ...prev,
      {
        id,
        kind: option.kind,
        value: option.value,
        x: clamp(50 + jitter(), 15, 85),
        y: clamp(50 + jitter(), 15, 85),
        scale: 1,
      },
    ]);
    setSelectedStickerId(id);
  };

  const removeSticker = (id: string) => {
    setPlacedStickers((prev) => prev.filter((s) => s.id !== id));
    setSelectedStickerId((cur) => (cur === id ? null : cur));
  };

  const startStickerDrag = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStickerId(id);
    const rect = compositeRef.current?.getBoundingClientRect();
    const origin = placedStickers.find((s) => s.id === id);
    if (!rect || !origin) return;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      const nx = clamp(origin.x + dx, 0, 100);
      const ny = clamp(origin.y + dy, 0, 100);
      setPlacedStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startStickerResize = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = placedStickers.find((s) => s.id === id);
    if (!origin) return;
    const startX = e.clientX;

    const onMove = (ev: PointerEvent) => {
      const ds = (ev.clientX - startX) / 120;
      const nscale = clamp(origin.scale + ds, 0.5, 3);
      setPlacedStickers((prev) => prev.map((s) => (s.id === id ? { ...s, scale: nscale } : s)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const stageCopy: Record<Stage, { badge: string; title: string; desc: string }> = {
    filter: {
      badge: eyebrow ?? "hasil kamu udah jadi!",
      title: "Pilih filter dulu yuk",
      desc: "Pilih tampilan warna favoritmu, atau biarin Original.",
    },
    sticker: {
      badge: eyebrow ?? "hasil kamu udah jadi!",
      title: "Tempel stiker lucu",
      desc: "Tap stiker buat nambahin, geser & resize sesukamu.",
    },
    voice: {
      badge: eyebrow ?? "hasil kamu udah jadi!",
      title: "Kirim pesan suara?",
      desc: "Rekam ucapan singkat buat mempelai, atau lewati aja.",
    },
    reveal: { badge: "", title: "", desc: "" },
    final: {
      badge: eyebrow ?? "hasil kamu udah jadi!",
      title: "Cute banget 🥹",
      desc: `${frame.name} · ${frame.slots.length} foto`,
    },
  };
  const copy = stageCopy[stage];

  if (stage === "reveal") {
    return (
      <RevealAnimation
        frame={frame}
        shots={taken}
        filterCss={activeFilter.css}
        onComplete={() => setStage("final")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-hero pb-10">
      <div className="mx-auto w-full max-w-md px-5">
        <header className="animate-fade-up pt-8 text-center">
          <span className="inline-block rounded-full bg-card px-3 py-1 text-xs font-extrabold text-primary shadow-soft">
            {copy.badge}
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold">{copy.title}</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{copy.desc}</p>
        </header>

        <div className="animate-pop-in mt-6">
          {stage === "final" && viewMode === "gif" && gifUrl ? (
            <div className="overflow-hidden rounded-2xl">
              <img src={gifUrl} alt="GIF looping hasil foto" className="w-full" />
            </div>
          ) : stage === "final" && viewMode === "single" && singleUrls ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src={singleUrls[singleIndex]}
                alt={`Foto satuan ${singleIndex + 1}`}
                className="w-full"
              />
              {singleUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Foto sebelumnya"
                    onClick={() =>
                      setSingleIndex((i) => (i - 1 + singleUrls.length) % singleUrls.length)
                    }
                    className="tap-press absolute top-1/2 left-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/70 text-foreground shadow-soft backdrop-blur"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Foto berikutnya"
                    onClick={() => setSingleIndex((i) => (i + 1) % singleUrls.length)}
                    className="tap-press absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/70 text-foreground shadow-soft backdrop-blur"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {singleUrls.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          i === singleIndex ? "bg-primary" : "bg-background/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div ref={compositeRef} className="relative touch-none select-none">
              <FrameComposite frame={frame} shots={taken} filterCss={activeFilter.css} />
              <div
                className="absolute inset-0"
                onPointerDown={() => interactive && setSelectedStickerId(null)}
              >
                {placedStickers.map((s) => {
                  const selected = interactive && selectedStickerId === s.id;
                  return (
                    <div
                      key={s.id}
                      onPointerDown={interactive ? (e) => startStickerDrag(e, s.id) : undefined}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                        interactive ? "cursor-move touch-none" : "pointer-events-none"
                      }`}
                    >
                      <div
                        className={`grid place-items-center rounded-full leading-none ${
                          selected ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                      >
                        {s.kind === "emoji" ? (
                          <span style={{ fontSize: `${44 * s.scale}px`, lineHeight: 1 }}>
                            {s.value}
                          </span>
                        ) : (
                          <img
                            src={s.value}
                            alt=""
                            draggable={false}
                            style={{ width: `${44 * s.scale}px`, height: `${44 * s.scale}px` }}
                            className="pointer-events-none object-contain select-none"
                          />
                        )}
                      </div>
                      {selected && (
                        <>
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              removeSticker(s.id);
                            }}
                            className="tap-press absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white shadow-md"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div
                            onPointerDown={(e) => startStickerResize(e, s.id)}
                            className="tap-press absolute -bottom-1 -right-1 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-card bg-primary shadow-md"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {stage === "final" && (
            <p className="pt-3 text-center text-[11px] font-extrabold tracking-widest text-muted-foreground uppercase">
              capture moments · {new Date().toLocaleDateString("id-ID")}
            </p>
          )}
        </div>

        {stage === "filter" && (
          <div className="animate-fade-up mt-5 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5" /> Filter
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {filterOptions.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterId(f.id)}
                    className={`tap-press flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 ${
                      filterId === f.id ? "bg-card shadow-soft ring-2 ring-primary" : ""
                    }`}
                  >
                    <span
                      className="h-11 w-11 rounded-xl bg-cover bg-center"
                      style={{
                        // Preview against an actual captured photo, not the frame graphic —
                        // the filter only ever applies to photos, so a swatch against the
                        // frame's paper texture wouldn't show how strong the effect really is.
                        backgroundImage: `url(${taken[0]?.dataUrl ?? frame.image})`,
                        filter: f.css || undefined,
                      }}
                    />
                    <span className="max-w-14 truncate text-[10px] font-extrabold text-foreground">
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStage("sticker")}
              className="tap-press w-full rounded-full bg-gradient-primary py-4 font-display text-base font-extrabold text-primary-foreground shadow-pop"
            >
              Lanjut ke Stiker →
            </button>
          </div>
        )}

        {stage === "sticker" && (
          <div className="animate-fade-up mt-5 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <StickerIcon className="h-3.5 w-3.5" /> Stiker
                <span className="font-semibold normal-case text-muted-foreground/70">
                  — tap buat nambah, geser & resize di foto
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {stickerOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => addSticker(opt)}
                    className="tap-press grid h-11 w-11 place-items-center rounded-2xl bg-card text-2xl shadow-soft"
                  >
                    {opt.kind === "emoji" ? (
                      opt.value
                    ) : (
                      <img src={opt.value} alt={opt.label} className="h-7 w-7 object-contain" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStage("filter")}
              className="tap-press flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card py-3 text-sm font-extrabold text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Ganti Filter
            </button>
            <button
              onClick={() => setStage(sessionId ? "voice" : "reveal")}
              className="tap-press w-full rounded-full bg-gradient-primary py-4 font-display text-base font-extrabold text-primary-foreground shadow-pop"
            >
              Selesai ✨
            </button>
          </div>
        )}

        {stage === "voice" && (
          <div className="animate-fade-up mt-5 space-y-4">
            <div className="rounded-3xl bg-card p-4 shadow-soft">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <Mic className="h-3.5 w-3.5" /> Pesan suara untuk mempelai
                <span className="font-semibold normal-case text-muted-foreground/70">
                  — opsional
                </span>
              </p>

              {voiceUrl ? (
                <div className="mt-3 space-y-2">
                  <audio controls src={voiceUrl} className="w-full" />
                  <button
                    type="button"
                    onClick={discardRecording}
                    className="tap-press flex items-center gap-1.5 text-xs font-bold text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus & rekam ulang
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`tap-press mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-extrabold ${
                    isRecording
                      ? "bg-destructive text-white"
                      : "bg-gradient-primary text-primary-foreground"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4" /> Berhenti · {recordSeconds}d
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" /> Rekam Pesan Suara
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={() => setStage("sticker")}
              className="tap-press flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card py-3 text-sm font-extrabold text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Balik ke Stiker
            </button>
            <button
              onClick={() => setStage("reveal")}
              disabled={isRecording}
              className="tap-press w-full rounded-full bg-gradient-primary py-4 font-display text-base font-extrabold text-primary-foreground shadow-pop disabled:opacity-60"
            >
              {voiceUrl ? "Lanjut ke Hasil →" : "Lewati & Lanjut →"}
            </button>
          </div>
        )}

        {stage === "final" && (
          <div className="animate-fade-up mt-4 space-y-3">
            {(singleUrls || gifUrl) && (
              <div className="flex gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
                <button
                  onClick={() => setViewMode("photo")}
                  className={`tap-press flex-1 rounded-full py-1.5 text-xs font-extrabold ${
                    viewMode === "photo"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Foto
                </button>
                {singleUrls && (
                  <button
                    onClick={() => setViewMode("single")}
                    className={`tap-press flex-1 rounded-full py-1.5 text-xs font-extrabold ${
                      viewMode === "single"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Satuan
                  </button>
                )}
                {gifUrl && (
                  <button
                    onClick={() => setViewMode("gif")}
                    className={`tap-press flex-1 rounded-full py-1.5 text-xs font-extrabold ${
                      viewMode === "gif"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Film className="mr-1 inline h-3 w-3" /> GIF
                  </button>
                )}
              </div>
            )}
            {gifGenerating && (
              <p className="text-center text-xs font-bold text-muted-foreground">
                Menyiapkan GIF looping... {gifProgress ?? 0}%
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={
                  viewMode === "gif"
                    ? handleDownloadGifFile
                    : viewMode === "single"
                      ? handleDownloadSingleFile
                      : handleDownloadPhotoFile
                }
                disabled={isExporting}
                className="tap-press flex items-center justify-center gap-2 rounded-full bg-gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-pop disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {isExporting ? "Menyiapkan..." : "Download"}
              </button>
              <button
                onClick={
                  viewMode === "gif"
                    ? handleShareGif
                    : viewMode === "single"
                      ? handleShareSingle
                      : handleSharePhoto
                }
                disabled={isExporting}
                className="tap-press flex items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card py-3.5 text-sm font-extrabold text-primary disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" /> Bagikan
              </button>
            </div>

            {voiceBlob && (
              <button
                onClick={handleDownloadVoiceVideo}
                disabled={isGeneratingVoiceVideo || !resultId}
                className="tap-press flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card py-3.5 text-sm font-extrabold text-primary disabled:opacity-60"
              >
                <Video className="h-4 w-4" />
                {isGeneratingVoiceVideo ? "Menyiapkan video..." : "Download Foto + Suara"}
              </button>
            )}

            <div className="rounded-3xl bg-card/85 p-4 shadow-soft backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                <Share2 className="h-3.5 w-3.5" /> Bagikan ke
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SHARE_TARGETS.map((s) => (
                  <button
                    key={s.id}
                    disabled={isExporting}
                    onClick={() => (s.id === "save" ? handleDownloadPhotoFile() : handleShareTo(s.id))}
                    className={`tap-press flex flex-col items-center gap-1 rounded-2xl ${s.tone} px-1 py-3 text-[11px] font-extrabold disabled:opacity-60`}
                  >
                    <s.Icon className="h-5 w-5" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onRetake}
                className="tap-press flex items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card py-3.5 text-sm font-extrabold text-primary"
              >
                <RefreshCw className="h-4 w-4" /> Ulangi Sesi
              </button>
              <Link
                to="/"
                className="tap-press flex items-center justify-center gap-2 rounded-full bg-card py-3.5 text-sm font-extrabold text-foreground shadow-soft"
              >
                <Home className="h-4 w-4" /> {homeLabel}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
