"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useErrorsStore, useErrorsUiStore } from "@/services/stores";
import { ErrorsListItem } from "./errors-list-item";

export function ErrorsDrawer() {
  const open = useErrorsUiStore((s) => s.open);
  const closeDrawer = useErrorsUiStore((s) => s.closeDrawer);
  const buffer = useErrorsStore((s) => s.buffer);

  const isEmpty = buffer.length === 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDrawer();
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:!max-w-[26rem]">
        <SheetTitle className="sr-only">Recent errors</SheetTitle>
        <SheetDescription className="sr-only">
          List of the last 20 application errors. Expand each row to see stack
          trace and context.
        </SheetDescription>

        <SheetHeader className="flex-row items-center justify-between border-b pb-3">
          <span className="font-medium text-sm">Recent errors</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isEmpty}
            onClick={() => useErrorsStore.getState().clear()}
          >
            Clear all
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No errors yet — anything that goes wrong here will show up in this
              list.
            </p>
          ) : (
            <ul className="divide-y">
              {buffer.map((error) => (
                <ErrorsListItem key={error.id} error={error} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
