import { useEffect, useRef } from "react";
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
import { CheckCircle2, XCircle, Loader2, Terminal } from "lucide-react";
import type { AppEvent, InitEvent } from "@/types";

interface ConnectionModalProps {
  open: boolean;
  onComplete: () => void;
}

export function ConnectionModal({
  open,
  onComplete,
}: ConnectionModalProps) {
  const { eventLogs } = useAppStore();
  const { connect, disconnect } = useWebSocket({ onComplete });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) connect();
    return () => disconnect();
  }, [open, connect, disconnect]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLogs]);

  const latestProgress = (() => {
    const ev = [...eventLogs]
      .reverse()
      .find(
        (e): e is InitEvent =>
          e.type === "INIT" && e.eventType === "ANALYZING"
      );
    return ev?.progress ?? 0;
  })();

  const hasAnalyzing = eventLogs.some(
    (e) => e.type === "INIT" && e.eventType === "ANALYZING"
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
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
          <div className="mx-6 my-4 max-h-[360px] overflow-y-auto rounded-lg border border-border/40 bg-background p-4">
            <div className="space-y-1.5 font-mono text-[12px] leading-relaxed">
              {eventLogs.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Establishing connection&hellip;
                </div>
              )}

              {eventLogs.map((event) => (
                <EventLine key={event.id} event={event} />
              ))}

              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventLine({ event }: { event: AppEvent }) {
  const icon = (() => {
    if (event.type === "INIT") {
      if (event.eventType === "INIT_COMPLETE")
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      if (event.eventType === "INIT_ERROR")
        return <XCircle className="h-3 w-3 text-red-400" />;
    }
    if (event.type === "TERRAFORM") {
      if (event.eventType === "TERRAFORM_COMPLETE")
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      if (event.eventType === "TERRAFORM_ERROR")
        return <XCircle className="h-3 w-3 text-red-400" />;
    }
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  })();

  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const hasError =
    (event.type === "INIT" && event.error) ||
    (event.type === "TERRAFORM" && event.error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-start gap-2"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="shrink-0 text-muted-foreground/60">{time}</span>
      <span className="text-foreground/90">{event.message}</span>
      {hasError && (
        <span className="text-red-400">
          {event.type === "INIT" ? event.error : ""}
        </span>
      )}
    </motion.div>
  );
}
