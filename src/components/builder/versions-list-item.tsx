"use client";

import { formatDistanceToNow } from "date-fns";
import { FileImage, FileText, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlanVersionListItem } from "@/data/plan-versions";
import { useDeletePlanVersionMutation } from "@/data/plan-versions";
import { usePrintOptionsStore } from "@/services/stores/print-options.store";
import { useVersionsUiStore } from "@/services/stores/versions-ui.store";
import { exportPlanWithToast } from "@/services/third-party-facade/export";

type VersionsListItemProps = {
  planId: string;
  version: PlanVersionListItem;
};

export function VersionsListItem({ planId, version }: VersionsListItemProps) {
  const { mutateAsync: deleteVersion, isPending: isDeleting } =
    useDeletePlanVersionMutation(planId);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const relativeTime = formatDistanceToNow(new Date(version.createdAt), {
    addSuffix: true,
  });

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteVersion(version.id);
    } catch {
      setDeleteError("Failed to delete. Please try again.");
    }
  };

  const triggerVersionExport = (kind: "pdf" | "png") => {
    if (typeof window === "undefined") return;
    const opts = usePrintOptionsStore.getState();
    // Cover is forced true server-side for version exports (design spec D7).
    // We still pass cover from the store; the print page overrides it.
    exportPlanWithToast({
      planId,
      kind,
      versionId: version.id,
      cover: opts.cover,
      toc: opts.toc,
      pageNumbers: opts.pageNumbers,
      footerText: opts.footerText,
    });
  };

  return (
    <div className="flex items-start gap-2 px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{version.label}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {relativeTime}
          </span>
        </div>
        {version.note ? (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {version.note}
          </p>
        ) : null}
        {deleteError ? (
          <p className="text-xs text-destructive mt-1">{deleteError}</p>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Version actions"
              disabled={isDeleting}
              className="size-7 shrink-0"
            />
          }
        >
          <MoreVertical className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => triggerVersionExport("pdf")}>
            <FileText className="size-3.5" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerVersionExport("png")}>
            <FileImage className="size-3.5" />
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => useVersionsUiStore.getState().openDiff(version.id)}
          >
            Compare with current
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
