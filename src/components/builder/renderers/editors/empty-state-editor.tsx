"use client";

import { Field, MarkdownField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  title: string;
  body: string;
  icon: string;
  ctaLabel: string;
  ctaHref: string;
};

export const EmptyStateEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("empty-state", vm);
  return (
    <EditorShell
      title="Empty state"
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
      <Field label="Icon" hint="lucide icon name">
        <TextField {...register("icon")} />
      </Field>
      <Field label="CTA label">
        <TextField {...register("ctaLabel")} />
      </Field>
      <Field label="CTA href">
        <TextField {...register("ctaHref")} />
      </Field>
    </EditorShell>
  );
};
