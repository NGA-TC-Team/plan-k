"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { items: { label: string; href: string; icon: string }[] };

export const SidebarEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("sidebar", vm);
  const { register, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <EditorShell
      title="Sidebar"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Items">
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="space-y-1 rounded border p-2">
              <TextField
                {...register(`items.${i}.label` as const)}
                placeholder="Label"
              />
              <TextField
                {...register(`items.${i}.href` as const)}
                placeholder="/path"
              />
              <div className="flex gap-1">
                <TextField
                  {...register(`items.${i}.icon` as const)}
                  placeholder="lucide icon name"
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
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ label: "", href: "", icon: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add item
          </Button>
        </div>
      </Field>
    </EditorShell>
  );
};
