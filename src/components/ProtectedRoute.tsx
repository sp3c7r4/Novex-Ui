import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { auth, setAuth, logout } = useAppStore();

  // Derive the initial verification status synchronously (no effect needed)
  const [verifyStatus, setVerifyStatus] = useState<"loading" | "ok" | "fail">(
    () => {
      if (!auth.token) return "fail";
      if (auth.user) return "ok"; // cached user → show page, re-verify in background
      return "loading";
    }
  );

  // Background verify – only calls setState in async callbacks (no synchronous setState)
  useEffect(() => {
    if (!auth.token) return;

    const isInitialLoad = !auth.user;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.post<{ message: string; user: User }>(
          "/auth/verify"
        );
        if (!cancelled) {
        setAuth(auth.token!, data.user);
          setVerifyStatus("ok");
        }
      } catch {
        if (!cancelled && isInitialLoad) {
          toast.error("Session expired. Please sign in again.");
          logout();
          setVerifyStatus("fail");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If the token was removed (logout while mounted), redirect immediately
  if (!auth.token) {
    return <Navigate to="/" replace />;
  }

  if (verifyStatus === "fail") {
    return <Navigate to="/" replace />;
  }

  if (verifyStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
