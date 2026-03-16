import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { WS_URL } from "@/config/constants";

export type DeploymentStatus = "idle" | "deploying" | "success" | "failed" | "destroying";

export interface DeploymentLog {
  id: string;
  timestamp: number;
  line: string;
  isError: boolean;
}

export function useDeploymentSync(repoFullName: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const seqRef = useRef(0);

  const { auth } = useAppStore();
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  const addLog = useCallback((line: string, isError = false) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `deploy-${seqRef.current++}`,
        timestamp: Date.now(),
        line,
        isError,
      },
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    seqRef.current = 0;
    setStatus("idle");
    setCurrentCommand("");
    setLiveUrl(null);
  }, []);

  useEffect(() => {
    if (!repoFullName || !auth.token) return;

    let cancelled = false;

    const doConnect = () => {
      if (cancelled) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const safeName = repoFullName.replace("/", "-");
      const url = `${WS_URL}/api/v1/ws/workspace/init/${safeName}?token=${encodeURIComponent(auth.token!)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (!raw?.type?.startsWith("DEPLOY_")) return;

          switch (raw.type) {
            case "DEPLOY_STARTED":
              setCurrentCommand(raw.strategy ?? "deploy");
              setStatus("deploying");
              addLog(`Deployment started: ${raw.message}`, false);
              break;

            case "DEPLOY_BUILDING":
              setStatus("deploying");
              addLog(raw.message, false);
              break;

            case "DEPLOY_PUSHING":
              addLog(raw.message, false);
              break;

            case "DEPLOY_PROVISIONING":
              addLog(raw.message, false);
              break;

            case "DEPLOY_LIVE":
              addLog(`Live: ${raw.url}`, false);
              setStatus("success");
              setLiveUrl(raw.url);
              setCurrentCommand("");
              break;

            case "DEPLOY_FAILED":
              addLog(raw.message, true);
              if (raw.details) addLog(raw.details, true);
              setStatus("failed");
              setCurrentCommand("");
              break;

            case "DEPLOY_DESTROYING":
              setStatus("destroying");
              addLog(raw.message, false);
              break;

            case "DEPLOY_DESTROYED":
              addLog(raw.message, false);
              setStatus("idle");
              setLiveUrl(null);
              setCurrentCommand("");
              break;
          }
        } catch {
          // ignore non-JSON or non-DEPLOY messages
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (!cancelled) {
          reconnectTimer.current = setTimeout(doConnect, 3000);
        }
      };
    };

    doConnect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [repoFullName, auth.token, addLog]);

  return {
    clearLogs,
    status,
    logs,
    connected,
    currentCommand,
    liveUrl,
  };
}
