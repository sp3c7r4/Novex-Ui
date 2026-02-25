import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ChatInterface } from "./ChatInterface";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Boxes } from "lucide-react";
import { getRepo, getRepoId } from "@/types";

export function AgentPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { workspaces, selectedWorkspace, setSelectedWorkspace } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (repoId) {
      const ws = workspaces.find((w) => getRepoId(w) === repoId);
      if (ws) setSelectedWorkspace(ws);
    }
  }, [repoId, workspaces, setSelectedWorkspace]);

  const handleAISuggest = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const repo = selectedWorkspace ? getRepo(selectedWorkspace) : null;
  const repoFullName =
    repo?.full_name ?? selectedWorkspace?.name ?? "Repository";

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

        {isSyncing && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Syncing
          </div>
        )}
      </header>

      {/* Resizable 2-pane layout */}
      <Group orientation="horizontal" className="flex-1">
        {/* Chat panel — 40% default */}
        <Panel defaultSize="40%" minSize="25%" maxSize="55%">
          <ChatInterface
            repoName={repoFullName}
            onAISuggest={handleAISuggest}
          />
        </Panel>

        <Separator className="w-[3px] bg-border/40 hover:bg-border transition-colors data-[resize-handle-active]:bg-primary/40" />

        {/* Excalidraw panel — 60% default */}
        <Panel defaultSize="60%" minSize="35%">
          <div className="h-full w-full">
            <Excalidraw theme="dark" />
          </div>
        </Panel>
      </Group>
    </div>
  );
}
