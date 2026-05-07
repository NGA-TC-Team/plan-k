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
  primaryCta: string;
  secondaryCta: string;
  size: "sm" | "md" | "lg";
};

const SIZE_OPTIONS = [
  { label: "Small", value: "sm" as const },
  { label: "Medium", value: "md" as const },
  { label: "Large", value: "lg" as const },
];

export const ModalEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>("modal", vm);
  return (
    <EditorShell
      title="Modal"
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
      <Field label="Primary CTA">
        <TextField {...register("primaryCta")} />
      </Field>
      <Field label="Secondary CTA">
        <TextField {...register("secondaryCta")} />
      </Field>
      <Field label="Size">
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SIZE_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
