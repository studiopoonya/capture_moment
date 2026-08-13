import GIF from "gif.js";
import { API_URL } from "@/lib/api";
import type { Frame } from "@/lib/api";
import type { Shot } from "@/lib/photobooth-store";

/**
 * Static files under the backend's public/ are served directly (bypassing Laravel's
 * middleware), so they never get a CORS header — the browser then refuses to let a
 * <canvas> read their pixels for export. Route same-origin-as-backend images through
 * the /media passthrough instead, which re-serves them with an explicit CORS header.
 */
export function toCanvasSafeUrl(url: string): string {
  try {
    const backendOrigin = new URL(API_URL, window.location.origin).origin;
    const target = new URL(url, window.location.origin);
    if (target.origin !== backendOrigin) return url;
    return `${API_URL}/media?path=${encodeURIComponent(target.pathname.replace(/^\//, ""))}`;
  } catch {
    return url;
  }
}

export type PlacedSticker = {
  kind: "emoji" | "image";
  value: string;
  x: number;
  y: number;
  scale: number;
};

const IMAGE_WIDTH = 1000;
const IMAGE_HEIGHT = 1500;
/** Lower resolution for the GIF — client-side GIF encoding is CPU-heavy and file size adds up fast. */
const GIF_WIDTH = 420;
const GIF_HEIGHT = 630;
/** Sticker `scale` is authored against a ~420px-wide mobile preview. */
const STICKER_BASE_PX = 44;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

/** Adds a rounded-rect subpath to whatever path is currently open — caller manages beginPath(). */
function addRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  addRoundedRectPath(ctx, x, y, w, h, r);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

async function loadFrameAssets(frame: Frame, shots: Shot[]) {
  const [frameImg, shotImgs] = await Promise.all([
    loadImage(toCanvasSafeUrl(frame.image)),
    Promise.all(frame.slots.map((_, i) => (shots[i] ? loadImage(shots[i]!.dataUrl) : null))),
  ]);
  return { frameImg, shotImgs };
}

/** Draws a white base + photos (optionally only a subset of slots) + frame paper on top.
 * `filterCss` is scoped to the photos only — the frame graphic is never color-graded. */
function drawFrameLayer(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  shotImgs: (HTMLImageElement | null)[],
  frameImg: HTMLImageElement,
  width: number,
  height: number,
  visibleSlots: Set<number> | null,
  filterCss?: string,
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  frame.slots.forEach((slot, i) => {
    const img = shotImgs[i];
    if (!img || (visibleSlots && !visibleSlots.has(i))) return;
    const x = (slot.x / 100) * width;
    const y = (slot.y / 100) * height;
    const w = (slot.w / 100) * width;
    const h = (slot.h / 100) * height;
    ctx.save();
    if (frame.rounded) roundedRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.08);
    else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
    ctx.clip();
    if (filterCss) ctx.filter = filterCss;
    drawCover(ctx, img, x, y, w, h);
    ctx.filter = "none";
    ctx.restore();
  });

  // Multiply-blend the frame's decorative paper texture, but only *outside* the photo
  // slots — some frame assets (e.g. plain JPGs) have no transparent window there, which
  // would otherwise permanently tint every photo underneath regardless of filter choice.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  frame.slots.forEach((slot, i) => {
    if (!shotImgs[i] || (visibleSlots && !visibleSlots.has(i))) return;
    const x = (slot.x / 100) * width;
    const y = (slot.y / 100) * height;
    const w = (slot.w / 100) * width;
    const h = (slot.h / 100) * height;
    if (frame.rounded) addRoundedRectPath(ctx, x, y, w, h, Math.min(w, h) * 0.08);
    else ctx.rect(x, y, w, h);
  });
  ctx.clip("evenodd");
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(frameImg, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

async function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: PlacedSticker[],
  width: number,
  height: number,
  basePx: number,
) {
  for (const sticker of stickers) {
    const cx = (sticker.x / 100) * width;
    const cy = (sticker.y / 100) * height;
    const size = basePx * sticker.scale;
    if (sticker.kind === "emoji") {
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.value, cx, cy);
    } else {
      const img = await loadImage(toCanvasSafeUrl(sticker.value));
      const ratio = img.width / img.height || 1;
      const dh = size;
      const dw = size * ratio;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    }
  }
}

