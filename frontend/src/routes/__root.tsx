import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { PhotoboothProvider } from "@/lib/photobooth-store";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <p className="text-5xl">📸</p>
        <h1 className="mt-4 text-3xl font-bold text-foreground">404</h1>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sepertinya frame ini sudah hilang dari studio kami.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="tap-press inline-flex items-center justify-center rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="max-w-md rounded-3xl bg-card p-8 text-center shadow-soft">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Halaman ini gagal dimuat
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ada yang tidak beres. Coba muat ulang atau balik ke home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="tap-press inline-flex items-center justify-center rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="tap-press inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-bold text-foreground"
          >
            Ke Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Capture Moments — Photobooth di HP kamu" },
      {
        name: "description",
        content:
          "Pilih frame favoritmu, jepret beberapa foto, dan langsung dapat photostrip pastel siap dibagikan.",
      },
      { property: "og:title", content: "Capture Moments — Photobooth di HP kamu" },
      {
        property: "og:description",
        content: "Photobooth web mobile-first dengan frame pastel lucu dan hasil siap dibagikan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <PhotoboothProvider>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <Toaster />
      </PhotoboothProvider>
    </QueryClientProvider>
  );
}
