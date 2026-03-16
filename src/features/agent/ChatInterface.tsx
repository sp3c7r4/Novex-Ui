import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import { useCopilotAction, useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message as CPMessage } from "@copilotkit/shared"
import { useAgent } from "@copilotkit/react-core/v2"; 

export function AgentInfo() {
  const { agent } = useAgent({
    agentId: "novex-agent",
  }); 
  return (
    <div>
      <p>Agent ID: {agent.agentId}</p>
      <p>Thread ID: {agent.threadId}</p>
      <p>Status: {agent.isRunning ? "Running" : "Idle"}</p>
      <p>Messages: {agent.messages.length}</p>
    </div>
  );
}

type Message = CPMessage & {
  timestamp: Date;
}
interface ChatInterfaceProps {
  repoName: string;
  onAISuggest?: (suggestion: string) => void;
}

export function ChatInterface({ repoName, onAISuggest }: ChatInterfaceProps) {
  const { messages, sendMessage, isLoading } = useCopilotChatHeadless_c(); 
  console.log("Messages: ", messages)
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `I'm your architecture assistant for **${repoName}**. Ask me to create diagrams, explain module relationships, or map out the dependency graph.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  // const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── CopilotKit Action ────────────────────────────────────────────────
  // Registers a frontend tool the AI agent can call to render diagrams.
  // This is safe to call even when the runtime isn't connected yet —
  // it just registers the tool definition without making network calls.
  useCopilotAction({
    name: "renderDiagram",
    description:
      "Render an architecture diagram, flowchart, or dependency graph on the whiteboard",
    parameters: [
      {
        name: "diagramType",
        type: "string",
        description:
          "The type of diagram (e.g. architecture, dependency, flow, sequence)",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "A description of what the diagram should show",
        required: true,
      },
    ],
    handler: ({ description }) => {
      onAISuggest?.(description);
      return `Diagram rendered on the whiteboard: ${description}`;
    },
    render: ({ status, args }) => (
      <div className="my-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              status === "complete"
                ? "bg-green-400"
                : "animate-pulse bg-amber-400"
            }`}
          />
          {status === "complete"
            ? `Diagram rendered: ${args?.diagramType ?? "diagram"}`
            : `Rendering ${args?.diagramType ?? "diagram"}…`}
        </div>
      </div>
    ),
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setLocalMessages((prev: Message[]) => [...prev, { ...userMsg, timestamp: new Date() }]);
    setInput("");

    // TODO: Replace this mock reply with CopilotKit's sendMessage()
    // once the CopilotKit Runtime backend is configured.
    // See: https://docs.copilotkit.ai/guides/self-hosting
    console.log("Calling sendMessage")
    await sendMessage({
      role: "user",
      content: trimmed,
      id: `a-${Date.now()}`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-border/30 bg-card/60">
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-[13px] font-medium">AI Agent</span>
        {isLoading && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Thinking
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {localMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-muted/60"
                  }`}
                >
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content)}
                  </p>
                  <p className="mt-1 text-[10px] opacity-40">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {msg.role === "user" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-3.5 w-3.5 animate-pulse text-primary" />
              </div>
              <div className="flex gap-1 rounded-xl bg-muted/60 px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area — sticky bottom */}
      <div className="border-t border-border/30 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Describe the diagram you need…"
            disabled={isLoading}
            className="h-9 flex-1 rounded-lg bg-background/50 text-[13px]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon-sm"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AgentInfo/>
    </div>
  );
}
