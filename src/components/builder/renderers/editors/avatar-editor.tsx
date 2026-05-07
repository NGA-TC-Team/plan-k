"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  name: string;
  src: string;
  size: "sm" | "md" | "lg";
  subtitle: string;
};

const SIZE = [
  { label: "Sm", value: "sm" as const },
  { label: "Md", value: "md" as const },
  { label: "Lg", value: "lg" as const },
];

export const AvatarEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "avatar",
    vm,
  );
  return (
    <EditorShell
      title="Avatar"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Name">
        <TextField {...register("name")} />
      </Field>
      <Field label="Image URL">
        <TextField {...register("src")} placeholder="https://…" />
      </Field>
      <Field label="Subtitle">
        <TextField {...register("subtitle")} placeholder="e.g. role/title" />
      </Field>
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
    </EditorShell>
  );
};
