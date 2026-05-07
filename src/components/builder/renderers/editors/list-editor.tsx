"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { SwitchField, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { LIST_DEFAULTS, ListSchema, type ListValues } from "./schemas";

export const ListEditor: BlockRenderer = ({ vm, handlers }) => {
  const orderedId = useId();
  const { register, handleSubmit, control, watch } = useForm<ListValues>({
    resolver: zodResolver(ListSchema),
    defaultValues: {
      ...LIST_DEFAULTS,
      ...(vm.displayValue as Partial<ListValues>),
    },
  });
  useDraftSync(watch);
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items" as never,
  });
  return (
    <EditorShell
      title="List"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <SwitchField id={orderedId} {...register("ordered")} />
        <label htmlFor={orderedId}>Ordered</label>
      </div>
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-1">
            <TextField
              {...register(`items.${i}` as const)}
              placeholder={`Item ${i + 1}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append("")}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>
    </EditorShell>
  );
};
