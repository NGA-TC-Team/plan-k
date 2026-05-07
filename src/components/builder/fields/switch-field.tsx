"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "type">;

/**
 * Register-friendly checkbox styled as a compact toggle. Use shadcn Switch via
 * <Controller> when you need the visual switch — this primitive prefers the
 * native checkbox so RHF `register` works directly without a Controller.
 */
export const SwitchField = forwardRef<HTMLInputElement, Props>(
  function SwitchField({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      />
    );
  },
);
