"use client";

import { ChevronDownIcon } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

type Props = Omit<React.ComponentProps<"select">, "children"> & {
  options: SelectOption[];
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, Props>(
  function SelectField({ className, options, placeholder, ...props }, ref) {
    return (
      <div
        className={cn(
          "relative w-full has-[select:disabled]:opacity-50",
          className,
        )}
      >
        <select
          ref={ref}
          className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive dark:bg-input/30"
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  },
);
