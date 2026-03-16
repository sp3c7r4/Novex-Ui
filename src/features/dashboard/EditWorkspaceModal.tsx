import { useState, useEffect } from "react";
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
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Workspace } from "@/types";

interface EditWorkspaceModalProps {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWorkspaceModal({
  workspace,
  open,
  onOpenChange,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { updateWorkspace } = useAppStore();

  // Sync form fields when the workspace changes
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description ?? "");
    }
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsSaving(true);
    try {
      const id = workspace.id ?? workspace._id;
      await api.put(`/workspace/${id}`, { name, description });

      // Update the local store
      updateWorkspace(id, { name, description });
      toast.success("Workspace updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update workspace"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-base">Edit Workspace</DialogTitle>
          <DialogDescription className="text-[13px]">
            Update the workspace name or description.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-ws-name" className="text-[13px]">
              Name
            </Label>
            <Input
              id="edit-ws-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="e.g. Frontend Architecture"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ws-desc" className="text-[13px]">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-ws-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Brief description of the workspace"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/40 px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

