"use client";

import { useId } from "react";
import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  NumberField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { ProgressBarValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const VARIANT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
];

export const ProgressBarEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<ProgressBarValues>("progress-bar", vm);
  const { register, handleSubmit, control } = form;
  const showPercentId = useId();
  const stripedId = useId();
  return (
    <EditorShell
      title="Progress Bar"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} placeholder="Loading…" />
      </Field>
      <Field label="Value">
        <NumberField {...register("value", { valueAsNumber: true })} />
      </Field>
      <Field label="Max">
        <NumberField {...register("max", { valueAsNumber: true })} />
      </Field>
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT_OPTIONS}
            />
          )}
        />
      </Field>
      <div className="flex items-center gap-4">
        <label
          htmlFor={showPercentId}
          className="flex items-center gap-2 text-xs"
        >
          <SwitchField {...register("showPercent")} id={showPercentId} />
          Show %
        </label>
        <label htmlFor={stripedId} className="flex items-center gap-2 text-xs">
          <SwitchField {...register("striped")} id={stripedId} />
          Striped
        </label>
      </div>
    </EditorShell>
  );
};
