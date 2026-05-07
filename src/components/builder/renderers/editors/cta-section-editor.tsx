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
  cta: string;
  ctaHref: string;
  variant: "primary" | "muted";
};

const VARIANT = [
  { label: "Primary", value: "primary" as const },
  { label: "Muted", value: "muted" as const },
];

export const CtaSectionEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "cta-section",
    vm,
  );
  return (
    <EditorShell
      title="CTA section"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} />
      </Field>
      <Field label="Body">
        <MarkdownField rows={3} {...register("body")} />
      </Field>
      <Field label="CTA label">
        <TextField {...register("cta")} />
      </Field>
      <Field label="CTA href">
        <TextField {...register("ctaHref")} placeholder="/path or https://…" />
      </Field>
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
