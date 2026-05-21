"use client";

import { useId } from "react";
import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  RepeaterField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { ChartValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const KIND_OPTIONS = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "area", label: "Area" },
  { value: "donut", label: "Donut" },
];

export const ChartEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<ChartValues>("chart", vm);
  const { register, handleSubmit, control } = form;
  const legendId = useId();
  const gridId = useId();
  return (
    <EditorShell
      title="Chart"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Type">
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={KIND_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Title">
        <TextField {...register("title")} placeholder="Chart title" />
      </Field>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Series
      </h4>
      <RepeaterField
        form={form}
        name="series"
        addLabel="Add series"
        newItem={() => ({ name: "", data: "" })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <TextField
              {...f.register(`series.${index}.name` as const)}
              placeholder="Series name"
            />
            <TextField
              {...f.register(`series.${index}.data` as const)}
              placeholder="예: 10, 20, 30"
            />
          </div>
        )}
      />
      <Field label="X-axis labels">
        <TextField {...register("xLabels")} placeholder="Jan, Feb, Mar, …" />
      </Field>
      <div className="flex items-center gap-4 mt-1">
        <label htmlFor={legendId} className="flex items-center gap-2 text-xs">
          <SwitchField {...register("showLegend")} id={legendId} />
          Legend
        </label>
        <label htmlFor={gridId} className="flex items-center gap-2 text-xs">
          <SwitchField {...register("showGrid")} id={gridId} />
          Grid
        </label>
      </div>
    </EditorShell>
  );
};
