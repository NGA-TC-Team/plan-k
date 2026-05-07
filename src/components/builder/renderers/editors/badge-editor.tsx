"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Variant = "default" | "primary" | "success" | "warn" | "error" | "outline";
type Values = { label: string; variant: Variant };

const VARIANT = [
  { label: "Default", value: "default" as const },
  { label: "Primary", value: "primary" as const },
  { label: "Success", value: "success" as const },
  { label: "Warn", value: "warn" as const },
  { label: "Error", value: "error" as const },
  { label: "Outline", value: "outline" as const },
];

export const BadgeEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>("badge", vm);
  return (
    <EditorShell
      title="Badge"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
