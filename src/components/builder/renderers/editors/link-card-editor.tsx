"use client";

import { Field, TextAreaField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  url: string;
  title: string;
  description: string;
  faviconUrl: string;
};

export const LinkCardEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("link-card", vm);
  return (
    <EditorShell
      title="Link card"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="URL">
        <TextField {...register("url")} placeholder="https://…" />
      </Field>
      <Field label="Title">
        <TextField {...register("title")} />
      </Field>
      <Field label="Description">
        <TextAreaField rows={3} {...register("description")} />
      </Field>
      <Field label="Favicon URL" hint="Optional">
        <TextField
          {...register("faviconUrl")}
          placeholder="https://…/favicon.ico"
        />
      </Field>
    </EditorShell>
  );
};
