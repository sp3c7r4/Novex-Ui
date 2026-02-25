import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types";

type AuthMode = "login" | "signup";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, auth } = useAppStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (auth.token && auth.user) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.token, auth.user, navigate]);

  // Listen for the OAuth popup to send back the token
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const token = event.data?.token;
      if (!token) return;

      try {
        // Verify token and fetch user details before navigating
        const { data } = await api.post<{ message: string; user: User }>(
          "/auth/verify",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setAuth(token, data.user);
        navigate("/dashboard");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to verify authentication";
        toast.error(message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, setAuth]);

  const handleGitHubAuth = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ message: string; url: string }>(
        "/auth/github/auth",
        { params: { action: mode } }
      );

      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.url,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initiate GitHub auth";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-muted/40 via-background to-background" />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-10 px-6"
      >
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-card shadow-lg">
            <Boxes className="h-7 w-7 text-foreground" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <h1 className="text-3xl font-semibold tracking-tight">
                {isLogin ? "Welcome back" : "Get started"}
              </h1>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                {isLogin
                  ? "Sign in to continue to your workspaces."
                  : "Create an account to start analyzing your repositories."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Login / Signup toggle */}
        <div className="flex items-center rounded-lg border border-border/50 bg-card/60 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative rounded-md px-5 py-1.5 text-[13px] font-medium transition-colors ${
                mode === m
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {mode === m && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-md bg-muted"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {m === "login" ? "Log in" : "Sign up"}
              </span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleGitHubAuth}
          disabled={loading}
          size="lg"
          className="h-11 gap-2.5 rounded-lg px-6 text-sm font-medium"
        >
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Github className="h-[18px] w-[18px]" />
          )}
          {isLogin ? "Sign in with GitHub" : "Sign up with GitHub"}
        </Button>

        <p className="text-xs text-muted-foreground/60">
          {isLogin
            ? "Authenticate via GitHub to access your repositories"
            : "We'll create your account using your GitHub profile"}
        </p>
      </motion.div>
    </div>
  );
}
