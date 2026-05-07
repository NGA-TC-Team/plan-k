"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { SwitchField, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { items: { text: string; checked: boolean }[] };

export const ChecklistEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("checklist", vm);
  const { register, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <EditorShell
      title="Checklist"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="space-y-1">
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <SwitchField {...register(`items.${i}.checked` as const)} />
            <TextField
              {...register(`items.${i}.text` as const)}
              placeholder={`Item ${i + 1}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ text: "", checked: false })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>
    </EditorShell>
  );
};
