import { useId } from "react";
import { cn } from "@/lib/utils";
import type { Frame } from "@/lib/api";
import type { Shot } from "@/lib/photobooth-store";

type Props = {
  frame: Frame;
  shots?: Shot[];
  className?: string;
  showSlotLabels?: boolean;
  activeSlotIndex?: number;
  instant?: boolean;
  /** Skip the placeholder border/number entirely for empty slots — just the frame graphic. */
  hideEmptySlots?: boolean;
  /** CSS filter() applied to the photos only — the frame graphic is never color-graded. */
  filterCss?: string;
};

export function FrameComposite({
  frame,
  shots = [],
  className,
  showSlotLabels = false,
  activeSlotIndex,
  instant = false,
  hideEmptySlots = false,
  filterCss,
}: Props) {
  const maskId = useId();
  // Some frame graphics (esp. JPGs) have no transparent window over the photo area, so
  // multiply-blending them full-bleed would permanently tint every photo underneath —
  // mask out the slots that currently hold a photo so the frame paper only colors its
  // own border/decoration, never the photo itself.
  const filledSlots = frame.slots.filter((_, i) => shots[i]);

  return (
    <div
      className={cn(
        "relative aspect-2/3 w-full overflow-hidden bg-white",
        frame.rounded ? "rounded-2xl" : "rounded-none",
        className,
      )}
    >
      {frame.slots.map((slot, i) => {
        const shot = shots[i];
        if (!shot && hideEmptySlots) return null;
        const isActive = activeSlotIndex === i;
        return (
          <div
            key={slot.id}
            className={cn(
              "absolute overflow-hidden border-2 border-card",
              !instant && "transition-all duration-300",
              frame.rounded ? "rounded-xl" : "rounded-none",
              isActive && "ring-4 ring-primary/70",
              !shot && "bg-card/70",
            )}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
            }}
          >
            {shot ? (
              <img
                src={shot.dataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={filterCss ? { filter: filterCss } : undefined}
              />
            ) : (
              showSlotLabels && (
                <span className="absolute inset-0 grid place-items-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
              )
            )}
          </div>
        );
      })}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply"
        viewBox="0 0 100 150"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="150">
            <rect x="0" y="0" width="100" height="150" fill="white" />
            {filledSlots.map((slot) => (
              <rect
                key={slot.id}
                x={slot.x}
                y={(slot.y / 100) * 150}
                width={slot.w}
                height={(slot.h / 100) * 150}
                rx={frame.rounded ? 3 : 0}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <image
          href={frame.image}
          x="0"
          y="0"
          width="100"
          height="150"
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
