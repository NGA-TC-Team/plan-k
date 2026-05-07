"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import {
  CARD_GRID_DEFAULTS,
  CardGridSchema,
  type CardGridValues,
} from "./schemas";

export const CardGridEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control, watch } = useForm<CardGridValues>({
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
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Columns (1–4)</span>
        <Input
          type="number"
          min={1}
          max={4}
          {...register("columns", { valueAsNumber: true })}
        />
      </div>
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
            <Input
              {...register(`cards.${i}.title` as const)}
              placeholder="Card title"
            />
            <Textarea
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
