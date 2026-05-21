"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  RepeaterField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { RadioGroupValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const ORIENTATION = [
  { label: "Column", value: "col" as const },
  { label: "Row", value: "row" as const },
];

export const RadioGroupEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<RadioGroupValues>("radio-group", vm);
  const { register, handleSubmit, control } = form;
  return (
    <EditorShell
      title="Radio group"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Default value">
        <TextField {...register("value")} placeholder="option value" />
      </Field>
      <Field label="Orientation">
        <Controller
          control={control}
          name="orientation"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={ORIENTATION}
            />
          )}
        />
      </Field>
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
