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

const STATUS_OPTIONS = [
  { label: "Planned", value: "planned" as const },
  { label: "In progress", value: "in-progress" as const },
  { label: "Shipped", value: "shipped" as const },
  { label: "Delayed", value: "delayed" as const },
];

type Values = {
  date: string;
  title: string;
  status: "planned" | "in-progress" | "shipped" | "delayed";
  scope: string;
  exitCriteria: string;
};

export const MilestoneEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useBlockForm<Values>("milestone", vm);

  return (
    <EditorShell
      title="Milestone"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title" error={errors.title?.message}>
        <TextField
          {...register("title")}
          placeholder="Ship cancellation flow"
        />
      </Field>
      <Field label="Date / quarter" hint="ISO date or 'Q3 2026'">
        <TextField {...register("date")} placeholder="2026-04-15" />
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
      <Field label="Scope">
        <TextAreaField
          rows={2}
          {...register("scope")}
          placeholder="What's included in this milestone"
        />
      </Field>
      <Field label="Done when" hint="Exit criteria">
        <TextAreaField
          rows={2}
          {...register("exitCriteria")}
          placeholder="Acceptance bar that flips this to shipped"
        />
      </Field>
    </EditorShell>
  );
};
