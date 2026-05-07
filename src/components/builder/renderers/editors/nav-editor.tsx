"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { NAV_DEFAULTS, NavSchema, type NavValues } from "./schemas";

export const NavEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control, watch } = useForm<NavValues>({
    resolver: zodResolver(NavSchema),
    defaultValues: {
      ...NAV_DEFAULTS,
      ...(vm.displayValue as Partial<NavValues>),
    },
  });
  useDraftSync(watch);
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <EditorShell
      title="Nav"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={field.id} className="space-y-1 rounded border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Item {i + 1}</span>
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
              {...register(`items.${i}.label` as const)}
              placeholder="Label"
            />
            <Input
              {...register(`items.${i}.href` as const)}
              placeholder="/path"
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ label: "", href: "" })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>
    </EditorShell>
  );
};
