"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { KpiCardValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const CHANGE_KIND_OPTIONS = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
  { value: "flat", label: "Flat" },
];

export const KpiCardEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<KpiCardValues>("kpi-card", vm);
  const { register, handleSubmit, control } = form;
  return (
    <EditorShell
      title="KPI Card"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} placeholder="Revenue" />
      </Field>
      <Field label="Value">
        <TextField {...register("value")} placeholder="$42K" />
      </Field>
      <Field label="Change">
        <TextField {...register("change")} placeholder="+12%" />
      </Field>
      <Field label="Direction">
        <Controller
          control={control}
          name="changeKind"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={CHANGE_KIND_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Icon (name)">
        <TextField {...register("icon")} placeholder="TrendingUp" />
      </Field>
      <Field label="Sparkline">
        <TextField
          {...register("sparkline")}
          placeholder="예: 10, 25, 18, 42, 35"
        />
      </Field>
    </EditorShell>
  );
};
