"use client";

import { Field, TextAreaField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { text: string; cite: string };

export const BlockquoteEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("blockquote", vm);
  return (
    <EditorShell
      title="Blockquote"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Quote">
        <TextAreaField rows={4} {...register("text")} />
      </Field>
      <Field label="Citation">
        <TextField {...register("cite")} placeholder="— Author, Source" />
      </Field>
    </EditorShell>
  );
};
