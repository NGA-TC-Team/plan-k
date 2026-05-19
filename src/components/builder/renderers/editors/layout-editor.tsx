"use client";

import { Controller, useWatch } from "react-hook-form";
import { EnumChips, Field, NumberField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { LayoutValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const MODE_OPTIONS = [
  { label: "VStack", value: "vstack" as const },
  { label: "HStack", value: "hstack" as const },
  { label: "Grid", value: "grid" as const },
];

const GAP_OPTIONS = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

export const LayoutEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<LayoutValues>("layout", vm);
  const { handleSubmit, control, register } = form;

  // Watch mode to conditionally show cols field.
  const mode = useWatch({ control, name: "mode" });

  return (
    <EditorShell
      title="Layout"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Mode">
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={MODE_OPTIONS}
            />
          )}
        />
      </Field>

      {mode === "grid" ? (
        <Field label="Columns (1–6)">
          <NumberField
            {...register("cols", { valueAsNumber: true })}
            min={1}
            max={6}
            step={1}
            placeholder="2"
          />
        </Field>
      ) : null}

      <Field label="Gap">
        <Controller
          control={control}
          name="gap"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={GAP_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
