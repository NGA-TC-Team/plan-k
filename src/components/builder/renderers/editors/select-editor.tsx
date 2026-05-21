"use client";

import { useId } from "react";
import {
  Field,
  RepeaterField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { SelectValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const SelectEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<SelectValues>("select", vm);
  const { register, handleSubmit } = form;
  const requiredId = useId();
  return (
    <EditorShell
      title="Select"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Placeholder">
        <TextField {...register("placeholder")} />
      </Field>
      <Field label="Default value">
        <TextField {...register("value")} placeholder="option value" />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("required")} id={requiredId} />
        <label htmlFor={requiredId}>Required</label>
      </div>
      <Field label="Options">
        <RepeaterField
          form={form}
          name="options"
          addLabel="Add option"
          newItem={() => ({ value: "", label: "" })}
          renderItem={({ index }, f) => (
            <div className="space-y-1">
              <TextField
                {...f.register(`options.${index}.label` as const)}
                placeholder="Label"
              />
              <TextField
                {...f.register(`options.${index}.value` as const)}
                placeholder="Value"
              />
            </div>
          )}
        />
      </Field>
    </EditorShell>
  );
};
