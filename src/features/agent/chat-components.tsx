import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import { Markdown } from "@copilotkit/react-ui";
import type {
  AssistantMessageProps,
  UserMessageProps,
} from "@copilotkit/react-ui";

/** Strip `<thinking>…</thinking>` blocks that some models emit. */
function stripThinkingTags(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
}

/**
 * Strip raw JSON tool-call artifacts that some models (e.g. Amazon Nova)
 * echo as text content.  These are never meant for the user.
 *
 * Patterns removed:
 *  - {"content":[...]}   – MCP tool result wrappers
 *  - {"error":true,...}   – validation error wrappers
 *  - {..."type":"rectangle"...}  – element definition arguments
 */
function stripToolCallJson(text: string): string {
  let cleaned = text;

  // 1. Remove MCP tool result wrappers: {"content":[{"type":"text","text":"..."}]}
  cleaned = cleaned.replace(
    /\{"content"\s*:\s*\[\s*\{[\s\S]*?\}\s*\]\s*\}/g,
    "",
  );

  // 2. Remove validation error blocks: {"error":true,...}
  cleaned = cleaned.replace(
    /\{"error"\s*:\s*true[\s\S]*?"validationErrors"[\s\S]*?\}\s*\}/g,
    "",
  );

  // 3. Remove element definition JSON blocks (tool call arguments echoed by model)
  //    These contain "type":"rectangle|arrow|ellipse|diamond|text|line|freedraw"
  cleaned = cleaned.replace(
    /\{[^{}]*"type"\s*:\s*"(?:rectangle|arrow|ellipse|diamond|text|line|freedraw)"[^{}]*\}/g,
    "",
  );

  // 4. Collapse multiple blank lines into one
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/* ─── Assistant bubble ──────────────────────────────────────────────── */

export function CustomAssistantMessage({
  message,
  isLoading,
  isCurrentMessage,
  markdownTagRenderers,
}: AssistantMessageProps) {
  const rawContent = message?.content || "";
  const content = stripToolCallJson(stripThinkingTags(rawContent));
  const subComponent = message?.generativeUI?.();
  const subComponentPosition = message?.generativeUIPosition ?? "after";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 justify-start"
    >
      {/* Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Bubble */}
      <div className="max-w-[85%] space-y-1.5">
        {/* Generative UI (before) */}
        {subComponent && subComponentPosition === "before" && (
          <div>{subComponent}</div>
        )}

        {content && (
          <div className="rounded-xl bg-muted/60 px-3.5 py-2.5">
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_pre]:my-1.5 [&_pre]:rounded-lg [&_pre]:bg-background/50 [&_pre]:p-3 [&_code]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
              <Markdown content={content} components={markdownTagRenderers} />
            </div>
          </div>
        )}

        {/* Generative UI (after) */}
        {subComponent && subComponentPosition !== "before" && (
          <div>{subComponent}</div>
        )}

        {/* Typing dots (only for the latest message while loading) */}
        {isLoading && isCurrentMessage && !content && (
          <div className="flex gap-1 rounded-xl bg-muted/60 px-3.5 py-3">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── User bubble ───────────────────────────────────────────────────── */

export function CustomUserMessage({ message }: UserMessageProps) {
  const content =
    typeof message?.content === "string"
      ? message.content
      : Array.isArray(message?.content)
        ? message.content
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ")
        : "";

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 justify-end"
    >
      {/* Bubble */}
      <div className="max-w-[85%] rounded-xl bg-foreground text-background px-3.5 py-2.5">
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

