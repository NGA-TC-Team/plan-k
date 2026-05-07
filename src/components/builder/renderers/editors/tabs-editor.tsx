"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  tabs: { label: string; id: string }[];
  defaultTabId: string;
};

export const TabsEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("tabs", vm);
  const { register, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "tabs" });
  return (
    <EditorShell
      title="Tabs"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Tabs">
        <div className="space-y-1">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-1">
              <TextField
                {...register(`tabs.${i}.label` as const)}
                placeholder="Label"
              />
              <TextField
                {...register(`tabs.${i}.id` as const)}
                placeholder="id"
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
            onClick={() => append({ label: "", id: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add tab
          </Button>
        </div>
      </Field>
      <Field label="Default tab id">
        <TextField {...register("defaultTabId")} />
      </Field>
    </EditorShell>
  );
};
