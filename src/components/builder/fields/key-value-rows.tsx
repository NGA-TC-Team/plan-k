"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  type ArrayPath,
  type FieldValues,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "./text-field";

type Props<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  name: ArrayPath<TFieldValues>;
  keyLabel?: string;
  valueLabel?: string;
};

/**
 * Repeater for `[{ key, value }]` shaped arrays. Separate from RepeaterField
 * because the (key,value) two-column layout is common enough to warrant a
 * single-purpose primitive that doesn't need a render-prop.
 */
export function KeyValueRows<TFieldValues extends FieldValues>({
  form,
  name,
  keyLabel = "Key",
  valueLabel = "Value",
}: Props<TFieldValues>) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });
  return (
    <div className="space-y-1">
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-center gap-1">
          <TextField
            placeholder={keyLabel}
            // biome-ignore lint/suspicious/noExplicitAny: dynamic RHF path requires `as any`.
            {...form.register(`${name}.${i}.key` as any)}
          />
          <TextField
            placeholder={valueLabel}
            // biome-ignore lint/suspicious/noExplicitAny: dynamic RHF path requires `as any`.
            {...form.register(`${name}.${i}.value` as any)}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => remove(i)}
            aria-label="Remove row"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        // biome-ignore lint/suspicious/noExplicitAny: dynamic RHF append payload.
        onClick={() => append({ key: "", value: "" } as any)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add row
      </Button>
    </div>
  );
}
