"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
import { plansApi } from "@/data/plans/api";
import type { PlanLoadError } from "@/data/plans/types";
import { queryKeys } from "@/data/query-keys";

type Props = {
  detail: PlanLoadError;
};

export function PlanRecoveryDialog({ detail }: Props) {
  const queryClient = useQueryClient();
  const [exported, setExported] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleExport = () => {
    // Direct browser navigation streams the JSON dump as a download. The
    // /raw endpoint bypasses migration so the dump reflects the on-disk
    // state regardless of the schemaVersion mismatch.
    const url = plansApi.rawExportUrl(detail.planId);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.planId}-v${detail.fromVersion}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setExported(true);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await plansApi.reset(detail.planId);
      toast.success("Plan reset. Reseeding…");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.plans.detail(detail.planId),
      });
    } catch (err) {
      toast.error(
        `Reset failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      setResetting(false);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Plan needs recovery</AlertDialogTitle>
          <AlertDialogDescription>
            This plan was saved as v{detail.fromVersion} and the running build
            expects v{detail.toVersion}. No automatic migration is available.
            Export a JSON dump of the on-disk state, then reset the plan to
            continue. Reset deletes the snapshot and intent log; the export is
            your only copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            {exported ? "Re-export" : "Export JSON"}
          </button>
          <AlertDialogAction
            disabled={!exported || resetting}
            onClick={handleReset}
          >
            {resetting ? "Resetting…" : "Reset plan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
