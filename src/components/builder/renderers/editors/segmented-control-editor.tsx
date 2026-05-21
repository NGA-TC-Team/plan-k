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
import type { SegmentedControlValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SIZE = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

export const SegmentedControlEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<SegmentedControlValues>("segmented-control", vm);
  const { register, handleSubmit, control } = form;
  return (
    <EditorShell
      title="Segmented control"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Size">
        <Controller
          control={control}
          name="size"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SIZE}
            />
          )}
        />
      </Field>
      <Field label="Selected value">
        <TextField {...register("value")} placeholder="option value" />
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
