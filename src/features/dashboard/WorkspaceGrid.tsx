import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Folder,
  ExternalLink,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditWorkspaceModal } from "./EditWorkspaceModal";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Workspace } from "@/types";
import { getRepo } from "@/types";

interface WorkspaceGridProps {
  workspaces: Workspace[];
}

export function WorkspaceGrid({ workspaces }: WorkspaceGridProps) {
  const navigate = useNavigate();
  const { removeWorkspace } = useAppStore();

  // Edit modal state
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Delete confirmation state
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setIsEditOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWorkspace) return;

    setIsDeleting(true);
    try {
      const id = deletingWorkspace.id ?? deletingWorkspace._id;
      await api.delete(`/workspace/${id}`);
      removeWorkspace(id);
      toast.success("Workspace deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete workspace"
      );
    } finally {
      setIsDeleting(false);
      setDeletingWorkspace(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace, i) => {
          const repo = getRepo(workspace);
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

                {/* Language badge + ⋯ menu */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {repo?.language && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {repo.language}
                    </span>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleEdit(workspace)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeletingWorkspace(workspace)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                  onClick={() => navigate(`/agent/${workspace._id}`)}
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

      {/* ── Edit Workspace Modal ──────────────────────────────── */}
      <EditWorkspaceModal
        workspace={editingWorkspace}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingWorkspace(null);
        }}
      />

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <AlertDialog
        open={!!deletingWorkspace}
        onOpenChange={(open) => {
          if (!open) setDeletingWorkspace(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingWorkspace?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
