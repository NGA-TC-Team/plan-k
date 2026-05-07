"use client";

import { cn } from "@/lib/utils";

export type EnumChipsOption<V extends string = string> = {
  label: string;
  value: V;
  hint?: string;
};

type Props<V extends string> = {
  value: V;
  onChange: (value: V) => void;
  options: EnumChipsOption<V>[];
  className?: string;
};

/**
 * Toggle group for enum fields. Use via RHF `Controller` so it can drive both
 * the form state and visible selection. Cheaper than shadcn ToggleGroup for
 * a flat list of 3–6 string options.
 */
export function EnumChips<V extends string>({
  value,
  onChange,
  options,
  className,
}: Props<V>) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
