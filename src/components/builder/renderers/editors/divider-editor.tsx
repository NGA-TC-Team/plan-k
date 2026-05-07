"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  orientation: "horizontal" | "vertical";
  spacing: "sm" | "md" | "lg";
};

const ORIENTATION = [
  { label: "Horizontal", value: "horizontal" as const },
  { label: "Vertical", value: "vertical" as const },
];

const SPACING = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

export const DividerEditor: BlockRenderer = ({ vm, handlers }) => {
  const { handleSubmit, control } = useBlockForm<Values>("divider", vm);
  return (
    <EditorShell
      title="Divider"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Orientation">
        <Controller
          control={control}
          name="orientation"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={ORIENTATION}
            />
          )}
        />
      </Field>
      <Field label="Spacing">
        <Controller
          control={control}
          name="spacing"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SPACING}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
