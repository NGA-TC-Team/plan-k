"use client";

import { Field, TextAreaField, TextField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  name: string;
  hex: string;
  role: string;
  contrastNote: string;
};

export const ColorSwatchEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useBlockForm<Values>("color-swatch", vm);
  const hex = watch("hex");
  const previewColor =
    hex && /^#?[0-9a-fA-F]{3,8}$/.test(hex)
      ? hex.startsWith("#")
        ? hex
        : `#${hex}`
      : undefined;

  return (
    <EditorShell
      title="Color swatch"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Name" error={errors.name?.message}>
        <TextField {...register("name")} placeholder="Brand primary" />
      </Field>
      <div className="flex items-stretch gap-2">
        <Field label="Hex" error={errors.hex?.message} className="flex-1">
          <TextField
            {...register("hex")}
            placeholder="#0066ff"
            className="font-mono"
          />
        </Field>
        <div
          className="mt-5 size-10 shrink-0 rounded border"
          style={previewColor ? { backgroundColor: previewColor } : undefined}
          role="img"
          aria-label="Color preview"
        />
      </div>
      <Field label="Role">
        <TextField
          {...register("role")}
          placeholder="Primary CTA, links, focus rings"
        />
      </Field>
      <Field label="Contrast notes">
        <TextAreaField
          rows={2}
          {...register("contrastNote")}
          placeholder="AAA on white, AA on neutral-100"
        />
      </Field>
    </EditorShell>
  );
};
