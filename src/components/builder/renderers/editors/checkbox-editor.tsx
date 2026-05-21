"use client";

import { useId } from "react";
import { Field, SwitchField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { CheckboxValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const CheckboxEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<CheckboxValues>("checkbox", vm);
  const { register, handleSubmit } = form;
  const checkedId = useId();
  const disabledId = useId();
  return (
    <EditorShell
      title="Checkbox"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("checked")} id={checkedId} />
        <label htmlFor={checkedId}>Checked</label>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("disabled")} id={disabledId} />
        <label htmlFor={disabledId}>Disabled</label>
      </div>
    </EditorShell>
  );
};
