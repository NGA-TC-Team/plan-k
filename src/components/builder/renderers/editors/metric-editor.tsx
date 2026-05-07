"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  name: string;
  target: string;
  current: string;
  status: "ok" | "warn" | "bad";
  unit: string;
  trend: "up" | "down" | "flat";
};

const STATUS_OPTIONS = [
  { label: "OK", value: "ok" as const },
  { label: "Warn", value: "warn" as const },
  { label: "Bad", value: "bad" as const },
];

const TREND_OPTIONS = [
  { label: "↑ Up", value: "up" as const },
  { label: "→ Flat", value: "flat" as const },
  { label: "↓ Down", value: "down" as const },
];

export const MetricEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "metric",
    vm,
  );
  return (
    <EditorShell
      title="Metric"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Name">
        <TextField
          {...register("name")}
          placeholder="e.g. Weekly active users"
        />
      </Field>
      <Field label="Current">
        <TextField {...register("current")} />
      </Field>
      <Field label="Target">
        <TextField {...register("target")} />
      </Field>
      <Field label="Unit" hint="e.g. %, ms, $">
        <TextField {...register("unit")} />
      </Field>
      <Field label="Status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={STATUS_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Trend">
        <Controller
          control={control}
          name="trend"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={TREND_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
