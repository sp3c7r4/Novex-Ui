import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAppStore } from "@/store/useAppStore";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Maximize2,
  ArrowRight,
} from "lucide-react";
import type { DisplayEvent } from "@/types";
import {
  isSuccessEvent,
  isErrorEvent,
  isAnalyzingEvent,
  isRedirectEvent,
} from "@/types/events";

interface ConnectionModalProps {
  open: boolean;
  repoFullName: string;
  onComplete: () => void;
}

export function ConnectionModal({
  open,
  repoFullName,
  onComplete,
}: ConnectionModalProps) {
  const { eventLogs, isInitializing } = useAppStore();
  const { connect, disconnect } = useWebSocket({ onComplete });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // "expanded" = full modal, "minimized" = small floating tab
  const [view, setView] = useState<"expanded" | "minimized">("expanded");

  useEffect(() => {
    if (open && repoFullName) connect(repoFullName);
    return () => disconnect();
  }, [open, repoFullName, connect, disconnect]);

  // Auto-scroll to latest event
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLogs]);

  // Find latest ANALYZING progress for the progress bar
  const latestProgress = (() => {
    const ev = [...eventLogs]
      .reverse()
      .find((e) => isAnalyzingEvent(e.raw));
    if (ev && isAnalyzingEvent(ev.raw)) return ev.raw.progress;
    return 0;
  })();

  const hasAnalyzing = eventLogs.some((e) => isAnalyzingEvent(e.raw));

  const lastEvent = eventLogs[eventLogs.length - 1];
  const lastMessage = lastEvent?.label ?? "Initializing…";

  // ── Minimized floating tab ──────────────────────────────────────────
  if (!open) return null;

  if (view === "minimized") {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => setView("expanded")}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md hover:bg-card transition-colors cursor-pointer max-w-xs"
      >
        {isInitializing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
        <div className="min-w-0 text-left">
          <p className="text-xs font-medium text-foreground truncate">
            {isInitializing ? "Initializing…" : "Complete"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {lastMessage}
          </p>
        </div>
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </motion.button>
    );
  }

  // ── Expanded full modal ─────────────────────────────────────────────
  return (
    <Dialog
      open
      onOpenChange={() => {
        setView("minimized");
      }}
    >
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Terminal className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Initializing Workspace
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                Analyzing repository structure&hellip;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Progress bar */}
          {hasAnalyzing && (
            <div className="px-6 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Analyzing</span>
                <span className="tabular-nums">{latestProgress}%</span>
              </div>
              <Progress value={latestProgress} />
            </div>
          )}

          {/* Terminal log area */}
          <div className="mx-6 my-4 max-h-[360px] overflow-y-auto no-scrollbar rounded-lg border border-border/40 bg-background p-4">
            <div className="space-y-1.5 font-mono text-[12px] leading-relaxed">
              {eventLogs.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Establishing connection&hellip;
                </div>
              )}

              {eventLogs.map((evt, index) => (
                <EventLine
                  key={evt.id}
                  event={evt}
                  isLatest={index === eventLogs.length - 1}
                />
              ))}

              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Single event line ───────────────────────────────────────────────────

function EventLine({
  event,
  isLatest,
}: {
  event: DisplayEvent;
  isLatest: boolean;
}) {
  const raw = event.raw;

  const icon = (() => {
    if (isRedirectEvent(raw))
      return <ArrowRight className="h-3 w-3 text-sky-400" />;
    if (isSuccessEvent(raw))
      return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
    if (isErrorEvent(raw))
      return <XCircle className="h-3 w-3 text-red-400" />;

    // Only the very latest non-terminal event shows a spinner
    if (isLatest)
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;

    // Past intermediate steps are done
    return <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" />;
  })();

  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="shrink-0 text-muted-foreground/60">{time}</span>
      <span
        className={
          isRedirectEvent(raw)
            ? "text-sky-400 font-medium"
            : isErrorEvent(raw)
              ? "text-red-400"
              : "text-foreground/90"
        }
      >
        {event.label}
      </span>
      {raw.type === "INIT_ERROR" && raw.details && (
        <span className="text-red-400/70 text-[11px]">{raw.details}</span>
      )}
    </motion.div>
  );
}
