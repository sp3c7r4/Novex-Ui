import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Folder, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Workspace } from "@/types";
import { getRepo, getRepoId } from "@/types";

interface WorkspaceGridProps {
  workspaces: Workspace[];
}

export function WorkspaceGrid({ workspaces }: WorkspaceGridProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace, i) => {
        const repo = getRepo(workspace);
        const repoId = getRepoId(workspace);
        const repoFullName = repo?.full_name ?? "—";
        const repoUrl = repo
          ? `https://github.com/${repo.full_name}`
          : "#";

        return (
          <motion.div
            key={workspace.id ?? workspace._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="group relative flex flex-col rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-border"
          >
            {/* Header */}
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Folder className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium leading-tight">
                  {workspace.name}
                </h3>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {repoFullName}
                </p>
              </div>
              {repo?.language && (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {repo.language}
                </span>
              )}
            </div>

            {/* Description */}
            {workspace.description && (
              <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                {workspace.description}
              </p>
            )}

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
              {repo ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  Repository
                </a>
              ) : (
                <span />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/agent/${repoId}`)}
                className="gap-1 text-xs"
              >
                Open
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
