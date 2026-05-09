"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePlanVersionMutation } from "@/data/plan-versions";

type TagVersionDialogProps = {
  planId: string;
  currentCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagVersionDialog({
  planId,
  currentCount,
  open,
  onOpenChange,
}: TagVersionDialogProps) {
  const defaultLabel = `v${currentCount + 1}`;
  const [label, setLabel] = useState(defaultLabel);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreatePlanVersionMutation(planId);

  // Reset form fields whenever dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLabel(`v${currentCount + 1}`);
      setNote("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Label is required.");
      return;
    }
    try {
      await mutateAsync({
        label: trimmedLabel,
        note: note.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      setError("Failed to tag version. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Tag current version</DialogTitle>
            <DialogDescription>
              Save a snapshot of the current plan state with a label.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="version-label">Label</Label>
            <Input
              id="version-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError(null);
              }}
              placeholder={defaultLabel}
              required
              autoFocus
              maxLength={80}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="version-note">
              Note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="version-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed in this version?"
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || !label.trim()}>
              {isPending ? "Tagging…" : "Tag version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
