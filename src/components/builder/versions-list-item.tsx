"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlanVersionListItem } from "@/data/plan-versions";
import { useDeletePlanVersionMutation } from "@/data/plan-versions";
import { useVersionsUiStore } from "@/services/stores/versions-ui.store";

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
