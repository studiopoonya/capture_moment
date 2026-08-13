import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Camera, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getToken, login, setToken } from "@/lib/api";
import loginPhoto from "@/assets/foto.jpg";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [{ title: "Admin Login | Capture Moments" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await login(email, password);
      setToken(token);
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Photo side */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72 md:h-screen md:w-1/2">
        <img
          src={loginPhoto}
          alt="Photobooth Poonya Moments"
          className="h-full w-full object-cover object-[18%_28%] md:object-[25%_30%]"
        />
        {/* brand color-grade so the raw photo ties into the app palette */}
        <div className="absolute inset-0 bg-secondary mix-blend-color" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent md:bg-gradient-to-r md:from-black/20 md:via-transparent md:to-primary/25" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:bottom-10 md:left-10 md:right-auto md:w-auto">
          <p className="font-display text-xl font-extrabold text-white drop-shadow-md md:text-2xl">
            Capture Moments
          </p>
          <p className="text-xs font-semibold text-white/85 drop-shadow-md md:text-sm">
            Photobooth by Poonya Moments
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-white px-4 py-10 md:w-1/2">
        <div className="pointer-events-none absolute -top-16 -right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-16 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-12 shadow-xl shadow-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-primary shadow-soft">
              <Camera className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mt-6 text-center font-display text-3xl font-semibold tracking-tight text-slate-900">
            Admin Login
          </h1>
          <p className="mt-2 text-center text-base text-slate-500">
            Masuk untuk mengelola frame Capture Moments
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@studiopoonya.net"
                className="h-12 border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-slate-200 bg-white text-base text-slate-900"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="h-12 w-full text-base">
              <Lock className="h-4 w-4" />
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <Link
            to="/"
            className="mt-8 block text-center text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    </main>
  );
}
