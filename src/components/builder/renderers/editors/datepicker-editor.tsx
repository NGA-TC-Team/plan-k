"use client";

import { useId } from "react";
import { Field, SwitchField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { DatepickerValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const DatepickerEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<DatepickerValues>("datepicker", vm);
  const { register, handleSubmit } = form;
  const rangeId = useId();
  return (
    <EditorShell
      title="Date picker"
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
      <Field label="Default value" hint="YYYY-MM-DD">
        <TextField {...register("value")} placeholder="2026-01-01" />
      </Field>
      <Field label="Min date" hint="YYYY-MM-DD">
        <TextField {...register("min")} placeholder="2000-01-01" />
      </Field>
      <Field label="Max date" hint="YYYY-MM-DD">
        <TextField {...register("max")} placeholder="2099-12-31" />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("range")} id={rangeId} />
        <label htmlFor={rangeId}>Date range picker</label>
      </div>
    </EditorShell>
  );
};
