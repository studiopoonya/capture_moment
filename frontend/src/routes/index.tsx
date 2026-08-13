import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Camera, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { FrameComposite } from "@/components/FrameComposite";
import { getFrames } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capture Moments — Photobooth Pastel di HP Kamu" },
      {
        name: "description",
        content:
          "Pilih frame pastel favoritmu, ambil foto berurutan lewat kamera HP, dan langsung dapat photostrip siap dibagikan.",
      },
      { property: "og:title", content: "Capture Moments — Photobooth Pastel di HP Kamu" },
      {
        property: "og:description",
        content: "Frame lucu, countdown 3-2-1, hasil composite otomatis. Gratis dan tanpa install.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: frames = [] } = useQuery({ queryKey: ["frames"], queryFn: getFrames });
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const activeFrames = frames.filter((f) => f.active);
  const chosen = activeFrames.find((f) => f.id === selected);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add("landing-light");
    return () => document.documentElement.classList.remove("landing-light");
  }, []);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-frame-card]");
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.6;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-background pb-32">
      <div className="mx-auto w-full max-w-md px-5">
        <header className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-soft">
            <Camera className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-shimmer">Capture Moments</h1>
            <p className="text-xs font-semibold text-muted-foreground">by Poonya Moments</p>
          </div>
        </header>

        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg font-extrabold">Pilih Frame</h3>
            <span className="text-xs font-bold text-muted-foreground">
              {activeFrames.length} frame tersedia
            </span>
          </div>

          <div className="relative mt-4">
            <div
              ref={scrollerRef}
              className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pt-4 pb-2"
            >
              {activeFrames.map((frame, i) => {
                const isSelected = selected === frame.id;
                return (
                  <div
                    key={frame.id}
                    data-frame-card
                    className="flex w-full shrink-0 snap-center justify-center"
                  >
                    <motion.button
                      onClick={() =>
                        setSelected((prev) => (prev === frame.id ? null : frame.id))
                      }
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.35, ease: "easeOut" }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "w-fit rounded-3xl bg-card p-2.5 text-left",
                        isSelected && "ring-3 ring-primary",
                      )}
                    >
                      <div className="relative">
                        <FrameComposite frame={frame} hideEmptySlots className="h-72 w-auto" />
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-pop"
                          >
                            <Check className="h-4 w-4" />
                          </motion.span>
                        )}
                      </div>
                      <div className="px-1 pt-2.5 pb-1">
                        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-extrabold text-secondary-foreground">
                          {frame.slots.length} Photo{frame.slots.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </motion.button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Frame sebelumnya"
              onClick={() => scrollByCard(-1)}
              className="tap-press absolute top-1/2 left-1 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Frame berikutnya"
              onClick={() => scrollByCard(1)}
              className="tap-press absolute top-1/2 right-1 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-card/85 px-5 pt-3 pb-5 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-muted-foreground">
              {chosen ? "Frame dipilih" : "Belum ada frame dipilih"}
            </p>
            <p className="truncate text-sm font-extrabold">
              {chosen ? `${chosen.name} · ${chosen.slots.length} foto` : "Pilih salah satu di atas"}
            </p>
          </div>
          <button
            disabled={!chosen}
            onClick={() =>
              chosen &&
              navigate({ to: "/capture/$frameId", params: { frameId: String(chosen.id) } })
            }
            className="tap-press shrink-0 rounded-full bg-gradient-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-pop disabled:opacity-40 disabled:shadow-none"
          >
            Mulai Sesi
          </button>
        </div>
      </div>
    </main>
  );
}
