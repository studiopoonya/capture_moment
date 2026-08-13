import { ChevronRight } from "lucide-react";
import { FloatingSparkles } from "@/components/FloatingSparkles";

type Props = {
  photoUrl?: string | null;
  title?: string | null;
  customerName: string;
  onContinue: () => void;
};

/**
 * Full-bleed "Happy Wedding" moment shown once a guest opens their session link,
 * before they pick a frame. Deliberately styled outside the app's pastel theme
 * tokens — this is the couple's own branded moment, not a Capture Moments screen.
 *
 * Uses plain CSS @keyframes (via the animate-* utility tokens in styles.css) rather than
 * framer-motion — framer-motion's mount `initial`→`animate` transition was found to resolve
 * instantly to its end state in this project (reproduced in both dev and production builds),
 * so CSS animations are the reliable path here.
 */
export function WelcomeScreen({ photoUrl, title, customerName, onContinue }: Props) {
  const headline = title?.trim() || `Happy Wedding ${customerName}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0f0f]">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
      ) : (
        <div
          className="animate-ken-burns absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, #4a2020 0%, #2a1212 55%, #180a0a 100%)",
          }}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,4,4,0.35) 0%, rgba(10,4,4,0.25) 35%, rgba(10,4,4,0.65) 70%, rgba(10,4,4,0.92) 100%)",
        }}
        aria-hidden
      />

      <FloatingSparkles />

      <div className="relative flex min-h-screen flex-col items-center justify-end px-6 pb-12 text-center">
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold tracking-[0.35em] text-[#e8c98a] uppercase">
            Virtual Photobooth
          </p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase">
            by Poonya Moments
          </p>
        </div>

        <div className="animate-fade-up relative mt-4" style={{ animationDelay: "0.15s" }}>
          <div
            aria-hidden
            className="animate-pulse-glow absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,201,138,0.35) 0%, transparent 70%)" }}
          />
          <h1
            className="font-elegant text-4xl leading-tight font-semibold text-white italic"
            style={{ textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}
          >
            {headline}
          </h1>
        </div>

        <div
          className="animate-fade-up mt-5 h-px w-16 bg-[#e8c98a]"
          style={{ animationDelay: "0.4s" }}
        />

        <p
          className="animate-fade-up mt-5 max-w-xs text-sm font-medium text-white/75"
          style={{ animationDelay: "0.5s" }}
        >
          Terima kasih sudah hadir merayakan hari bahagia kami. Abadikan momenmu di sini ✨
        </p>

        <button
          onClick={onContinue}
          className="animate-fade-up tap-press mt-8 flex items-center gap-2 rounded-full border border-[#e8c98a]/70 bg-[#e8c98a]/10 px-8 py-3.5 text-sm font-bold tracking-wide text-[#f4e2b8] backdrop-blur-sm"
          style={{ animationDelay: "0.7s" }}
        >
          Mulai Momen
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}
