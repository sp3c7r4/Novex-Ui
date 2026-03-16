import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { CopilotKit, useCopilotAction, useCopilotReadable, useDefaultTool } from "@copilotkit/react-core";
import {
  CustomAssistantMessage,
  CustomUserMessage,
} from "./chat-components";
import { ToolCallCard } from "./tool-call-card";
import { useAppStore } from "@/store/useAppStore";
import { useExcalidrawSync } from "@/hooks/useExcalidrawSync";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Boxes, Cloud, Rocket, Wifi, WifiOff } from "lucide-react";
import { AwsCredentialsModal } from "@/features/settings/AwsCredentialsModal";
import { DeploymentPanel } from "./DeploymentPanel";
import { useDeploymentSync } from "@/hooks/useDeploymentSync";
import { getRepo, type Repo } from "@/types";
import { COPILOT_RUNTIME_URL } from "@/config/constants";
import api from "@/lib/api";

function generateThreadId(userId: string, repoId: string) {
  return `${userId}:${repoId}`;
}

/* ─── Chat panel (lives inside <CopilotKit>) so hooks have context ── */

interface ChatPanelProps {
  repoFullName: string;
  repo: Repo | null;
  repoMarkdown: string;
  onDiagramSuggest: (description: string) => void;
}

function ChatPanel({
  repoFullName,
  repo,
  repoMarkdown,
  onDiagramSuggest,
}: ChatPanelProps) {
  /* ── Inject repo metadata into every agent call ── */
  useCopilotReadable({
    description: "Connected repository metadata",
    value: repo
      ? {
          name: repo.full_name,
          language: repo.language,
          branch: repo.default_branch,
          version: repo.current_version,
          initialized: repo.initialized,
        }
      : null,
  });

  /* ── Inject full repo analysis so the agent knows the codebase ── */
  useCopilotReadable({
    description:
      "Full technical analysis of the connected repository — use this to understand the tech stack, services, databases, folder structure, and architecture when creating diagrams or answering questions",
    value: repoMarkdown || null,
  });

  /* ── Default tool call renderer — shows ALL backend tool calls ── */
  useDefaultTool({
    render: (props) => <ToolCallCard {...props} />,
  });

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
      onDiagramSuggest(description);
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

  const chatInstructions = repoMarkdown
    ? `You are Novex, an AI architecture assistant for the repository "${repoFullName}".

Here is the full technical analysis of this codebase:

${repoMarkdown}

Use this knowledge when answering questions, creating architecture diagrams, or suggesting improvements. When the user asks you to "show the architecture", base it on the ACTUAL services, databases, and frameworks described above — not a generic template.`
    : `You are an AI architecture assistant for "${repoFullName}". The repository analysis is still loading — ask the user to wait a moment.`;

  return (
    <CopilotChat
      className="h-full"
      labels={{
        title: "AI Agent",
        initial: `I'm your architecture assistant for **${repoFullName}**. Ask me to create diagrams, explain module relationships, or map out the dependency graph.`,
        placeholder: "Describe the diagram you need…",
      }}
      instructions={chatInstructions}
      suggestions={[
        {
          title: "Show architecture diagram",
          message: "Show architecture diagram",
        },
        { title: "Map dependency graph", message: "Map dependency graph" },
        {
          title: "Explain module structure",
          message: "Explain module structure",
        },
      ]}
      AssistantMessage={CustomAssistantMessage}
      UserMessage={CustomUserMessage}
    />
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */

export function AgentPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { auth, workspaces, selectedWorkspace, setSelectedWorkspace } =
    useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [repoMarkdown, setRepoMarkdown] = useState("");
  const [awsModalOpen, setAwsModalOpen] = useState(false);
  const [deployPanelExpanded, setDeployPanelExpanded] = useState(true);
  const [deployPanelVisible, setDeployPanelVisible] = useState(false);

  // Excalidraw ↔ WS sync hook
  const { onAPIReady, syncStatus, activities } = useExcalidrawSync();

  const repo = selectedWorkspace ? getRepo(selectedWorkspace) : null;
  const repoFullName =
    repo?.full_name ?? selectedWorkspace?.name ?? "Repository";

  // Deployment progress hook — auto-connects WebSocket when repo is available
  const deployment = useDeploymentSync(repo?.full_name ?? null);

  useEffect(() => {
    if (workspaceId) {
      const ws = workspaces.find(
        (w) => w._id === workspaceId || w.id === workspaceId,
      );
      if (ws) setSelectedWorkspace(ws);
    }
  }, [workspaceId, workspaces, setSelectedWorkspace]);

  // Show panel when deployment starts
  useEffect(() => {
    if (deployment.status !== "idle") {
      setDeployPanelVisible(true);
      setDeployPanelExpanded(true);
    }
  }, [deployment.status]);

  // Fetch repo markdown summary from S3 via backend
  useEffect(() => {
    if (!workspaceId) return;
    api
      .get(`/workspace/${workspaceId}/repo-summary`)
      .then(({ data }) => {
        const summary = data?.data ?? data;
        const md = summary?.markdown ?? "";
        if (md) {
          console.log(`[AgentPage] Loaded repo summary (${md.length} chars)`);
        }
        setRepoMarkdown(md);
      })
      .catch((err) => {
        console.warn("[AgentPage] Failed to load repo summary:", err.message);
      });
  }, [workspaceId]);

  // @ts-expect-error - auth.user?._id is not undefined
  const threadId = generateThreadId(auth.user?._id, workspaceId!);

  const handleAISuggest = useCallback((suggestion: string) => {
    console.log("[AgentPage] AI diagram suggestion:", suggestion);
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }, []);

  if (!selectedWorkspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Boxes className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Workspace not found</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Minimal header bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/50 bg-card/50 px-4 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-medium">
            {selectedWorkspace.name}
          </span>
          <span className="hidden sm:inline truncate text-xs text-muted-foreground">
            {repoFullName}
          </span>
        </div>

        {/* Header right actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAwsModalOpen(true)}
            className="text-muted-foreground hover:text-amber-400"
            title="AWS Credentials"
          >
            <Cloud className="h-4 w-4" />
          </Button>

          {deployment.status !== "idle" && (
            <button
              onClick={() => { setDeployPanelVisible(true); setDeployPanelExpanded(true); }}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-accent/40 transition-colors"
            >
              {deployment.status === "deploying" || deployment.status === "destroying" ? (
                <>
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-amber-400">
                    {deployment.status === "deploying" ? "Deploying" : "Destroying"}...
                  </span>
                </>
              ) : deployment.status === "success" ? (
                <>
                  <Rocket className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Deployed</span>
                </>
              ) : (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="text-red-400">Failed</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {syncStatus === "connected" ? (
              <>
                <Wifi className="h-3 w-3 text-green-400" />
                <span className="hidden sm:inline">Canvas connected</span>
              </>
            ) : syncStatus === "syncing" ? (
              <>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span className="hidden sm:inline">Syncing…</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-400" />
                <span className="hidden sm:inline">Canvas disconnected</span>
              </>
            )}
          </div>

          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              AI drawing
            </div>
          )}
        </div>
      </header>

      {/* Resizable 2-pane layout */}
      <Group orientation="horizontal" className="flex-1">
        {/* Chat panel — 40% default */}
        <Panel defaultSize="40%" minSize="25%" maxSize="55%">
          <CopilotKit
            key={threadId}
            runtimeUrl={COPILOT_RUNTIME_URL}
            agent="novex-agent"
            threadId={threadId}
            showDevConsole={false}
          >
            <ChatPanel
              repoFullName={repoFullName}
              repo={repo}
              repoMarkdown={repoMarkdown}
              onDiagramSuggest={handleAISuggest}
            />
          </CopilotKit>
        </Panel>

        <Separator className="w-[3px] bg-border/40 hover:bg-border transition-colors data-[resize-handle-active]:bg-primary/40" />

        {/* Excalidraw panel — 60% default */}
        <Panel defaultSize="60%" minSize="35%">
          <div className="relative h-full w-full">
            <Excalidraw
              theme="dark"
              excalidrawAPI={onAPIReady}
              initialData={{
                elements: [],
                appState: {
                  theme: "dark",
                  viewBackgroundColor: "#1e1e2e",
                },
              }}
            />

            {/* Real-time tool activity overlay */}
            {activities.length > 0 && (
              <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-1.5 pointer-events-none max-w-xs">
                {activities.map((activity) => {
                  const dotColor = {
                    create: "bg-emerald-400",
                    update: "bg-blue-400",
                    delete: "bg-red-400",
                    clear: "bg-amber-400",
                    viewport: "bg-violet-400",
                    capture: "bg-cyan-400",
                  }[activity.variant];

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-2 rounded-lg bg-card/90 px-3 py-1.5 text-xs text-foreground shadow-lg backdrop-blur-sm border border-border/40 animate-in slide-in-from-left-5 fade-in duration-300"
                    >
                      <div
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor} animate-pulse`}
                      />
                      <span className="truncate font-medium">
                        {activity.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </Group>

      {deployPanelVisible && (
        <DeploymentPanel
          status={deployment.status}
          logs={deployment.logs}
          currentCommand={deployment.currentCommand}
          expanded={deployPanelExpanded}
          onToggle={() => setDeployPanelExpanded((v) => !v)}
          onClose={() => setDeployPanelVisible(false)}
          onClearLogs={deployment.clearLogs}
          liveUrl={deployment.liveUrl}
        />
      )}

      <AwsCredentialsModal
        open={awsModalOpen}
        onOpenChange={setAwsModalOpen}
        workspaceId={workspaceId!}
      />
    </div>
  );
}
