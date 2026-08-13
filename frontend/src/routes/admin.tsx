import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  Copy,
  Download,
  Film,
  ImagePlus,
  Images,
  LayoutGrid,
  Link2,
  LogOut,
  Mic,
  Pencil,
  Plus,
  QrCode,
  Search,
  Sticker as StickerIcon,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react";
import JSZip from "jszip";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { FrameComposite } from "@/components/FrameComposite";
import { toCanvasSafeUrl } from "@/lib/compose-result";
import {
  createFilter,
  createFrame,
  createSession,
  createSticker,
  deleteFilter,
  deleteFrame,
  deleteSession,
  deleteSessionResult,
  deleteSticker,
  generateSessionResultVideo,
  getAdminFilters,
  getAdminFrames,
  getAdminSessions,
  getAdminStickers,
  getToken,
  logout,
  updateFilter,
  updateFrame,
  updateSession,
  updateSticker,
  uploadFrameImage,
  uploadSessionWelcomePhoto,
  type Frame,
  type FrameInput,
  type PhotoFilter,
  type PhotoSession,
  type PhotoSessionResult,
  type Slot,
  type Sticker,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin — Kelola Frame | Capture Moments" },
      {
        name: "description",
        content:
          "Dashboard admin untuk menambah, mengedit, menduplikat, dan mengatur posisi slot foto pada frame photobooth.",
      },
      { property: "og:title", content: "Admin — Kelola Frame | Capture Moments" },
      {
        property: "og:description",
        content: "Kelola frame photobooth: jumlah slot, posisi slot, dan status aktif.",
      },
    ],
  }),
  component: AdminPage,
});

const TONES: Frame["tone"][] = ["primary", "mint", "lemon", "sky", "lilac"];
const EMPTY_FRAME: Frame = {
  id: 0,
  name: "",
  image: "",
  tone: "mint",
  active: true,
  rounded: false,
  slots: [],
};

function newSlotId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

function makeSlots(count: number, existing: Slot[] = []): Slot[] {
  const top = 6;
  const gap = 3;
  const h = (100 - top * 2 - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => {
    const prev = existing[i];
    return prev ?? { id: `s${i + 1}`, x: 10, y: top + i * (h + gap), w: 80, h };
  });
}

function toInput(frame: Frame): FrameInput {
  return {
    name: frame.name,
    tone: frame.tone,
    image: frame.image,
    active: frame.active,
    rounded: frame.rounded,
    slots: frame.slots,
  };
}

const VIEW_META = {
  frames: { title: "Frame Manager", desc: "Kelola frame photobooth Capture Moments" },
  sessions: { title: "Sesi Customer", desc: "Kelola link sesi foto tiap customer" },
  filters: { title: "Filter", desc: "Kelola preset filter warna yang bisa dipilih customer" },
  stickers: { title: "Stiker", desc: "Kelola stiker yang bisa ditempel customer" },
  gallery: { title: "Galeri", desc: "Lihat hasil foto customer per sesi" },
} as const;

type AdminView = keyof typeof VIEW_META;

