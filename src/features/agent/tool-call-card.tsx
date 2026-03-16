import {
  Wrench,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

/** Pretty-print a tool name: excalidraw_create_element → Create Element */
function formatToolName(name: string): string {
  return name
    .replace(/^excalidraw_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Small category badge color based on tool name prefix.
 */
function badgeColor(name: string): string {
  if (name.startsWith("excalidraw"))
    return "bg-violet-500/15 text-violet-400 border-violet-500/20";
  return "bg-primary/10 text-primary border-primary/20";
}

interface ToolCallCardProps {
  name: string;
  status: "complete" | "executing" | "inProgress";
  args: Record<string, unknown>;
  result?: unknown;
}

export function ToolCallCard({ name, status, args, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isComplete = status === "complete";
  // const isExecuting = status === "executing" || status === "inProgress";

  return (
    <div className="my-1.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden text-xs">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
      >
        {/* Status icon */}
        {isComplete ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
        )}

        {/* Tool icon + name */}
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground truncate">
          {formatToolName(name)}
        </span>

        {/* Category badge */}
        <span
          className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badgeColor(name)}`}
        >
          {name.startsWith("excalidraw") ? "Excalidraw" : "Tool"}
        </span>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2 space-y-2">
          {/* Arguments */}
          {args && Object.keys(args).length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Arguments
              </p>
              <pre className="whitespace-pre-wrap break-all rounded bg-background/60 p-2 text-[11px] text-muted-foreground max-h-40 overflow-y-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {isComplete && result !== undefined && (
            <div>
              <p className="mb-1 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Result
              </p>
              <pre className="whitespace-pre-wrap break-all rounded bg-background/60 p-2 text-[11px] text-muted-foreground max-h-40 overflow-y-auto">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

