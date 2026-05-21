"use client";

import { useId } from "react";
import { Field, SwitchField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { SearchInputValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const SearchInputEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<SearchInputValues>("search-input", vm);
  const { register, handleSubmit } = form;
  const withButtonId = useId();
  return (
    <EditorShell
      title="Search input"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Placeholder">
        <TextField {...register("placeholder")} />
      </Field>
      <Field label="Default value">
        <TextField {...register("value")} />
      </Field>
      <Field label="Suggestions" hint="Comma-separated values">
        <TextField {...register("suggestions")} placeholder="option1,option2" />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("withButton")} id={withButtonId} />
        <label htmlFor={withButtonId}>Show search button</label>
      </div>
    </EditorShell>
  );
};
