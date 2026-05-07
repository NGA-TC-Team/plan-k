"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  MarkdownField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  variant: "info" | "warn" | "success" | "error";
  title: string;
  text: string;
};

const VARIANT_OPTIONS = [
  { label: "Info", value: "info" as const },
  { label: "Warn", value: "warn" as const },
  { label: "Success", value: "success" as const },
  { label: "Error", value: "error" as const },
];

export const CalloutEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "callout",
    vm,
  );
  return (
    <EditorShell
      title="Callout"
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
        <TextField {...register("title")} placeholder="Optional heading" />
      </Field>
      <Field label="Body">
        <MarkdownField rows={4} {...register("text")} />
      </Field>
    </EditorShell>
  );
};