/** Finds which slot a sticker was placed nearest to, by comparing to each slot's center. */
function nearestSlotIndex(frame: Frame, sticker: PlacedSticker): number {
  let best = 0;
  let bestDist = Infinity;
  frame.slots.forEach((slot, i) => {
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + slot.h / 2;
    const dist = (sticker.x - cx) ** 2 + (sticker.y - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

/** Groups stickers by whichever slot they were placed nearest to, remapping their
 * frame-relative x/y into that slot's own 0-100 space (each individual photo is
 * shown blown up full-canvas, not the whole multi-slot frame). */
function groupStickersBySlot(frame: Frame, stickers: PlacedSticker[]): Map<number, PlacedSticker[]> {
  const bySlot = new Map<number, PlacedSticker[]>();
  for (const sticker of stickers) {
    const slotIndex = nearestSlotIndex(frame, sticker);
    const slot = frame.slots[slotIndex]!;
    const list = bySlot.get(slotIndex) ?? [];
    list.push({
      ...sticker,
      x: clamp(((sticker.x - slot.x) / slot.w) * 100, 0, 100),
      y: clamp(((sticker.y - slot.y) / slot.h) * 100, 0, 100),
    });
    bySlot.set(slotIndex, list);
  }
  return bySlot;
}

async function renderIndividualPhoto(
  img: HTMLImageElement,
  filterCss: string,
  slotStickers: PlacedSticker[],
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung di browser ini");
  if (filterCss) ctx.filter = filterCss;
  drawCover(ctx, img, 0, 0, width, height);
  ctx.filter = "none";
  await drawStickers(ctx, slotStickers, width, height, STICKER_BASE_PX * (width / 420));
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat gambar hasil"))),
      type,
      quality,
    );
  });
}

/**
 * Renders the final frame + photos + color filter + stickers onto an offscreen
 * canvas and returns it as a PNG blob, ready to download or share.
 */
export async function composeResultImage(
  frame: Frame,
  shots: Shot[],
  filterCss: string,
  stickers: PlacedSticker[],
): Promise<Blob> {
  const { frameImg, shotImgs } = await loadFrameAssets(frame, shots);

  const layer = document.createElement("canvas");
  layer.width = IMAGE_WIDTH;
  layer.height = IMAGE_HEIGHT;
  const lctx = layer.getContext("2d");
  if (!lctx) throw new Error("Canvas tidak didukung di browser ini");
  drawFrameLayer(lctx, frame, shotImgs, frameImg, IMAGE_WIDTH, IMAGE_HEIGHT, null, filterCss);

  const final = document.createElement("canvas");
  final.width = IMAGE_WIDTH;
  final.height = IMAGE_HEIGHT;
  const fctx = final.getContext("2d");
  if (!fctx) throw new Error("Canvas tidak didukung di browser ini");
  fctx.drawImage(layer, 0, 0);
  await drawStickers(fctx, stickers, IMAGE_WIDTH, IMAGE_HEIGHT, STICKER_BASE_PX * (IMAGE_WIDTH / 420));

  return canvasToBlob(final, "image/png", 0.95);
}

/**
 * Renders a looping GIF that cycles through each captured photo full-frame (no paper
 * border), like a simple slideshow — photo 1 → photo 2 → ... → back to photo 1.
 */
export async function composeResultGif(
  frame: Frame,
  shots: Shot[],
  filterCss: string,
  stickers: PlacedSticker[],
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const shotImgs = await Promise.all(
    frame.slots.map((_, i) => (shots[i] ? loadImage(shots[i]!.dataUrl) : null)),
  );
  const filledSlots = frame.slots.map((_, i) => i).filter((i) => shotImgs[i]);
  if (filledSlots.length === 0) throw new Error("Belum ada foto buat dibikin GIF");

  const stickersBySlot = groupStickersBySlot(frame, stickers);

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: GIF_WIDTH,
    height: GIF_HEIGHT,
    workerScript: "/gif.worker.js",
  });

  for (const slotIndex of filledSlots) {
    const canvas = await renderIndividualPhoto(
      shotImgs[slotIndex]!,
      filterCss,
      stickersBySlot.get(slotIndex) ?? [],
      GIF_WIDTH,
      GIF_HEIGHT,
    );
    gif.addFrame(canvas, { delay: 900 });
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout membuat GIF")), 30000);
    gif.on("finished", (blob: Blob) => {
      clearTimeout(timeout);
      resolve(blob);
    });
    gif.on("progress", (p: number) => onProgress?.(p));
    gif.render();
  });
}

/**
 * Renders each captured photo individually (no paper frame, just that one photo with
 * its filter and any stickers placed near it) — one PNG blob per photo taken.
 */
export async function composeIndividualPhotos(
  frame: Frame,
  shots: Shot[],
  filterCss: string,
  stickers: PlacedSticker[],
): Promise<Blob[]> {
  const shotImgs = await Promise.all(
    frame.slots.map((_, i) => (shots[i] ? loadImage(shots[i]!.dataUrl) : null)),
  );
  const filledSlots = frame.slots.map((_, i) => i).filter((i) => shotImgs[i]);
  if (filledSlots.length === 0) throw new Error("Belum ada foto");

  const stickersBySlot = groupStickersBySlot(frame, stickers);

  const blobs: Blob[] = [];
  for (const slotIndex of filledSlots) {
    const canvas = await renderIndividualPhoto(
      shotImgs[slotIndex]!,
      filterCss,
      stickersBySlot.get(slotIndex) ?? [],
      IMAGE_WIDTH,
      IMAGE_HEIGHT,
    );
    blobs.push(await canvasToBlob(canvas, "image/png", 0.95));
  }
  return blobs;
}
