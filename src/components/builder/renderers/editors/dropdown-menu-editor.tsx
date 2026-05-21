"use client";

import { Controller } from "react-hook-form";
import {
  Field,
  RepeaterField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { DropdownMenuValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const DropdownMenuEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<DropdownMenuValues>("dropdown-menu", vm);
  const { register, handleSubmit } = form;

  return (
    <EditorShell
      title="Dropdown Menu"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Trigger label">
        <TextField {...register("trigger")} placeholder="Options" />
      </Field>

      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Items
      </h4>
      <RepeaterField
        form={form}
        name="items"
        addLabel="Add item"
        newItem={() => ({ label: "", icon: "", action: "", divider: false })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <input
              {...f.register(`items.${index}.label` as const)}
              placeholder="Label"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <input
              {...f.register(`items.${index}.icon` as const)}
              placeholder="Icon name (e.g. Settings2)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <input
              {...f.register(`items.${index}.action` as const)}
              placeholder="Action hint (e.g. edit, delete)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Controller
                control={f.control}
                name={`items.${index}.divider` as const}
                render={({ field }) => (
                  <SwitchField
                    id={`items-${index}-divider`}
                    checked={field.value}
                    onChange={(e) =>
                      field.onChange((e.target as HTMLInputElement).checked)
                    }
                  />
                )}
              />
              <label htmlFor={`items-${index}-divider`}>Divider above</label>
            </div>
          </div>
        )}
      />
    </EditorShell>
  );
};
