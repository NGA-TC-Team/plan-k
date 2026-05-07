"use client";

import { useId } from "react";
import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  variant: "info" | "warn" | "success" | "error";
  text: string;
  dismissible: boolean;
  ctaLabel: string;
};

const VARIANT = [
  { label: "Info", value: "info" as const },
  { label: "Warn", value: "warn" as const },
  { label: "Success", value: "success" as const },
  { label: "Error", value: "error" as const },
];

export const BannerEditor: BlockRenderer = ({ vm, handlers }) => {
  const dismissId = useId();
  const { register, handleSubmit, control } = useBlockForm<Values>(
    "banner",
    vm,
  );
  return (
    <EditorShell
      title="Banner"
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
      <Field label="Text">
        <TextAreaField rows={2} {...register("text")} />
      </Field>
      <Field label="CTA label">
        <TextField {...register("ctaLabel")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField id={dismissId} {...register("dismissible")} />
        <label htmlFor={dismissId}>Dismissible</label>
      </div>
    </EditorShell>
  );
};
