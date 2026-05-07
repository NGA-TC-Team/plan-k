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
  title: string;
  body: string;
  height: "auto" | "half" | "full";
  primaryCta: string;
};

const HEIGHT = [
  { label: "Auto", value: "auto" as const },
  { label: "Half", value: "half" as const },
  { label: "Full", value: "full" as const },
];

export const SheetEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>("sheet", vm);
  return (
    <EditorShell
      title="Sheet"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} />
      </Field>
      <Field label="Body">
        <MarkdownField rows={4} {...register("body")} />
      </Field>
      <Field label="Height">
        <Controller
          control={control}
          name="height"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={HEIGHT}
            />
          )}
        />
      </Field>
      <Field label="Primary CTA">
        <TextField {...register("primaryCta")} />
      </Field>
    </EditorShell>
  );
};
