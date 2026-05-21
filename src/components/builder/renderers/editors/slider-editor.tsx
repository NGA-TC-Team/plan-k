"use client";

import { useId } from "react";
import {
  Field,
  NumberField,
  RepeaterField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { SliderValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const SliderEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<SliderValues>("slider", vm);
  const { register, handleSubmit } = form;
  const showValueId = useId();
  return (
    <EditorShell
      title="Slider"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Range
      </h4>
      <Field label="Min">
        <NumberField {...register("min", { valueAsNumber: true })} />
      </Field>
      <Field label="Max">
        <NumberField {...register("max", { valueAsNumber: true })} />
      </Field>
      <Field label="Step">
        <NumberField {...register("step", { valueAsNumber: true })} min={0} />
      </Field>
      <Field label="Default value">
        <NumberField {...register("value", { valueAsNumber: true })} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("showValue")} id={showValueId} />
        <label htmlFor={showValueId}>Show value</label>
      </div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Marks
      </h4>
      <RepeaterField
        form={form}
        name="marks"
        addLabel="Add mark"
        newItem={() => ({ value: 0, label: "" })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <NumberField
              {...f.register(`marks.${index}.value` as const, {
                valueAsNumber: true,
              })}
              placeholder="Value"
            />
            <TextField
              {...f.register(`marks.${index}.label` as const)}
              placeholder="Label"
            />
          </div>
        )}
      />
    </EditorShell>
  );
};
