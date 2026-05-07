"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { FORM_DEFAULTS, FormSchema, type FormValues } from "./schemas";

const TYPES = ["text", "email", "password", "number", "tel", "url", "textarea"];

export const FormEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ...FORM_DEFAULTS,
      ...(vm.displayValue as Partial<FormValues>),
    },
  });
  useDraftSync(watch);
  const { fields, append, remove } = useFieldArray({ control, name: "fields" });
  return (
    <EditorShell
      title="Form"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-1 rounded border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Field {i + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input
              {...register(`fields.${i}.label` as const)}
              placeholder="Label"
            />
            <select
              {...register(`fields.${i}.type` as const)}
              className="w-full rounded border bg-background px-2 py-1 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                {...register(`fields.${i}.required` as const)}
              />
              Required
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ label: "", type: "text", required: false })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add field
        </Button>
      </div>
    </EditorShell>
  );
};
