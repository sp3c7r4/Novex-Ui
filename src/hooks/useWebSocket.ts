import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { WS_URL } from "@/config/constants";
import type { AppEvent } from "@/types";
import { toast } from "sonner";

interface UseWebSocketOptions {
  onComplete?: () => void;
}

export function useWebSocket({ onComplete }: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { auth, addEvent, setIsInitializing, clearEvents } = useAppStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!auth.token) return;

    setIsInitializing(true);
    clearEvents();

    // Connect to WS endpoint with auth token as query param
    // Backend identifies the subscription via websocket:${authId}
    const url = `${WS_URL}/api/v1/ws/workspace/init/?token=${encodeURIComponent(auth.token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      addEvent({
        id: `evt-${Date.now()}`,
        type: "INIT",
        eventType: "CONNECTING",
        message: "Connected to server",
        timestamp: Date.now(),
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AppEvent;
        addEvent(data);

        // On init complete → navigate to agent page
        if (data.type === "INIT" && data.eventType === "INIT_COMPLETE") {
          setIsInitializing(false);
          if (data.repoId) {
            setTimeout(() => {
              navigate(`/agent/${data.repoId}`);
              onComplete?.();
            }, 800);
          } else {
            onComplete?.();
          }
        }

        // On error → toast
        if (
          (data.type === "INIT" && data.eventType === "INIT_ERROR") ||
          (data.type === "TERRAFORM" && data.eventType === "TERRAFORM_ERROR")
        ) {
          setIsInitializing(false);
          toast.error("Initialization failed", {
            description: data.message,
          });
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      setIsInitializing(false);
      toast.error("Connection error", {
        description: "Could not connect to the server",
      });
    };

    ws.onclose = () => {
      setIsInitializing(false);
    };
  }, [auth.token, addEvent, setIsInitializing, clearEvents, navigate, onComplete]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsInitializing(false);
  }, [setIsInitializing]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect };
}
