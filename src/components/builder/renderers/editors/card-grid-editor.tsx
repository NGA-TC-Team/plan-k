"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  Field,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import {
  CARD_GRID_DEFAULTS,
  CardGridSchema,
  type CardGridValues,
} from "./schemas";

export const CardGridEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CardGridValues>({
    resolver: zodResolver(CardGridSchema),
    defaultValues: {
      ...CARD_GRID_DEFAULTS,
      ...(vm.displayValue as Partial<CardGridValues>),
    },
  });
  useDraftSync(watch);
  const { fields, append, remove } = useFieldArray({ control, name: "cards" });
  return (
    <EditorShell
      title="Card grid"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Columns" hint="1–4" error={errors.columns?.message}>
        <NumberField
          min={1}
          max={4}
          {...register("columns", { valueAsNumber: true })}
        />
      </Field>
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-1 rounded border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Card {i + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <TextField
              {...register(`cards.${i}.title` as const)}
              placeholder="Card title"
            />
            <TextAreaField
              rows={2}
              {...register(`cards.${i}.desc` as const)}
              placeholder="Description"
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ title: "", desc: "" })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add card
        </Button>
      </div>
    </EditorShell>
  );
};
