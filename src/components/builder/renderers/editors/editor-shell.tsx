"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
  isPending?: boolean;
};

export function EditorShell({
  title,
  onSubmit,
  onCancel,
  children,
  isPending = false,
}: Props) {
  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    // ESC cancels regardless of focus location inside the form.
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    // ⌘/Ctrl+Enter submits — even from inside a textarea, where Enter alone
    // inserts a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="flex h-full flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
          {title}
        </div>
        {isPending ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-ring/15 px-1.5 py-0.5 text-caption font-medium text-ring">
            <span className="size-1 rounded-full bg-ring" />
            Saving…
          </span>
        ) : null}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">{children}</div>
      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-caption text-muted-foreground">
          ⌘/Ctrl+Enter to apply · Esc to cancel
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </div>
      </div>
    </form>
  );
}
