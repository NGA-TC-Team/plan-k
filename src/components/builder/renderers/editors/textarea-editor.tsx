"use client";

import { useId } from "react";
import {
  Field,
  NumberField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { TextareaValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const TextareaEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<TextareaValues>("textarea", vm);
  const { register, handleSubmit } = form;
  const requiredId = useId();
  return (
    <EditorShell
      title="Textarea"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Placeholder">
        <TextField {...register("placeholder")} />
      </Field>
      <Field label="Rows">
        <NumberField
          {...register("rows", { valueAsNumber: true })}
          min={1}
          max={20}
        />
      </Field>
      <Field label="Max length" hint="0 = unlimited">
        <NumberField
          {...register("maxLength", { valueAsNumber: true })}
          min={0}
        />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("required")} id={requiredId} />
        <label htmlFor={requiredId}>Required</label>
      </div>
    </EditorShell>
  );
};
