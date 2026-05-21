"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  NumberField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { ToastValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const VARIANT_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

export const ToastEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<ToastValues>("toast", vm);
  const { register, handleSubmit, control } = form;

  return (
    <EditorShell
      title="Toast"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
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
      <Field label="Title">
        <TextField {...register("title")} placeholder="Toast title" />
      </Field>
      <Field label="Body">
        <TextAreaField
          {...register("body")}
          placeholder="Optional description"
        />
      </Field>
      <Field label="Duration (ms)">
        <NumberField
          {...register("duration", { valueAsNumber: true })}
          min={0}
          placeholder="4000"
        />
      </Field>
      <Field label="Dismissible">
        <SwitchField {...register("dismissible")} />
      </Field>
    </EditorShell>
  );
};
