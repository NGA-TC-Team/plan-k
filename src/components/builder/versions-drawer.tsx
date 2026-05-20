"use client";

import { Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePlanVersionsQuery } from "@/data/plan-versions";
import { useVersionsUiStore } from "@/services/stores/versions-ui.store";
import { DiffPanel } from "./diff-panel";
import { TagVersionDialog } from "./tag-version-dialog";
import { VersionsListItem } from "./versions-list-item";

type VersionsDrawerProps = {
  planId: string;
};

export function VersionsDrawer({ planId }: VersionsDrawerProps) {
  const open = useVersionsUiStore((s) => s.open);
  const closeDrawer = useVersionsUiStore((s) => s.closeDrawer);
  const tagDialogOpen = useVersionsUiStore((s) => s.tagDialogOpen);
  const closeTagDialog = useVersionsUiStore((s) => s.closeTagDialog);
  const diffVersionId = useVersionsUiStore((s) => s.diffVersionId);
  const closeDiff = useVersionsUiStore((s) => s.closeDiff);

  // Local fallback for the "Tag current version" button in the header
  const [localTagOpen, setLocalTagOpen] = useState(false);

  const { data: versions, isLoading } = usePlanVersionsQuery(planId);

  const versionCount = versions?.length ?? 0;

  // The tag dialog can be opened from the header button (localTagOpen)
  // or from the command palette (tagDialogOpen from store).
  const isTagDialogOpen = tagDialogOpen || localTagOpen;
  const handleTagOpenChange = (next: boolean) => {
    if (!next) {
      closeTagDialog();
      setLocalTagOpen(false);
    } else {
      setLocalTagOpen(true);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDrawer();
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 sm:!max-w-[26rem]">
          <SheetTitle className="sr-only">Version history</SheetTitle>
          <SheetDescription className="sr-only">
            Tag the current plan state and view past versions.
          </SheetDescription>
          {/* Sub-view switch: DiffPanel replaces the list when diffVersionId is set */}
          {diffVersionId !== null ? (
            <DiffPanel
              planId={planId}
              versionId={diffVersionId}
              onBack={closeDiff}
            />
          ) : (
            <>
              <SheetHeader className="flex-row items-center justify-between border-b pb-3">
                <span className="font-medium text-sm">Version history</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalTagOpen(true)}
                  className="gap-1.5"
                >
                  <Tag className="size-3.5" />
                  Tag current version
                </Button>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : versionCount === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No versions yet. Tag the current state to start a history.
                  </div>
                ) : (
                  <ul className="divide-y">
                    {versions?.map((version) => (
                      <li key={version.id}>
                        <VersionsListItem planId={planId} version={version} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <TagVersionDialog
        planId={planId}
        currentCount={versionCount}
        open={isTagDialogOpen}
        onOpenChange={handleTagOpenChange}
      />
    </>
  );
}
