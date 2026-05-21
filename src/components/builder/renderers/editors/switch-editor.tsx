"use client";

import { useId } from "react";
import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { SwitchValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SIZE = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

export const SwitchEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<SwitchValues>("switch", vm);
  const { register, handleSubmit, control } = form;
  const checkedId = useId();
  return (
    <EditorShell
      title="Switch"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Size">
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SIZE}
            />
          )}
        />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("checked")} id={checkedId} />
        <label htmlFor={checkedId}>Checked</label>
      </div>
    </EditorShell>
  );
};
