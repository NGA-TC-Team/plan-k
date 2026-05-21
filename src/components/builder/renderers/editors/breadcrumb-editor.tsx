"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, RepeaterField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { BreadcrumbValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SEPARATOR_OPTIONS = [
  { value: "/", label: "/" },
  { value: ">", label: ">" },
  { value: "·", label: "·" },
];

export const BreadcrumbEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<BreadcrumbValues>("breadcrumb", vm);
  const { handleSubmit, control } = form;

  return (
    <EditorShell
      title="Breadcrumb"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Separator">
        <Controller
          control={control}
          name="separator"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SEPARATOR_OPTIONS}
            />
          )}
        />
      </Field>

      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Items
      </h4>
      <RepeaterField
        form={form}
        name="items"
        addLabel="Add item"
        newItem={() => ({ label: "", href: "" })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <input
              {...f.register(`items.${index}.label` as const)}
              placeholder="Label"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <input
              {...f.register(`items.${index}.href` as const)}
              placeholder="href (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        )}
      />
    </EditorShell>
  );
};
