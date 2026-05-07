"use client";

import { Field, TextAreaField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { term: string; definition: string };

export const DefinitionEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("definition", vm);
  return (
    <EditorShell
      title="Definition"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Term">
        <TextField {...register("term")} />
      </Field>
      <Field label="Definition">
        <TextAreaField rows={4} {...register("definition")} />
      </Field>
    </EditorShell>
  );
};
