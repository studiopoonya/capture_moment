import { useEffect } from "react";
import { FloatingSparkles } from "@/components/FloatingSparkles";
import type { Frame } from "@/lib/api";
import type { Shot } from "@/lib/photobooth-store";

type Props = {
  frame: Frame;
  shots: Shot[];
  filterCss?: string;
  onComplete: () => void;
};

const STAGGER = 0.35;
const ITEM_DURATION = 0.55;
const BASE_DELAY = 0.3;

/**
 * One-time cinematic reveal shown right after the guest finishes the voice-message step —
 * each captured photo fades into its slot in sequence before the frame graphic settles on top,
 * then auto-advances to the final downloadable result.
 *
 * Uses plain CSS @keyframes (see the note in WelcomeScreen.tsx) instead of framer-motion.
 */
export function RevealAnimation({ frame, shots, filterCss, onComplete }: Props) {
  const totalMs = (BASE_DELAY + frame.slots.length * STAGGER + ITEM_DURATION + 0.7) * 1000;
  const frameImageDelay = BASE_DELAY + frame.slots.length * STAGGER + 0.15;
  const captionDelay = BASE_DELAY + frame.slots.length * STAGGER + 0.5;

  useEffect(() => {
    const t = setTimeout(onComplete, totalMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#1a0f0f] px-6">
      <div
        className="animate-ken-burns absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 35%, #4a2020 0%, #2a1212 55%, #180a0a 100%)",
        }}
        aria-hidden
      />

      <FloatingSparkles count={12} />

      <div className="relative flex flex-col items-center">
        <p className="animate-fade-in mb-6 text-[11px] font-semibold tracking-[0.35em] text-[#e8c98a] uppercase">
          Menyusun momen kamu
        </p>

        <div
          aria-hidden
          className="animate-pulse-glow absolute top-1/2 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(232,201,138,0.3) 0%, transparent 70%)" }}
        />

        <div className="relative aspect-2/3 w-56 overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          {frame.slots.map((slot, i) => {
            const shot = shots[i];
            if (!shot) return null;
            return (
              <div
                key={slot.id}
                className="animate-photo-reveal absolute overflow-hidden"
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.w}%`,
                  height: `${slot.h}%`,
                  animationDelay: `${BASE_DELAY + i * STAGGER}s`,
                }}
              >
                <img
                  src={shot.dataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={filterCss ? { filter: filterCss } : undefined}
                />
              </div>
            );
          })}

          <img
            src={frame.image}
            alt=""
            aria-hidden
            className="animate-fade-in pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-multiply"
            style={{ animationDelay: `${frameImageDelay}s` }}
          />
        </div>

        <p
          className="animate-fade-up font-elegant mt-7 text-lg text-white italic"
          style={{ animationDelay: `${captionDelay}s` }}
        >
          Cute banget 🥹
        </p>
      </div>
    </main>
  );
}
