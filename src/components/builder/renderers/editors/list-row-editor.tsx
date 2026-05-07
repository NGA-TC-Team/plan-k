"use client";

import { useId } from "react";
import { Field, SwitchField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  title: string;
  subtitle: string;
  leading: string;
  trailing: string;
  chevron: boolean;
};

export const ListRowEditor: BlockRenderer = ({ vm, handlers }) => {
  const chevId = useId();
  const { register, handleSubmit } = useBlockForm<Values>("list-row", vm);
  return (
    <EditorShell
      title="List row"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} />
      </Field>
      <Field label="Subtitle">
        <TextField {...register("subtitle")} />
      </Field>
      <Field label="Leading" hint="lucide icon name">
        <TextField {...register("leading")} />
      </Field>
      <Field label="Trailing" hint="text or icon name">
        <TextField {...register("trailing")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField id={chevId} {...register("chevron")} />
        <label htmlFor={chevId}>Show chevron</label>
      </div>
    </EditorShell>
  );
};
