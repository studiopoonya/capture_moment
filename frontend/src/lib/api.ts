export const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000/api";
const TOKEN_KEY = "cm_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const body: { message?: string; errors?: Record<string, string[]> } | null = await res
      .json()
      .catch(() => null);
    const firstFieldError = Object.values(body?.errors ?? {})[0]?.[0];
    const message = body?.message ?? firstFieldError ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const body: { message?: string; errors?: Record<string, string[]> } | null = await res
      .json()
      .catch(() => null);
    const firstFieldError = Object.values(body?.errors ?? {})[0]?.[0];
    throw new Error(body?.message ?? firstFieldError ?? `Upload gagal (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function login(email: string, password: string) {
  return request<{ token: string; user: { id: number; name: string; email: string } }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  try {
    await request("/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

export type Slot = { id: string; x: number; y: number; w: number; h: number };

export type Frame = {
  id: number;
  name: string;
  image: string;
  tone: "primary" | "mint" | "lemon" | "sky" | "lilac";
  active: boolean;
  rounded: boolean;
  slots: Slot[];
};

export type FrameInput = {
  name: string;
  tone: Frame["tone"];
  image: string;
  active: boolean;
  rounded: boolean;
  slots: Slot[];
};

export type PhotoSessionResult = {
  id: number;
  photo_session_id: number;
  frame_id: number | null;
  frame: Frame | null;
  image: string;
  gif: string | null;
  voice: string | null;
  video: string | null;
  created_at: string;
};

export type PhotoSession = {
  id: number;
  customer_name: string;
  slug: string;
  welcome_photo: string | null;
  welcome_title: string | null;
  frames: Frame[];
  filters: PhotoFilter[];
  stickers: Sticker[];
  results?: PhotoSessionResult[];
  created_at: string;
};

/** Public: active frames only, for the customer-facing frame picker. */
export function getFrames() {
  return request<Frame[]>("/frames");
}

/** Admin: every frame regardless of active state. */
export function getAdminFrames() {
  return request<Frame[]>("/admin/frames");
}

export function createFrame(data: FrameInput) {
  return request<Frame>("/frames", { method: "POST", body: JSON.stringify(data) });
}

export function updateFrame(id: number, data: Partial<FrameInput>) {
  return request<Frame>(`/frames/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deleteFrame(id: number) {
  return request<void>(`/frames/${id}`, { method: "DELETE" });
}

export function uploadFrameImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  return requestForm("/frames/upload-image", form);
}

export type PhotoFilter = { id: number; name: string; css: string; active: boolean };

/** Public: active filters only. */
export function getFilters() {
  return request<PhotoFilter[]>("/filters");
}

/** Admin: every filter regardless of active state. */
export function getAdminFilters() {
  return request<PhotoFilter[]>("/admin/filters");
}

export function createFilter(name: string, xmp: File) {
  const form = new FormData();
  form.append("name", name);
  form.append("xmp", xmp);
  return requestForm<PhotoFilter>("/filters", form);
}

export function updateFilter(id: number, data: { name?: string; active?: boolean; xmp?: File }) {
  const form = new FormData();
  form.append("_method", "PUT");
  if (data.name !== undefined) form.append("name", data.name);
  if (data.active !== undefined) form.append("active", data.active ? "1" : "0");
  if (data.xmp) form.append("xmp", data.xmp);
  return requestForm<PhotoFilter>(`/filters/${id}`, form);
}

export function deleteFilter(id: number) {
  return request<void>(`/filters/${id}`, { method: "DELETE" });
}

export type Sticker = { id: number; name: string; image: string; active: boolean };

/** Public: active stickers only. */
export function getStickers() {
  return request<Sticker[]>("/stickers");
}

/** Admin: every sticker regardless of active state. */
export function getAdminStickers() {
  return request<Sticker[]>("/admin/stickers");
}

export function createSticker(name: string, image: File) {
  const form = new FormData();
  form.append("name", name);
  form.append("image", image);
  return requestForm<Sticker>("/stickers", form);
}

export function updateSticker(id: number, data: { name?: string; active?: boolean; image?: File }) {
  const form = new FormData();
  form.append("_method", "PUT");
  if (data.name !== undefined) form.append("name", data.name);
  if (data.active !== undefined) form.append("active", data.active ? "1" : "0");
  if (data.image) form.append("image", data.image);
  return requestForm<Sticker>(`/stickers/${id}`, form);
}

export function deleteSticker(id: number) {
  return request<void>(`/stickers/${id}`, { method: "DELETE" });
}

export function createSession(data: {
  customer_name: string;
  frame_ids: number[];
  filter_ids?: number[];
  sticker_ids?: number[];
  welcome_photo?: string | null;
  welcome_title?: string | null;
}) {
  return request<PhotoSession>("/sessions", { method: "POST", body: JSON.stringify(data) });
}

export function updateSession(
  id: number,
  data: {
    customer_name?: string;
    frame_ids?: number[];
    filter_ids?: number[];
    sticker_ids?: number[];
    welcome_photo?: string | null;
    welcome_title?: string | null;
  },
) {
  return request<PhotoSession>(`/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

/** Admin: uploads the couple's welcome-screen photo, for use in create/edit session forms. */
export function uploadSessionWelcomePhoto(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  return requestForm("/sessions/upload-welcome-photo", form);
}

export function getSession(slug: string) {
  return request<PhotoSession>(`/sessions/${slug}`);
}

/** Admin: every session, for management. */
export function getAdminSessions() {
  return request<PhotoSession[]>("/admin/sessions");
}

export function deleteSession(id: number) {
  return request<void>(`/sessions/${id}`, { method: "DELETE" });
}

/** Public: uploads the composited photo for a finished session, for the admin gallery. */
export function uploadSessionResult(sessionId: number, frameId: number, file: File) {
  const form = new FormData();
  form.append("image", file);
  form.append("frame_id", String(frameId));
  return requestForm<PhotoSessionResult>(`/sessions/${sessionId}/results`, form);
}

export function deleteSessionResult(id: number) {
  return request<void>(`/session-results/${id}`, { method: "DELETE" });
}

/** Public: attaches the looping GIF to an already-created result, once it's done encoding. */
export function attachSessionResultGif(resultId: number, file: File) {
  const form = new FormData();
  form.append("gif", file);
  return requestForm<PhotoSessionResult>(`/session-results/${resultId}/gif`, form);
}

/** Public: attaches the guest's optional voice message for the couple to an already-created result. */
export function attachSessionResultVoice(resultId: number, file: File) {
  const form = new FormData();
  form.append("voice", file);
  return requestForm<PhotoSessionResult>(`/session-results/${resultId}/voice`, form);
}

/**
 * Admin: renders (server-side, via ffmpeg) a short MP4 combining the still photo with the
 * guest's voice message, for sharing somewhere audio can travel along with the image.
 * Cached after the first call — repeat calls just return the already-generated video.
 */
export function generateSessionResultVideo(resultId: number) {
  return request<PhotoSessionResult>(`/session-results/${resultId}/video`, { method: "POST" });
}
