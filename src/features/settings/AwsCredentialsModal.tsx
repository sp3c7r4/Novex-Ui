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
import { Loader2, Trash2, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-north-1",
  "eu-central-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "sa-east-1",
  "ca-central-1",
  "cn-north-1",
  "cn-northwest-1",
  "me-south-1",
  "il-central-1",
  "us-gov-east-1",
];

interface SavedCredential {
  _id: string;
  label: string;
  accessKeyId: string;
  region: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function AwsCredentialsModal({ open, onOpenChange, workspaceId }: Props) {
  const [saved, setSaved] = useState<SavedCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("My AWS Account");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("us-east-1");

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    api
      .get(`/aws-credentials/workspace/${workspaceId}`)
      .then(({ data }) => {
        const list = data?.data ?? data ?? [];
        setSaved(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  const handleSave = async () => {
    if (!accessKeyId || !secretAccessKey) {
      toast.error("Access Key and Secret Key are required");
      return;
    }

    setSaving(true);
    try {
      await api.post("/aws-credentials", {
        workspaceId,
        accessKeyId,
        secretAccessKey,
        region,
        label,
      });
      toast.success("AWS credentials saved");
      setAccessKeyId("");
      setSecretAccessKey("");

      const { data } = await api.get(`/aws-credentials/workspace/${workspaceId}`);
      const list = data?.data ?? data ?? [];
      setSaved(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/aws-credentials/${id}`);
      setSaved((prev) => prev.filter((c) => c._id !== id));
      toast.success("Credentials removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            AWS Credentials
          </DialogTitle>
          <DialogDescription>
            Your credentials are encrypted at rest and used for AWS deployments (App Runner, Amplify, ECR).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {saved.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Saved
                </p>
                {saved.map((cred) => (
                  <div
                    key={cred._id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cred.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {cred.accessKeyId} &middot; {cred.region}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(cred._id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {saved.length > 0 ? "Update credentials" : "Add credentials"}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="aws-label" className="text-xs">Label</Label>
                <Input
                  id="aws-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="My AWS Account"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aws-key" className="text-xs">Access Key ID</Label>
                <Input
                  id="aws-key"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIA..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aws-secret" className="text-xs">Secret Access Key</Label>
                <Input
                  id="aws-secret"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aws-region" className="text-xs">Region</Label>
                <select
                  id="aws-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {AWS_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-2"
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Credentials"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
