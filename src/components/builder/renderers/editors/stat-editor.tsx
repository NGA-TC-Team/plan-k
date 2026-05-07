"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  label: string;
  value: string;
  change: string;
  changeKind: "up" | "down" | "none";
};

const KIND = [
  { label: "↑ Up", value: "up" as const },
  { label: "→ None", value: "none" as const },
  { label: "↓ Down", value: "down" as const },
];

export const StatEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>("stat", vm);
  return (
    <EditorShell
      title="Stat"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Value">
        <TextField {...register("value")} />
      </Field>
      <Field label="Change">
        <TextField {...register("change")} placeholder="+12.4%" />
      </Field>
      <Field label="Change kind">
        <Controller
          control={control}
          name="changeKind"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={KIND}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
