import type { Frame, Slot } from "@/lib/api";

/** Slots share a captured photo when they carry the same shotGroup number — unset defaults to
 * the slot's own 1-based position, i.e. no sharing (today's one-photo-per-slot behavior). */
function effectiveGroup(slot: Slot, index: number): number {
  return slot.shotGroup ?? index + 1;
}

/** One representative slot per distinct shotGroup, in first-seen order — this is what actually
 * drives the camera: how many photos to take, and which slot each shutter press fills. */
export function captureSlots(frame: Pick<Frame, "slots">): Slot[] {
  const seen = new Set<number>();
  const result: Slot[] = [];
  frame.slots.forEach((slot, i) => {
    const key = effectiveGroup(slot, i);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(slot);
    }
  });
  return result;
}

/** Maps every slot's array position to the index into a shots/capture array holding its photo —
 * slots sharing a shotGroup resolve to the same index, so the same photo renders in both. */
export function buildSlotShotMap(frame: Pick<Frame, "slots">): number[] {
  const order = new Map<number, number>();
  return frame.slots.map((slot, i) => {
    const key = effectiveGroup(slot, i);
    if (!order.has(key)) order.set(key, order.size);
    return order.get(key)!;
  });
}
