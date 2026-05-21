"use client";

import { useState } from "react";
import {
  resolveSpacingPx,
  SPACING_PRESETS,
  type SpacingField,
  type SpacingPreset,
} from "@/builder/spacing";
import { cn } from "@/lib/utils";

type Props = {
  /** Current stored value. undefined = "inherit from default" */
  value: SpacingField | undefined;
  /** Called with the parsed value (or undefined to clear / inherit default). */
  onChange: (next: SpacingField | undefined) => void;
  /** Placeholder shown when value is undefined; should be the resolved default px. */
  placeholderPx?: number;
  /** Label for aria-label */
  label: string;
  className?: string;
};

const TOKEN_SET = new Set<string>(SPACING_PRESETS);

/**
 * Single-cell spacing input that accepts:
 *   - A preset token keyword: "none" | "sm" | "md" | "lg" | "xl"
 *   - A non-negative integer (0–512)
 *   - Empty string → clears the value (reverts to default/inherit)
 *
 * Parse is deferred to blur / Enter; stray input (fractions, negatives, >512,
 * unknown tokens) is silently discarded and the field reverts to the last
 * committed value.
 */
export function NumberOrTokenField({
  value,
  onChange,
  placeholderPx,
  label,
  className,
}: Props) {
  // Local draft while the user is typing
  const [draft, setDraft] = useState<string | null>(null);

  // Display text: during typing → draft, otherwise → stored value display
  const displayValue =
    draft !== null
      ? draft
      : value === undefined
        ? ""
        : typeof value === "number"
          ? String(value)
          : value;

  function commit(raw: string) {
    setDraft(null);
    const trimmed = raw.trim();

    // Empty → clear (inherit default)
    if (trimmed === "") {
      onChange(undefined);
      return;
    }

    // Token keyword
    if (TOKEN_SET.has(trimmed)) {
      onChange(trimmed as SpacingPreset);
      return;
    }

    // Integer px value
    const n = Number(trimmed);
    if (Number.isInteger(n) && n >= 0 && n <= 512) {
      onChange(n);
      return;
    }

    // Invalid input — discard, revert to previous value (draft cleared above)
  }

  const resolvedPx =
    value !== undefined ? resolveSpacingPx(value) : placeholderPx;

  return (
    <input
      type="text"
      aria-label={label}
      value={displayValue}
      placeholder={resolvedPx !== undefined ? String(resolvedPx) : "—"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit((e.target as HTMLInputElement).value);
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          // Revert to committed state without saving
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "w-full min-w-0 rounded-sm border border-input bg-background px-1.5 py-0.5",
        "text-center text-[11px] text-foreground",
        "placeholder:text-muted-foreground/50",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "transition-colors",
        className,
      )}
    />
  );
}
