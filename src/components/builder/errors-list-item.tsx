"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { AppError, ErrorSeverity } from "@/services/stores";

// ---------------------------------------------------------------------------
// Relative-time formatter — avoids a date-fns dependency.
// Returns strings like "just now", "3s ago", "2m ago", "1h ago", "3d ago".
// Handles negative deltas (clock skew) by returning "just now".
// ---------------------------------------------------------------------------
function formatRelative(at: number): string {
  const diffMs = Date.now() - at;
  if (diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

// ---------------------------------------------------------------------------
// Severity icon + colour class
// ---------------------------------------------------------------------------

function SeverityIcon({ severity }: { severity: ErrorSeverity }) {
  if (severity === "error") {
    return <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />;
  }
  if (severity === "warn") {
    return (
      <AlertTriangle className="size-4 shrink-0 text-yellow-500" aria-hidden />
    );
  }
  return <Info className="size-4 shrink-0 text-blue-500" aria-hidden />;
}

const SEVERITY_BADGE_CLASS: Record<ErrorSeverity, string> = {
  error: "bg-destructive/10 text-destructive",
  warn: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

// ---------------------------------------------------------------------------
// Safe JSON stringify — guards against circular references in context values.
// Falls back to String() coercion if JSON.stringify throws.
// ---------------------------------------------------------------------------
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ErrorsListItemProps = {
  error: AppError;
};

export function ErrorsListItem({ error }: ErrorsListItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="flex flex-col gap-0">
      <button
        type="button"
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <SeverityIcon severity={error.severity} />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {error.message}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded px-1 py-px text-caption font-medium ${SEVERITY_BADGE_CLASS[error.severity]}`}
            >
              {error.severity}
            </span>
            <span className="text-caption text-muted-foreground">
              {error.source}
            </span>
            <span className="text-caption text-muted-foreground">
              · {formatRelative(error.at)}
            </span>
          </div>
        </div>

        <span className="shrink-0 text-muted-foreground pt-0.5">
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      {expanded ? (
        <div className="mx-4 mb-3 space-y-2">
          {error.detail ? (
            <pre className="max-h-48 overflow-x-auto rounded-md bg-muted p-2 text-xs leading-relaxed">
              {error.detail}
            </pre>
          ) : null}
          {error.context ? (
            <pre className="max-h-48 overflow-x-auto rounded-md bg-muted p-2 text-xs leading-relaxed">
              {safeStringify(error.context)}
            </pre>
          ) : null}
          {!error.detail && !error.context ? (
            <p className="text-xs text-muted-foreground italic">
              No additional detail.
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
