"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  type ArrayPath,
  type FieldArray,
  type FieldArrayPath,
  type FieldValues,
  type UseFieldArrayReturn,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { Button } from "@/components/ui/button";

type Props<
  TFieldValues extends FieldValues,
  TName extends ArrayPath<TFieldValues>,
> = {
  form: UseFormReturn<TFieldValues>;
  name: TName;
  itemLabel?: (index: number) => string;
  newItem: () => FieldArray<TFieldValues, TName>;
  renderItem: (
    args: {
      index: number;
      remove: () => void;
    },
    form: UseFormReturn<TFieldValues>,
  ) => ReactNode;
  addLabel?: string;
  emptyState?: ReactNode;
};

/**
 * Generic RHF `useFieldArray` wrapper. Pass the parent form, the array path,
 * a factory for new items, and a render-prop for each row. Handles add/remove
 * UI; reorder is deferred to a future iteration.
 *
 * Why a render-prop and not a child component? The render-prop receives the
 * parent form so rows can call `register("items.${i}.title")` directly. A
 * sub-component would force a context plumbing that buys nothing here.
 */
export function RepeaterField<
  TFieldValues extends FieldValues,
  TName extends ArrayPath<TFieldValues>,
>({
  form,
  name,
  itemLabel,
  newItem,
  renderItem,
  addLabel = "Add item",
  emptyState,
}: Props<TFieldValues, TName>) {
  const arr = useFieldArray<TFieldValues, FieldArrayPath<TFieldValues>>({
    control: form.control,
    name: name as FieldArrayPath<TFieldValues>,
  }) as UseFieldArrayReturn<TFieldValues, TName>;
  const { fields, append, remove } = arr;

  return (
    <div className="space-y-2">
      {fields.length === 0 && emptyState}
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-1 rounded border p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {itemLabel ? itemLabel(i) : `Item ${i + 1}`}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
              aria-label={`Remove item ${i + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {renderItem({ index: i, remove: () => remove(i) }, form)}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => append(newItem())}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
