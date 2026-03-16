import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Rocket,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  X,
  ExternalLink,
} from "lucide-react";
import type { DeploymentStatus, DeploymentLog } from "@/hooks/useDeploymentSync";

interface Props {
  status: DeploymentStatus;
  logs: DeploymentLog[];
  currentCommand: string;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClearLogs: () => void;
  liveUrl?: string | null;
}

const statusConfig: Record<
  DeploymentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  idle: {
    label: "No active deployment",
    color: "text-muted-foreground",
    icon: <Terminal className="h-3.5 w-3.5" />,
  },
  deploying: {
    label: "Deploying...",
    color: "text-amber-400",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  success: {
    label: "Deployed",
    color: "text-emerald-400",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  destroying: {
    label: "Destroying...",
    color: "text-orange-400",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
};

export function DeploymentPanel({
  status,
  logs,
  currentCommand,
  expanded,
  onToggle,
  onClose,
  onClearLogs,
  liveUrl,
}: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const cfg = statusConfig[status];

  useEffect(() => {
    if (expanded) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, expanded]);

  return (
    <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Deployment</span>
          <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {currentCommand && (
            <span className="text-xs text-muted-foreground">
              ({currentCommand})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {liveUrl && status === "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(liveUrl, "_blank");
              }}
              className="text-emerald-400 hover:text-emerald-300 text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open App
            </Button>
          )}

          {logs.length > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {logs.length} lines
            </span>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClearLogs();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      {expanded && (
        <div className="max-h-56 overflow-y-auto border-t border-border/30 bg-background/60 font-mono text-[11px] leading-5">
          {logs.length === 0 ? (
            <p className="px-4 py-3 text-muted-foreground">
              Waiting for deployment output...
            </p>
          ) : (
            <div className="px-4 py-2 space-y-px">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`whitespace-pre-wrap break-all ${
                    log.isError ? "text-red-400" : "text-foreground/80"
                  }`}
                >
                  {log.line}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
