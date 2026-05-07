"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
};

export function EditorShell({ title, onSubmit, onCancel, children }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">{children}</div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  );
}
