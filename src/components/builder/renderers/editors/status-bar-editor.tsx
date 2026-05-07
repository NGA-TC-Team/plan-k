"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  NumberField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  variant: "light" | "dark";
  time: string;
  batteryPct?: number;
};

const VARIANT = [
  { label: "Light", value: "light" as const },
  { label: "Dark", value: "dark" as const },
];

export const StatusBarEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "status-bar",
    vm,
  );
  return (
    <EditorShell
      title="Status bar"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT}
            />
          )}
        />
      </Field>
      <Field label="Time" hint="e.g. 9:41">
        <TextField {...register("time")} />
      </Field>
      <Field label="Battery %" hint="0–100">
        <NumberField
          min={0}
          max={100}
          {...register("batteryPct", {
            setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
          })}
        />
      </Field>
    </EditorShell>
  );
};
