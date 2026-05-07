"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

const LEVEL_OPTIONS = [
  { label: "Low", value: "low" as const },
  { label: "Medium", value: "medium" as const },
  { label: "High", value: "high" as const },
];

type Values = {
  risk: string;
  impact: string;
  impactLevel: "low" | "medium" | "high";
  likelihood: "low" | "medium" | "high";
  mitigation: string;
  owner: string;
};

export const RiskEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("risk", vm);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  return (
    <EditorShell
      title="Risk"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Risk" error={errors.risk?.message}>
        <TextAreaField
          rows={2}
          {...register("risk")}
          placeholder="What could go wrong?"
        />
      </Field>
      <Field label="Impact level">
        <Controller
          control={control}
          name="impactLevel"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={LEVEL_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Likelihood">
        <Controller
          control={control}
          name="likelihood"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={LEVEL_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Impact (free-form)" hint="Optional narrative">
        <TextField
          {...register("impact")}
          placeholder="e.g. data loss, revenue hit"
        />
      </Field>
      <Field label="Mitigation">
        <TextAreaField rows={2} {...register("mitigation")} />
      </Field>
      <Field label="Owner">
        <TextField {...register("owner")} placeholder="Team or person" />
      </Field>
    </EditorShell>
  );
};
