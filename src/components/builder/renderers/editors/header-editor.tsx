"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, SelectField, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { HEADER_DEFAULTS, HeaderSchema, type HeaderValues } from "./schemas";

const LEVEL_OPTIONS = [
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
];

export const HeaderEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HeaderValues>({
    resolver: zodResolver(HeaderSchema),
    defaultValues: {
      ...HEADER_DEFAULTS,
      ...(vm.displayValue as Partial<HeaderValues>),
    },
  });
  useDraftSync(watch);
  return (
    <EditorShell
      title="Header"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Level" error={errors.level?.message}>
        <SelectField
          options={LEVEL_OPTIONS}
          {...register("level", { valueAsNumber: true })}
        />
      </Field>
      <Field label="Text" error={errors.text?.message}>
        <TextField {...register("text")} placeholder="Heading text" />
      </Field>
    </EditorShell>
  );
};
