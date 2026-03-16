import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { WS_URL } from "@/config/constants";
import type { AnyEvent, Workspace } from "@/types";
import { eventLabel, getRepo } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";

interface UseWebSocketOptions {
  onComplete?: () => void;
}

export function useWebSocket({ onComplete }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const seqRef = useRef(0);
  const repoFullNameRef = useRef("");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const navigate = useNavigate();
  const { auth, addEvent, setIsInitializing, clearEvents, setWorkspaces } =
    useAppStore();

  /** Push a display event into the store. */
  const pushEvent = useCallback(
    (raw: AnyEvent, label?: string) => {
      addEvent({
        id: `evt-${seqRef.current++}`,
        timestamp: Date.now(),
        label: label ?? eventLabel(raw),
        raw,
      });
    },
    [addEvent],
  );

  /**
   * After INIT_COMPLETE:
   * 1. Fetch fresh workspaces to find the populated repoId
   * 2. Run a 3 → 2 → 1 countdown in the terminal log
   * 3. Navigate to /agent/<repoId>
   */
  const handleInitComplete = useCallback(async () => {
    // Resolve destination
    let destination = "/dashboard"; // fallback

    try {
      const { data } = await api.get("/workspace");
      const list: Workspace[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setWorkspaces(list);

      const ws = list.find(
        (w) => getRepo(w)?.full_name === repoFullNameRef.current,
      );
      if (ws) {
        destination = `/agent/${ws._id}`;
      }
    } catch {
      // If fetch fails we'll just go to dashboard
    }

    // Countdown 3 → 2 → 1
    const COUNTDOWN = 3;
    for (let i = COUNTDOWN; i >= 1; i--) {
      const seconds = i;
      const delay = (COUNTDOWN - i + 1) * 1000; // 1s, 2s, 3s
      setTimeout(() => {
        pushEvent({
          type: "REDIRECT_COUNTDOWN",
          seconds,
          destination,
        });
      }, delay);
    }

    // Navigate after countdown finishes
    setTimeout(() => {
      navigate(destination);
      onCompleteRef.current?.();
    }, (COUNTDOWN + 1) * 1000);
  }, [pushEvent, setWorkspaces, navigate]);

  const connect = useCallback(
    (repoFullName: string) => {
      if (connectingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (!auth.token) return;

      connectingRef.current = true;
      repoFullNameRef.current = repoFullName;
      seqRef.current = 0;
      setIsInitializing(true);
      clearEvents();

      const safeRepoName = repoFullName.replace("/", "-");
      const url = `${WS_URL}/api/v1/ws/workspace/init/${safeRepoName}?token=${encodeURIComponent(auth.token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        pushEvent({ type: "WS_CONNECTED", message: "Connected to server" });
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as AnyEvent;
          pushEvent(raw);

          // ── INIT_COMPLETE → countdown then navigate ──────────────
          if (raw.type === "INIT_COMPLETE") {
            setIsInitializing(false);
            handleInitComplete();
          }

          // ── Error events → toast ─────────────────────────────────
          if (raw.type === "INIT_ERROR" || raw.type === "DEPLOY_FAILED") {
            setIsInitializing(false);
            toast.error("Initialization failed", {
              description: "message" in raw ? raw.message : "Unknown error",
            });
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      ws.onerror = () => {
        connectingRef.current = false;
        setIsInitializing(false);
        toast.error("Connection error", {
          description: "Could not connect to the server",
        });
      };

      ws.onclose = () => {
        connectingRef.current = false;
        setIsInitializing(false);
      };
    },
    [auth.token, pushEvent, setIsInitializing, clearEvents, handleInitComplete],
  );

  const disconnect = useCallback(() => {
    connectingRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
    setIsInitializing(false);
  }, [setIsInitializing]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect };
}
