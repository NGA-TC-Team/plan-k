"use client";

import { Field, NumberField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { StepperValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const StepperEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<StepperValues>("stepper", vm);
  const { register, handleSubmit } = form;
  return (
    <EditorShell
      title="Stepper"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Min">
        <NumberField {...register("min", { valueAsNumber: true })} />
      </Field>
      <Field label="Max">
        <NumberField {...register("max", { valueAsNumber: true })} />
      </Field>
      <Field label="Step">
        <NumberField {...register("step", { valueAsNumber: true })} min={1} />
      </Field>
      <Field label="Default value">
        <NumberField {...register("value", { valueAsNumber: true })} />
      </Field>
    </EditorShell>
  );
};
