"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: Props) {
  return (
    <div className={cn("block space-y-1 text-xs", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block font-medium text-foreground">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
