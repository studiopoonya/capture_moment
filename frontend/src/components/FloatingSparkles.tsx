import { useState, type CSSProperties } from "react";

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 7 + Math.random() * 7,
    delay: Math.random() * 7,
    drift: Math.random() * 50 - 25,
  }));
}

/**
 * Drifting gold light particles for the wedding-branded dark screens (welcome + reveal) —
 * purely decorative ambiance, sits behind the foreground content.
 */
export function FloatingSparkles({ count = 16 }: { count?: number }) {
  const [particles] = useState(() => makeParticles(count));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-float-up absolute rounded-full"
          style={
            {
              left: `${p.left}%`,
              bottom: "-5%",
              width: p.size,
              height: p.size,
              background: "radial-gradient(circle, #f4e2b8 0%, rgba(244,226,184,0) 70%)",
              animationDelay: `${p.delay}s`,
              "--particle-duration": `${p.duration}s`,
              "--drift": `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
