import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Camera, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capture Moments — Photobooth Pastel di HP Kamu" },
      {
        name: "description",
        content: "Layanan photobooth khusus untuk event kamu — hubungi admin buat dapetin link sesi foto.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  useEffect(() => {
    document.documentElement.classList.add("landing-light");
    return () => document.documentElement.classList.remove("landing-light");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-soft">
          <Camera className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-shimmer">Capture Moments</h1>
        <p className="text-sm font-semibold text-muted-foreground">by Poonya Moments</p>

        <div className="mt-8 rounded-3xl bg-card p-6 shadow-soft">
          <MessageCircle className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-lg font-extrabold">Link Khusus Buat Event Kamu</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Photobooth ini dipakai lewat link khusus per event. Hubungi admin Poonya Moments buat
            dapetin link sesi foto kamu.
          </p>
        </div>
      </div>
    </main>
  );
}