function AdminPage() {
  const queryClient = useQueryClient();
  const { data: frames = [] } = useQuery({ queryKey: ["admin-frames"], queryFn: getAdminFrames });
  const { data: filters = [] } = useQuery({ queryKey: ["admin-filters"], queryFn: getAdminFilters });
  const { data: stickers = [] } = useQuery({
    queryKey: ["admin-stickers"],
    queryFn: getAdminStickers,
  });
  const [editing, setEditing] = useState<Frame | null>(null);
  const [open, setOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [view, setView] = useState<AdminView>("frames");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("admin-light");
    return () => document.documentElement.classList.remove("admin-light");
  }, []);

  const updateFramesCache = (updater: (old: Frame[] | undefined) => Frame[] | undefined) => {
    queryClient.setQueryData<Frame[]>(["admin-frames"], updater);
    queryClient.invalidateQueries({ queryKey: ["frames"] });
  };

  const createMutation = useMutation({
    mutationFn: createFrame,
    onSuccess: (newFrame) => {
      updateFramesCache((old) => [newFrame, ...(old ?? [])]);
      toast.success("Frame baru ditambahkan");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan frame"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FrameInput> }) =>
      updateFrame(id, data),
    onSuccess: (updated) => {
      updateFramesCache((old) => old?.map((f) => (f.id === updated.id ? updated : f)));
      toast.success("Frame diperbarui");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan frame"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      updateFrame(id, { active }),
    onSuccess: (updated) => {
      updateFramesCache((old) => old?.map((f) => (f.id === updated.id ? updated : f)));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFrame,
    onSuccess: (_data, deletedId) => {
      updateFramesCache((old) => old?.filter((f) => f.id !== deletedId));
      toast("Frame dihapus");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus frame"),
  });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const startNew = () => {
    setEditing({ ...EMPTY_FRAME, image: frames[0]?.image ?? "", slots: makeSlots(3) });
    setOpen(true);
  };

  const save = (frame: Frame) => {
    if (!frame.name.trim()) {
      toast.error("Nama frame wajib diisi");
      return;
    }
    if (frame.id) {
      updateMutation.mutate({ id: frame.id, data: toInput(frame) });
    } else {
      createMutation.mutate(toInput(frame));
    }
  };

  const duplicate = (frame: Frame) => {
    createMutation.mutate({ ...toInput(frame), name: `${frame.name} copy`, active: false });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary">
            <Camera className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold text-sidebar-foreground">
              Capture Moments
            </p>
            <p className="truncate text-xs font-semibold text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <button
            onClick={() => setView("frames")}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
              view === "frames"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Frame Manager
          </button>
          <button
            onClick={() => setView("sessions")}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
              view === "sessions"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <Users className="h-4 w-4" />
            Sesi Customer
          </button>
          <button
            onClick={() => setView("filters")}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
              view === "filters"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <Wand2 className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={() => setView("stickers")}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
              view === "stickers"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <StickerIcon className="h-4 w-4" />
            Stiker
          </button>
          <button
            onClick={() => setView("gallery")}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold ${
              view === "gallery"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60"
            }`}
          >
            <Images className="h-4 w-4" />
            Galeri
          </button>
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start font-bold">
            <Link to="/">
              <LayoutGrid className="h-4 w-4" /> Lihat App
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur md:hidden">
        <div className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary">
              <Camera className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-extrabold">
                {VIEW_META[view].title}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="rounded-full font-bold">
              <Link to="/">
                <LayoutGrid className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-full font-bold text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-3">
          {(Object.keys(VIEW_META) as AdminView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                view === v
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {VIEW_META[v].title}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-col md:ml-64">
        <header className="hidden items-center justify-between border-b border-border bg-card px-8 py-5 md:flex">
          <div>
            <h1 className="font-display text-xl font-extrabold">{VIEW_META[view].title}</h1>
            <p className="text-sm font-semibold text-muted-foreground">{VIEW_META[view].desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSessionOpen(true)}
              className="tap-press rounded-full font-bold"
            >
              <UserPlus className="h-4 w-4" /> Buat Sesi
            </Button>
            {view === "frames" && (
              <Button
                onClick={startNew}
                className="tap-press rounded-full bg-gradient-primary font-bold"
              >
                <Plus className="h-4 w-4" /> Frame Baru
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {view === "frames" && (
            <div className="mb-4 flex justify-end gap-2 md:hidden">
              <Button
                size="sm"
                onClick={startNew}
                className="tap-press rounded-full bg-gradient-primary font-bold"
              >
                <Plus className="h-4 w-4" /> Frame Baru
              </Button>
            </div>
          )}

          {view === "frames" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Total frame" value={frames.length} icon={<LayoutGrid className="h-4 w-4" />} />
                <StatCard label="Aktif" value={frames.filter((f) => f.active).length} icon={<Camera className="h-4 w-4" />} />
                <StatCard
                  label="Total slot foto"
                  value={frames.reduce((a, f) => a + f.slots.length, 0)}
                  icon={<ImagePlus className="h-4 w-4" />}
                />
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <h2 className="font-display text-base font-extrabold">Semua Frame</h2>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {frames.length} item
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {frames.map((frame) => (
                    <li
                      key={frame.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 md:grid-cols-[auto_minmax(0,1fr)_auto]"
                    >
                      <div className="w-14 shrink-0">
                        <FrameComposite frame={frame} showSlotLabels className="rounded-lg" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate font-bold">{frame.name}</p>
                          <Badge
                            variant={frame.active ? "default" : "secondary"}
                            className="rounded-full text-[10px] font-extrabold"
                          >
                            {frame.active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {frame.slots.length} slot foto · tone {frame.tone}
                        </p>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                        <Switch
                          checked={frame.active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: frame.id, active: v })}
                          aria-label="Toggle aktif"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="tap-press rounded-full font-bold"
                          onClick={() => {
                            setEditing(frame);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="tap-press rounded-full font-bold"
                          onClick={() => duplicate(frame)}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplikat
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="tap-press rounded-full font-bold text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(frame.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : view === "sessions" ? (
            <SessionsSection />
          ) : view === "filters" ? (
            <FilterManagerSection />
          ) : view === "stickers" ? (
            <StickerManagerSection />
          ) : (
            <GallerySection />
          )}
        </main>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing?.id ? "Edit Frame" : "Tambah Frame"}
            </DialogTitle>
            <DialogDescription>
              Atur nama, jumlah slot, dan posisi tiap slot foto di dalam frame.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <FrameForm key={editing.id || "new"} initial={editing} frames={frames} onSave={save} />
          )}
        </DialogContent>
      </Dialog>

      <CreateSessionDialog
        frames={frames}
        filters={filters}
        stickers={stickers}
        open={sessionOpen}
        onOpenChange={setSessionOpen}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function SessionsSection() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: getAdminSessions,
  });
  const [editing, setEditing] = useState<PhotoSession | null>(null);
  const [qrSession, setQrSession] = useState<PhotoSession | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData<PhotoSession[]>(["admin-sessions"], (old) =>
        old?.filter((s) => s.id !== deletedId),
      );
      toast("Sesi dihapus");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus sesi"),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="font-display text-base font-extrabold">Semua Sesi Customer</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {sessions.length} sesi
        </span>
      </div>
      {isLoading ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Memuat sesi...
        </p>
      ) : sessions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Belum ada sesi. Klik "Buat Sesi" untuk bikin link customer pertama.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((session) => {
            const link = `${window.location.origin}/${session.slug}`;
            return (
              <li
                key={session.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 md:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <div className="w-14 shrink-0">
                  {session.frames[0] ? (
                    <FrameComposite frame={session.frames[0]} className="rounded-lg" />
                  ) : (
                    <div className="aspect-2/3 w-full rounded-lg bg-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{session.customer_name}</p>
                    {session.frames.length > 1 && (
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[10px] font-extrabold"
                      >
                        {session.frames.length} frame
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                    {session.frames.map((f) => f.name).join(", ") || "Tanpa frame"} · /{session.slug}
                  </p>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-press rounded-full font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      toast.success("Link disalin");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Salin Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-press rounded-full font-bold"
                    onClick={() => setEditing(session)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="tap-press rounded-full font-bold"
                    onClick={() => setQrSession(session)}
                  >
                    <QrCode className="h-3.5 w-3.5" /> QR Code
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tap-press rounded-full font-bold text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(session.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <EditSessionDialog session={editing} onOpenChange={(v) => !v && setEditing(null)} />
      <QrCodeDialog session={qrSession} onOpenChange={(v) => !v && setQrSession(null)} />
    </div>
  );
}

function WelcomeFieldsFieldset({
  welcomeTitle,
  setWelcomeTitle,
  welcomePhotoUrl,
  setWelcomePhotoUrl,
  customerName,
}: {
  welcomeTitle: string;
  setWelcomeTitle: (v: string) => void;
  welcomePhotoUrl: string | null;
  setWelcomePhotoUrl: (v: string | null) => void;
  customerName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useMutation({
    mutationFn: uploadSessionWelcomePhoto,
    onSuccess: (res) => {
      setWelcomePhotoUrl(res.url);
      toast.success("Foto welcome screen diunggah");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal upload foto"),
  });

  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <Label>Welcome Screen (opsional)</Label>
      <p className="text-xs font-semibold text-muted-foreground">
        Foto & teks ini muncul begitu tamu buka link, sebelum pilih frame.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadMutation.mutate(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="tap-press flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left text-sm font-semibold text-muted-foreground hover:border-primary disabled:opacity-60"
      >
        {welcomePhotoUrl ? (
          <img
            src={welcomePhotoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <ImagePlus className="h-4 w-4 shrink-0" />
        )}
        {uploadMutation.isPending
          ? "Mengunggah..."
          : welcomePhotoUrl
            ? "Ganti foto pasangan"
            : "Pilih foto pasangan"}
      </button>
      {welcomePhotoUrl && (
        <button
          type="button"
          onClick={() => setWelcomePhotoUrl(null)}
          className="text-xs font-bold text-destructive"
        >
          Hapus foto
        </button>
      )}
      <Input
        value={welcomeTitle}
        onChange={(e) => setWelcomeTitle(e.target.value)}
        placeholder={`Happy Wedding ${customerName || "..."}`}
      />
    </div>
  );
}

function QrCodeDialog({
  session,
  onOpenChange,
}: {
  session: PhotoSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const link = session ? `${window.location.origin}/${session.slug}` : "";

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !session) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${session.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {session && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">QR Code — {session.customer_name}</DialogTitle>
              <DialogDescription>
                Scan buat langsung buka link sesi foto customer ini.
              </DialogDescription>
            </DialogHeader>
            <div className="grid place-items-center rounded-2xl border border-border bg-white p-6">
              <QRCodeCanvas ref={canvasRef} value={link} size={220} marginSize={2} level="M" />
            </div>
            <p className="break-all text-center text-xs font-semibold text-muted-foreground">
              {link}
            </p>
            <Button
              onClick={handleDownload}
              className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
            >
              <Download className="h-4 w-4" /> Download QR Code
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditSessionDialog({
  session,
  onOpenChange,
}: {
  session: PhotoSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: frames = [] } = useQuery({ queryKey: ["admin-frames"], queryFn: getAdminFrames });
  const { data: filters = [] } = useQuery({
    queryKey: ["admin-filters"],
    queryFn: getAdminFilters,
  });
  const { data: stickers = [] } = useQuery({
    queryKey: ["admin-stickers"],
    queryFn: getAdminStickers,
  });

  const [customerName, setCustomerName] = useState("");
  const [frameIds, setFrameIds] = useState<number[]>([]);
  const [frameSearch, setFrameSearch] = useState("");
  const [filterIds, setFilterIds] = useState<number[]>([]);
  const [stickerIds, setStickerIds] = useState<number[]>([]);
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomePhotoUrl, setWelcomePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setCustomerName(session.customer_name);
    setFrameIds(session.frames.map((f) => f.id));
    setFrameSearch("");
    setFilterIds(session.filters.map((f) => f.id));
    setStickerIds(session.stickers.map((s) => s.id));
    setWelcomeTitle(session.welcome_title ?? "");
    setWelcomePhotoUrl(session.welcome_photo ?? null);
  }, [session]);

  const mutation = useMutation({
    mutationFn: (data: {
      customer_name: string;
      frame_ids: number[];
      filter_ids: number[];
      sticker_ids: number[];
      welcome_photo: string | null;
      welcome_title: string | null;
    }) => updateSession(session!.id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<PhotoSession[]>(["admin-sessions"], (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      );
      toast.success("Sesi diperbarui");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal memperbarui sesi"),
  });

  const toggleFrame = (id: number) => {
    setFrameIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleFilter = (id: number) => {
    setFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSticker = (id: number) => {
    setStickerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const activeFrames = frames.filter((f) => f.active || frameIds.includes(f.id));
  const visibleFrames = activeFrames.filter((f) =>
    f.name.toLowerCase().includes(frameSearch.trim().toLowerCase()),
  );
  const activeFilters = filters.filter((f) => f.active || filterIds.includes(f.id));
  const activeStickers = stickers.filter((s) => s.active || stickerIds.includes(s.id));

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Sesi Customer</DialogTitle>
          <DialogDescription>
            Ubah nama, frame, filter, dan stiker untuk link ini. Link/slug tidak berubah.
          </DialogDescription>
        </DialogHeader>

        {session && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({
                customer_name: customerName,
                frame_ids: frameIds,
                filter_ids: filterIds,
                sticker_ids: stickerIds,
                welcome_photo: welcomePhotoUrl,
                welcome_title: welcomeTitle.trim() || null,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-customer-name">Nama customer</Label>
              <Input
                id="edit-customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="cth. Budi & Siti"
                required
              />
            </div>

            <WelcomeFieldsFieldset
              welcomeTitle={welcomeTitle}
              setWelcomeTitle={setWelcomeTitle}
              welcomePhotoUrl={welcomePhotoUrl}
              setWelcomePhotoUrl={setWelcomePhotoUrl}
              customerName={customerName}
            />

            <div className="space-y-1.5">
              <Label>Pilih frame (bisa lebih dari satu)</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={frameSearch}
                  onChange={(e) => setFrameSearch(e.target.value)}
                  placeholder="Cari nama frame..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl border border-border p-2">
                {visibleFrames.map((f) => {
                  const checked = frameIds.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFrame(f.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="w-11 shrink-0">
                        <FrameComposite frame={f} className="rounded-md" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{f.name}</span>
                        <span className="block text-xs font-semibold text-muted-foreground">
                          {f.slots.length} foto · tone {f.tone}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {visibleFrames.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Gak ada frame yang cocok.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Filter (opsional)</Label>
              <p className="text-xs font-semibold text-muted-foreground">
                Kosongin buat kasih semua filter aktif ke customer.
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
                {activeFilters.map((f) => {
                  const checked = filterIds.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className="h-8 w-8 shrink-0 rounded-lg"
                        style={{ filter: f.css || undefined, background: FILTER_SWATCH_BG }}
                      />
                      <span className="truncate text-sm font-bold">{f.name}</span>
                    </button>
                  );
                })}
                {activeFilters.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada filter custom — nanti otomatis pakai filter bawaan.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stiker (opsional)</Label>
              <p className="text-xs font-semibold text-muted-foreground">
                Kosongin buat kasih semua stiker aktif ke customer.
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
                {activeStickers.map((s) => {
                  const checked = stickerIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSticker(s.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                        <img src={s.image} alt="" className="h-6 w-6 object-contain" />
                      </span>
                      <span className="truncate text-sm font-bold">{s.name}</span>
                    </button>
                  );
                })}
                {activeStickers.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada stiker custom — nanti otomatis pakai stiker emoji bawaan.
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending || frameIds.length === 0 || !customerName.trim()}
              className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
            >
              {mutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FILTER_SWATCH_BG = "linear-gradient(135deg, #f6d3e0, #cdeedd)";

/**
 * Flags filters whose computed CSS is unlikely to read as visually distinct — e.g. a preset
 * whose "look" comes mostly from tone curves or split-toning that filter() can't reproduce,
 * leaving only a near-1.0 saturate/contrast nudge. Lets admins catch a weak upload immediately
 * instead of finding out during a live customer session.
 */
function isWeakFilterCss(css: string): boolean {
  if (!css.trim()) return false;
  if (/grayscale|sepia|hue-rotate/.test(css)) return false;
  const values = [...css.matchAll(/(?:saturate|contrast|brightness)\(([\d.]+)\)/g)].map((m) =>
    Number(m[1]),
  );
  if (values.length === 0) return false;
  return values.every((v) => Math.abs(v - 1) < 0.08);
}

function FilterManagerSection() {
  const queryClient = useQueryClient();
  const { data: filters = [], isLoading } = useQuery({
    queryKey: ["admin-filters"],
    queryFn: getAdminFilters,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateFiltersCache = (
    updater: (old: PhotoFilter[] | undefined) => PhotoFilter[] | undefined,
  ) => {
    queryClient.setQueryData<PhotoFilter[]>(["admin-filters"], updater);
    queryClient.invalidateQueries({ queryKey: ["filters"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateFilter(id, { active }),
    onSuccess: (updated) =>
      updateFiltersCache((old) => old?.map((f) => (f.id === updated.id ? updated : f))),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFilter,
    onSuccess: (_data, deletedId) => {
      updateFiltersCache((old) => old?.filter((f) => f.id !== deletedId));
      toast("Filter dihapus");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus filter"),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-display text-base font-extrabold">Semua Filter</h2>
          <p className="text-xs font-semibold text-muted-foreground">{filters.length} filter</p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="tap-press rounded-full bg-gradient-primary font-bold"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Filter
        </Button>
      </div>
      {isLoading ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Memuat filter...
        </p>
      ) : filters.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Belum ada filter custom. Sesi customer otomatis pakai filter bawaan (Original, B&W,
          Sepia, dst) selama belum ada yang ditambahkan di sini.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filters.map((f) => (
            <li
              key={f.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <div
                className="h-14 w-14 shrink-0 rounded-xl"
                style={{ filter: f.css || undefined, background: FILTER_SWATCH_BG }}
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate font-bold">
                  {f.name}
                  {isWeakFilterCss(f.css) && (
                    <Badge className="shrink-0 rounded-full bg-lemon text-[10px] font-extrabold text-lemon-foreground">
                      Efek halus
                    </Badge>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                  {f.css || "Original (tanpa efek)"}
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                <Switch
                  checked={f.active}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: f.id, active: v })}
                  aria-label="Toggle aktif"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-press rounded-full font-bold text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(f.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddFilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(filter) => updateFiltersCache((old) => [filter, ...(old ?? [])])}
      />
    </div>
  );
}

function AddFilterDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (filter: PhotoFilter) => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => createFilter(name.trim(), file!),
    onSuccess: (filter) => {
      onCreated(filter);
      if (isWeakFilterCss(filter.css)) {
        toast("Filter ditambahkan, tapi efeknya kelihatan halus", {
          description: `Preset ini kemungkinan mengandalkan kurva warna/split-toning yang gak bisa direproduksi CSS. Hasil: "${filter.css || "(kosong)"}" — cek dulu di sesi customer, atau upload ulang preset yang efeknya lebih ke exposure/kontras/saturasi.`,
          duration: 8000,
        });
      } else {
        toast.success("Filter ditambahkan");
      }
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menambah filter"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setFile(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Tambah Filter</DialogTitle>
          <DialogDescription>
            Upload file preset .xmp dari Lightroom. Sistem otomatis ambil exposure, contrast,
            saturasi, dan toggle B&W dari file itu lalu diubah jadi filter — detail rumit kayak
            kurva warna & split toning gak ikut kebawa karena browser gak bisa reproduksi itu.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && file) mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="filter-name">Nama filter</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Moody Blue"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>File preset (.xmp)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xmp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="tap-press flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left text-sm font-semibold text-muted-foreground hover:border-primary"
            >
              <Upload className="h-4 w-4 shrink-0" />
              {file ? file.name : "Pilih file .xmp"}
            </button>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending || !name.trim() || !file}
            className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
          >
            {mutation.isPending ? "Menyimpan..." : "Simpan Filter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StickerManagerSection() {
  const queryClient = useQueryClient();
  const { data: stickers = [], isLoading } = useQuery({
    queryKey: ["admin-stickers"],
    queryFn: getAdminStickers,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateStickersCache = (
    updater: (old: Sticker[] | undefined) => Sticker[] | undefined,
  ) => {
    queryClient.setQueryData<Sticker[]>(["admin-stickers"], updater);
    queryClient.invalidateQueries({ queryKey: ["stickers"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateSticker(id, { active }),
    onSuccess: (updated) =>
      updateStickersCache((old) => old?.map((s) => (s.id === updated.id ? updated : s))),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal mengubah status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSticker,
    onSuccess: (_data, deletedId) => {
      updateStickersCache((old) => old?.filter((s) => s.id !== deletedId));
      toast("Stiker dihapus");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus stiker"),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-display text-base font-extrabold">Semua Stiker</h2>
          <p className="text-xs font-semibold text-muted-foreground">{stickers.length} stiker</p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="tap-press rounded-full bg-gradient-primary font-bold"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Stiker
        </Button>
      </div>
      {isLoading ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Memuat stiker...
        </p>
      ) : stickers.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted-foreground">
          Belum ada stiker custom. Sesi customer otomatis pakai stiker emoji bawaan selama belum
          ada yang ditambahkan di sini.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {stickers.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted">
                <img src={s.image} alt={s.name} className="h-10 w-10 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{s.name}</p>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                <Switch
                  checked={s.active}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, active: v })}
                  aria-label="Toggle aktif"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-press rounded-full font-bold text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddStickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(sticker) => updateStickersCache((old) => [sticker, ...(old ?? [])])}
      />
    </div>
  );
}

function AddStickerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (sticker: Sticker) => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => createSticker(name.trim(), file!),
    onSuccess: (sticker) => {
      onCreated(sticker);
      toast.success("Stiker ditambahkan");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menambah stiker"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setFile(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Tambah Stiker</DialogTitle>
          <DialogDescription>Upload gambar PNG stiker (idealnya latar transparan).</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && file) mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="sticker-name">Nama stiker</Label>
            <Input
              id="sticker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Logo Poonya"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gambar (PNG)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="tap-press flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left text-sm font-semibold text-muted-foreground hover:border-primary"
            >
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-8 w-8 shrink-0 object-contain"
                />
              ) : (
                <Upload className="h-4 w-4 shrink-0" />
              )}
              {file ? file.name : "Pilih gambar stiker"}
            </button>
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending || !name.trim() || !file}
            className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
          >
            {mutation.isPending ? "Menyimpan..." : "Simpan Stiker"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type GalleryItem = { result: PhotoSessionResult; customerName: string };

async function downloadFile(url: string, filename: string) {
  const res = await fetch(toCanvasSafeUrl(url));
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function GallerySection() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: getAdminSessions,
  });
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [downloadingAllId, setDownloadingAllId] = useState<number | null>(null);

  const sessionsWithResults = sessions.filter((s) => (s.results?.length ?? 0) > 0);
  const totalPhotos = sessionsWithResults.reduce((a, s) => a + (s.results?.length ?? 0), 0);

  const handleDownloadAll = async (session: PhotoSession) => {
    if (downloadingAllId !== null) return;
    setDownloadingAllId(session.id);
    try {
      const zip = new JSZip();
      const results = session.results ?? [];
      await Promise.all(
        results.map(async (r, i) => {
          const imgRes = await fetch(toCanvasSafeUrl(r.image));
          zip.file(`foto-${i + 1}.png`, await imgRes.blob());
          if (r.gif) {
            const gifRes = await fetch(toCanvasSafeUrl(r.gif));
            zip.file(`foto-${i + 1}.gif`, await gifRes.blob());
          }
          if (r.voice) {
            const voiceRes = await fetch(toCanvasSafeUrl(r.voice));
            const ext = r.voice.split(".").pop() || "webm";
            zip.file(`pesan-suara-${i + 1}.${ext}`, await voiceRes.blob());
          }
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.customer_name}-foto.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal download semua foto");
    } finally {
      setDownloadingAllId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deleteSessionResult,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData<PhotoSession[]>(["admin-sessions"], (old) =>
        old?.map((s) => ({ ...s, results: (s.results ?? []).filter((r) => r.id !== deletedId) })),
      );
      setLightbox(null);
      toast("Foto dihapus dari galeri");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus foto"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Customer dengan hasil foto"
          value={sessionsWithResults.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard label="Total foto" value={totalPhotos} icon={<Images className="h-4 w-4" />} />
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm font-semibold text-muted-foreground">
          Memuat galeri...
        </p>
      ) : sessionsWithResults.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Belum ada hasil foto. Begitu customer selesai sesi foto, hasilnya otomatis muncul di
            sini.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sessionsWithResults.map((session) => (
            <div
              key={session.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{session.customer_name}</p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    /{session.slug}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {session.results?.length} foto
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadingAllId === session.id}
                    onClick={() => handleDownloadAll(session)}
                    className="tap-press rounded-full font-bold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingAllId === session.id ? "Menyiapkan..." : "Download Semua"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-6">
                {session.results?.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setLightbox({ result: r, customerName: session.customer_name })}
                    className="tap-press aspect-2/3 overflow-hidden rounded-xl border border-border"
                  >
                    <img src={r.image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <GalleryLightbox
        item={lightbox}
        onClose={() => setLightbox(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
        onVideoGenerated={(updated) => {
          queryClient.setQueryData<PhotoSession[]>(["admin-sessions"], (old) =>
            old?.map((s) => ({
              ...s,
              results: (s.results ?? []).map((r) => (r.id === updated.id ? updated : r)),
            })),
          );
          setLightbox((cur) => (cur && cur.result.id === updated.id ? { ...cur, result: updated } : cur));
        }}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
}

function GalleryLightbox({
  item,
  onClose,
  onDelete,
  onVideoGenerated,
  deleting,
}: {
  item: GalleryItem | null;
  onClose: () => void;
  onDelete: (id: number) => void;
  onVideoGenerated: (result: PhotoSessionResult) => void;
  deleting: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingGif, setDownloadingGif] = useState(false);
  const [viewMode, setViewMode] = useState<"photo" | "gif">("photo");
  const [generatingVideo, setGeneratingVideo] = useState(false);

  useEffect(() => {
    setViewMode("photo");
  }, [item?.result.id]);

  const handleDownload = async () => {
    if (!item || downloading) return;
    setDownloading(true);
    try {
      await downloadFile(
        item.result.image,
        `capture-moments-${item.customerName}-${item.result.id}.png`,
      );
    } catch {
      toast.error("Gagal download foto");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadGif = async () => {
    if (!item?.result.gif || downloadingGif) return;
    setDownloadingGif(true);
    try {
      await downloadFile(
        item.result.gif,
        `capture-moments-${item.customerName}-${item.result.id}.gif`,
      );
    } catch {
      toast.error("Gagal download GIF");
    } finally {
      setDownloadingGif(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!item?.result.voice || generatingVideo) return;
    setGeneratingVideo(true);
    try {
      const updated = item.result.video
        ? item.result
        : await generateSessionResultVideo(item.result.id);
      if (!updated.video) throw new Error("Video gagal dibuat");
      await downloadFile(
        updated.video,
        `capture-moments-${item.customerName}-${item.result.id}-suara.mp4`,
      );
      onVideoGenerated(updated);
      toast.success("Video foto + suara tersimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat video");
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{item.customerName}</DialogTitle>
              <DialogDescription>
                {item.result.frame?.name ?? "Frame"} ·{" "}
                {new Date(item.result.created_at).toLocaleString("id-ID")}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={viewMode === "gif" && item.result.gif ? item.result.gif : item.result.image}
                alt=""
                className="w-full"
              />
            </div>
            {item.result.gif && (
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "photo" ? "gif" : "photo"))}
                className="tap-press flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs font-extrabold text-muted-foreground hover:bg-muted/70"
              >
                {viewMode === "photo" ? (
                  <>
                    <Film className="h-3.5 w-3.5" /> Lihat GIF
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-3.5 w-3.5" /> Lihat Foto
                  </>
                )}
              </button>
            )}
            {item.result.voice && (
              <div className="rounded-2xl border border-border p-3">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                  <Mic className="h-3.5 w-3.5" /> Pesan suara dari tamu
                </p>
                <audio controls src={item.result.voice} className="mt-2 w-full" />
              </div>
            )}
            <div className="space-y-2">
              <Button
                variant="outline"
                disabled={downloading}
                onClick={handleDownload}
                className="tap-press w-full rounded-full font-bold"
              >
                <Download className="h-4 w-4" /> {downloading ? "Menyiapkan..." : "Download Foto"}
              </Button>
              {item.result.voice && (
                <Button
                  disabled={generatingVideo}
                  onClick={handleDownloadVideo}
                  className="tap-press w-full rounded-full bg-gradient-primary font-bold text-primary-foreground"
                >
                  <Video className="h-4 w-4" />
                  {generatingVideo ? "Menyiapkan video..." : "Download Foto + Suara"}
                </Button>
              )}
              <div className={`grid gap-2 ${item.result.gif ? "grid-cols-2" : "grid-cols-1"}`}>
                {item.result.gif && (
                  <Button
                    variant="outline"
                    disabled={downloadingGif}
                    onClick={handleDownloadGif}
                    className="tap-press rounded-full font-bold"
                  >
                    <Film className="h-4 w-4" />
                    {downloadingGif ? "Menyiapkan..." : "Download GIF"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={deleting}
                  onClick={() => onDelete(item.result.id)}
                  className="tap-press rounded-full font-bold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateSessionDialog({
  frames,
  filters,
  stickers,
  open,
  onOpenChange,
}: {
  frames: Frame[];
  filters: PhotoFilter[];
  stickers: Sticker[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [frameIds, setFrameIds] = useState<number[]>([]);
  const [frameSearch, setFrameSearch] = useState("");
  const [filterIds, setFilterIds] = useState<number[]>([]);
  const [stickerIds, setStickerIds] = useState<number[]>([]);
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomePhotoUrl, setWelcomePhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; customer_name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      setResult(session);
      queryClient.setQueryData<PhotoSession[]>(["admin-sessions"], (old) => [
        session,
        ...(old ?? []),
      ]);
      toast.success("Sesi berhasil dibuat");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat sesi"),
  });

  const reset = () => {
    setCustomerName("");
    setFrameIds([]);
    setFrameSearch("");
    setFilterIds([]);
    setStickerIds([]);
    setWelcomeTitle("");
    setWelcomePhotoUrl(null);
    setResult(null);
    setCopied(false);
  };

  const toggleFrame = (id: number) => {
    setFrameIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleFilter = (id: number) => {
    setFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSticker = (id: number) => {
    setStickerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const link = result ? `${window.location.origin}/${result.slug}` : "";
  const activeFrames = frames.filter((f) => f.active);
  const visibleFrames = activeFrames.filter((f) =>
    f.name.toLowerCase().includes(frameSearch.trim().toLowerCase()),
  );
  const activeFilters = filters.filter((f) => f.active);
  const activeStickers = stickers.filter((s) => s.active);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Buat Sesi Customer</DialogTitle>
          <DialogDescription>
            Bikin link foto khusus untuk satu customer, siap dibuka dari HP mereka.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/70 p-4">
              <p className="text-xs font-bold text-muted-foreground">
                Link untuk {result.customer_name}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Input readOnly value={link} className="text-xs" />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    toast.success("Link disalin");
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={reset}>
              Buat sesi lain
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({
                customer_name: customerName,
                frame_ids: frameIds,
                filter_ids: filterIds,
                sticker_ids: stickerIds,
                welcome_photo: welcomePhotoUrl,
                welcome_title: welcomeTitle.trim() || null,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Nama customer</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="cth. Budi & Siti"
                required
              />
            </div>

            <WelcomeFieldsFieldset
              welcomeTitle={welcomeTitle}
              setWelcomeTitle={setWelcomeTitle}
              welcomePhotoUrl={welcomePhotoUrl}
              setWelcomePhotoUrl={setWelcomePhotoUrl}
              customerName={customerName}
            />

            <div className="space-y-1.5">
              <Label>Pilih frame (bisa lebih dari satu)</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={frameSearch}
                  onChange={(e) => setFrameSearch(e.target.value)}
                  placeholder="Cari nama frame..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-border p-2">
                {visibleFrames.map((f) => {
                  const checked = frameIds.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFrame(f.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="w-11 shrink-0">
                        <FrameComposite frame={f} className="rounded-md" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{f.name}</span>
                        <span className="block text-xs font-semibold text-muted-foreground">
                          {f.slots.length} foto · tone {f.tone}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {activeFrames.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada frame aktif.
                  </p>
                )}
                {activeFrames.length > 0 && visibleFrames.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Gak ada frame yang cocok dengan "{frameSearch}".
                  </p>
                )}
              </div>
              {frameIds.length > 0 && (
                <p className="text-xs font-semibold text-muted-foreground">
                  {frameIds.length} frame dipilih
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Filter (opsional)</Label>
              <p className="text-xs font-semibold text-muted-foreground">
                Kosongin buat kasih semua filter aktif ke customer.
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
                {activeFilters.map((f) => {
                  const checked = filterIds.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className="h-8 w-8 shrink-0 rounded-lg"
                        style={{ filter: f.css || undefined, background: FILTER_SWATCH_BG }}
                      />
                      <span className="truncate text-sm font-bold">{f.name}</span>
                    </button>
                  );
                })}
                {activeFilters.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada filter custom — nanti otomatis pakai filter bawaan.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stiker (opsional)</Label>
              <p className="text-xs font-semibold text-muted-foreground">
                Kosongin buat kasih semua stiker aktif ke customer.
              </p>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
                {activeStickers.map((s) => {
                  const checked = stickerIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSticker(s.id)}
                      className={`tap-press flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        checked ? "bg-primary/10" : "hover:bg-muted/70"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                        <img src={s.image} alt="" className="h-6 w-6 object-contain" />
                      </span>
                      <span className="truncate text-sm font-bold">{s.name}</span>
                    </button>
                  );
                })}
                {activeStickers.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">
                    Belum ada stiker custom — nanti otomatis pakai stiker emoji bawaan.
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending || frameIds.length === 0 || !customerName.trim()}
              className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
            >
              <Link2 className="h-4 w-4" />
              {mutation.isPending ? "Membuat link..." : "Buat Link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FrameForm({
  initial,
  frames,
  onSave,
}: {
  initial: Frame;
  frames: Frame[];
  onSave: (f: Frame) => void;
}) {
  const [draft, setDraft] = useState<Frame>(initial);
  const [activeSlot, setActiveSlot] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const slot = draft.slots[activeSlot];
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadFrameImage,
    onSuccess: (res) => {
      setDraft((d) => ({ ...d, image: res.url }));
      toast.success("Gambar frame diunggah");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal upload gambar"),
  });

  const patchSlot = (patch: Partial<Slot>) =>
    setDraft((d) => ({
      ...d,
      slots: d.slots.map((s, i) => (i === activeSlot ? { ...s, ...patch } : s)),
    }));

  const startDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    setActiveSlot(index);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = draft.slots[index];
    if (!origin) return;
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      const nx = Math.round(clamp(origin.x + dx, 0, 100 - origin.w));
      const ny = Math.round(clamp(origin.y + dy, 0, 100 - origin.h));
      setDraft((d) => ({
        ...d,
        slots: d.slots.map((s, i) => (i === index ? { ...s, x: nx, y: ny } : s)),
      }));
    };
    const onUp = () => {
      setInteracting(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startResize = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = draft.slots[index];
    if (!origin) return;
    setInteracting(true);

    const onMove = (ev: PointerEvent) => {
      const dw = ((ev.clientX - startX) / rect.width) * 100;
      const dh = ((ev.clientY - startY) / rect.height) * 100;
      const nw = Math.round(clamp(origin.w + dw, 6, 100 - origin.x));
      const nh = Math.round(clamp(origin.h + dh, 6, 100 - origin.y));
      setDraft((d) => ({
        ...d,
        slots: d.slots.map((s, i) => (i === index ? { ...s, w: nw, h: nh } : s)),
      }));
    };
    const onUp = () => {
      setInteracting(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const addSlot = () => {
    const last = draft.slots[draft.slots.length - 1];
    const next: Slot = last
      ? { id: newSlotId(), x: last.x, y: Math.min(94, last.y + last.h + 3), w: last.w, h: last.h }
      : { id: newSlotId(), x: 10, y: 6, w: 80, h: 20 };
    setDraft((d) => ({ ...d, slots: [...d.slots, next] }));
    setActiveSlot(draft.slots.length);
  };

  const removeSlot = (index: number) => {
    if (draft.slots.length <= 1) return;
    setDraft((d) => ({ ...d, slots: d.slots.filter((_, i) => i !== index) }));
    setActiveSlot((prev) => (index <= prev ? Math.max(0, prev - 1) : prev));
  };

  return (
    <div className="grid gap-8 md:grid-cols-[340px_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-xs font-bold text-muted-foreground">
          Preview slot <span className="font-semibold text-muted-foreground/70">— geser & tarik sudutnya buat atur posisi</span>
        </p>
        <div ref={previewRef} className="relative touch-none select-none">
          <FrameComposite
            frame={draft}
            showSlotLabels
            activeSlotIndex={activeSlot}
            instant={interacting}
          />
          <div className="absolute inset-0">
            {draft.slots.map((s, i) => (
              <div
                key={s.id}
                onPointerDown={(e) => startDrag(e, i)}
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
                className="absolute cursor-move touch-none"
              >
                {i === activeSlot && (
                  <div
                    onPointerDown={(e) => startResize(e, i)}
                    className="tap-press absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-card bg-primary shadow-md"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {draft.slots.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center overflow-hidden rounded-full text-xs font-extrabold ${
                i === activeSlot
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <button type="button" onClick={() => setActiveSlot(i)} className="tap-press px-3 py-1">
                Slot {i + 1}
              </button>
              {draft.slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label={`Hapus Slot ${i + 1}`}
                  className="tap-press grid h-full place-items-center px-2 py-1 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addSlot}
            className="tap-press flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-extrabold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-3 w-3" /> Tambah Slot
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama frame</Label>
          <Input
            id="name"
            value={draft.name}
            placeholder="cth. Minty Fresh Strip"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>

        <div className="space-y-1.5 sm:max-w-xs">
          <Label>Warna kertas frame</Label>
          <Select
            value={draft.tone}
            onValueChange={(v) => setDraft({ ...draft, tone: v as Frame["tone"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Gambar frame</Label>
          <div className="rounded-2xl border-2 border-dashed border-border p-5 text-center">
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Upload PNG transparan sendiri, atau pilih aset contoh
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="tap-press mt-3 rounded-full font-bold"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploadMutation.isPending ? "Mengunggah..." : "Upload Gambar"}
            </Button>
            <div className="mt-3 flex justify-center gap-3">
              {frames.slice(0, 4).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDraft({ ...draft, image: f.image })}
                  className={`tap-press h-16 w-11 overflow-hidden rounded-md border-2 ${
                    draft.image === f.image ? "border-primary" : "border-border"
                  }`}
                >
                  <img
                    src={f.image}
                    alt={f.name}
                    loading="lazy"
                    width={640}
                    height={960}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {slot && (
          <div className="space-y-3 rounded-2xl bg-muted/70 p-4">
            <p className="text-xs font-extrabold text-muted-foreground">
              Posisi & ukuran Slot {activeSlot + 1} (%)
            </p>
            {(
              [
                ["x", "Kiri"],
                ["y", "Atas"],
                ["w", "Lebar"],
                ["h", "Tinggi"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="grid grid-cols-[64px_minmax(0,1fr)_40px] items-center gap-3">
                <Label className="text-xs">{label}</Label>
                <Slider
                  value={[slot[key]]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => patchSlot({ [key]: v ?? 0 })}
                />
                <span className="text-right text-xs font-bold tabular-nums">
                  {Math.round(slot[key])}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-border p-3">
          <div>
            <p className="text-sm font-bold">Status aktif</p>
            <p className="text-xs text-muted-foreground">Frame aktif tampil di halaman user</p>
          </div>
          <Switch
            checked={draft.active}
            onCheckedChange={(v) => setDraft({ ...draft, active: v })}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border p-3">
          <div>
            <p className="text-sm font-bold">Slot rounded</p>
            <p className="text-xs text-muted-foreground">
              Sudut potongan foto membulat, atau kotak tegas kalau dimatikan
            </p>
          </div>
          <Switch
            checked={draft.rounded}
            onCheckedChange={(v) => setDraft({ ...draft, rounded: v })}
          />
        </div>

        <Button
          onClick={() => onSave(draft)}
          className="tap-press w-full rounded-full bg-gradient-primary font-extrabold"
        >
          Simpan Frame
        </Button>
      </div>
    </div>
  );
}
