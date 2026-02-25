import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, LogOut, Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { WorkspaceGrid } from "./WorkspaceGrid";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Workspace } from "@/types";

export function DashboardPage() {
  const { workspaces, setWorkspaces, logout, auth } = useAppStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFetchingWorkspaces, setIsFetchingWorkspaces] = useState(true);
  const navigate = useNavigate();

  const user = auth.user;
  const displayName = user
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : null;

  // Fetch workspaces from API on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const { data } = await api.get("/workspace");
        // After interceptor unwrap, data is { message, data: [...] }
        const list: Workspace[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setWorkspaces(list);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch workspaces"
        );
      } finally {
        setIsFetchingWorkspaces(false);
      }
    };

    if (auth.token) fetchWorkspaces();
    else setIsFetchingWorkspaces(false);
  }, [auth.token, setWorkspaces]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold tracking-tight">Novex</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Workspace
            </Button>

            {/* User avatar + logout */}
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName ?? "User"}
                  className="h-7 w-7 rounded-full border border-border/50"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {user?.firstName?.charAt(0) ?? "?"}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName ? `Welcome, ${displayName}` : "Workspaces"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.email
                ? `Signed in as ${user.email}`
                : "Your repository analysis workspaces"}
            </p>
          </div>

          {isFetchingWorkspaces ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Loading workspaces…
              </p>
            </div>
          ) : workspaces.length > 0 ? (
            <WorkspaceGrid workspaces={workspaces} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-24">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-card">
                <Boxes className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-sm font-medium">No workspaces yet</h3>
              <p className="mt-1.5 max-w-sm text-center text-[13px] text-muted-foreground">
                Create a workspace to start analyzing and visualizing a
                repository&apos;s architecture.
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="mt-6 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Workspace
              </Button>
            </div>
          )}
        </motion.div>
      </main>

      <CreateWorkspaceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
