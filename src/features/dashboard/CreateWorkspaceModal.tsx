import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { RepoSelector } from "./RepoSelector";
import { ConnectionModal } from "./ConnectionModal";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import { toast } from "sonner";
import type { GitHubRepo, Workspace } from "@/types";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "info" | "repo" | "connecting";

const STEPS: { key: Step; label: string }[] = [
  { key: "info", label: "Details" },
  { key: "repo", label: "Repository" },
  { key: "connecting", label: "Initialize" },
];

export function CreateWorkspaceModal({
  open,
  onOpenChange,
}: CreateWorkspaceModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { addWorkspace } = useAppStore();

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const handleInfoNext = () => {
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setStep("repo");
  };

  const handleRepoNext = async () => {
    if (!selectedRepo) {
      toast.error("Please select a repository");
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await api.post("/workspace/create", {
        name,
        description,
        repo: {
          default_branch: selectedRepo.default_branch,
          description: selectedRepo.description ?? "",
          full_name: selectedRepo.full_name,
          language: selectedRepo.language ?? "",
          name: selectedRepo.name,
          private: selectedRepo.private,
        },
      });

      // After interceptor unwrap, data is { message, data: { ...workspace } }
      const workspace: Workspace = (data as { data: Workspace }).data;
      addWorkspace(workspace);
      setStep("connecting");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create workspace"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    if (step === "connecting") return;
    setStep("info");
    setName("");
    setDescription("");
    setSelectedRepo(null);
    onOpenChange(false);
  };

  /** Called when the WS initialization completes or navigates away */
  const handleConnectionComplete = () => {
    setStep("info");
    setName("");
    setDescription("");
    setSelectedRepo(null);
    onOpenChange(false);
  };

  return (
    <>
      {/* Main multi-step dialog */}
      <Dialog open={open && step !== "connecting"} onOpenChange={resetAndClose}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden">
          {/* Step indicator */}
          <div className="flex items-center gap-1 border-b border-border/40 px-6 pt-6 pb-4">
            {STEPS.slice(0, 2).map((s, i) => (
              <div key={s.key} className="flex items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    i <= currentStepIndex
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    i <= currentStepIndex
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < 1 && (
                  <div className="mx-2 h-px w-8 bg-border" />
                )}
              </div>
            ))}
          </div>

          <div className="overflow-hidden px-6 py-5">
            <AnimatePresence mode="wait">
              {step === "info" && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0"
                >
                  <DialogHeader className="mb-5">
                    <DialogTitle className="text-base">
                      Workspace Details
                    </DialogTitle>
                    <DialogDescription className="text-[13px]">
                      Give your workspace a name and optional description.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ws-name" className="text-[13px]">
                        Name
                      </Label>
                      <Input
                        id="ws-name"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setName(e.target.value)
                        }
                        placeholder="e.g. Frontend Architecture"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ws-desc" className="text-[13px]">
                        Description{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="ws-desc"
                        value={description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDescription(e.target.value)
                        }
                        placeholder="Brief description of the workspace"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetAndClose}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleInfoNext}>
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "repo" && (
                <motion.div
                  key="repo"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 overflow-hidden"
                >
                  <DialogHeader className="mb-5">
                    <DialogTitle className="text-base">
                      Select Repository
                    </DialogTitle>
                    <DialogDescription className="text-[13px]">
                      Choose the GitHub repository to analyze.
                    </DialogDescription>
                  </DialogHeader>

                  <RepoSelector
                    selectedRepo={selectedRepo}
                    onSelect={setSelectedRepo}
                  />

                  <div className="mt-6 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep("info")}
                      disabled={isCreating}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRepoNext}
                      disabled={!selectedRepo || isCreating}
                      className="gap-1.5"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create Workspace"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection / initialization modal */}
      {step === "connecting" && (
        <ConnectionModal open onComplete={handleConnectionComplete} />
      )}
    </>
  );
}
