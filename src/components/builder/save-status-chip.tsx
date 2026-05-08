"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import { useSaveStatusStore } from "@/services/stores";

// Refresh the "Saved 3s ago" string while idle so it doesn't go stale.
const TICK_MS = 15_000;

export function SaveStatusChip() {
  const status = useSaveStatusStore((s) => s.status);
  const pending = useSaveStatusStore((s) => s.pending);
  const lastSavedAt = useSaveStatusStore((s) => s.lastSavedAt);
  const lastError = useSaveStatusStore((s) => s.lastError);
  const [, force] = useState(0);

  useEffect(() => {
    if (status !== "saved") return;
    const id = setInterval(() => force((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  if (status === "idle") {
    return (
      <span className="text-xs text-muted-foreground" title="No changes yet">
        준비됨
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="size-3 animate-spin" />
        저장 중{pending > 1 ? ` (${pending})` : ""}
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-destructive",
        )}
        title={lastError ?? "저장 실패"}
        aria-live="assertive"
      >
        <AlertCircle className="size-3" />
        저장 실패
      </span>
    );
  }

  // saved
  const ago = lastSavedAt ? formatRelativeTime(lastSavedAt) : "방금";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <Check className="size-3 text-success" />
      저장됨 · {ago}
    </span>
  );
}
