"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useForm } from "react-hook-form";
import {
  CanvasAppSchema,
  CANVAS_APP_DEFAULTS,
  type CanvasAppValues,
} from "@/components/builder/renderers/editors/schemas";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

const ASPECT_OPTIONS = [
  { label: "16:9", value: "16:9" as const },
  { label: "4:3", value: "4:3" as const },
  { label: "1:1", value: "1:1" as const },
  { label: "Auto", value: "auto" as const },
];

// App-context canvas editor.
// Uses its own schema (CanvasAppSchema) instead of the docs canvas manifest schema.
export const CanvasAppEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useForm<CanvasAppValues>({
    // biome-ignore lint/suspicious/noExplicitAny: CanvasAppSchema .default() fields yield optional input type; cast to Resolver<T> recovers the concrete output type contract.
    resolver: zodResolver(CanvasAppSchema) as unknown as Resolver<CanvasAppValues>,
    defaultValues: {
      ...CANVAS_APP_DEFAULTS,
      ...(vm.displayValue as Partial<CanvasAppValues>),
    },
    mode: "onBlur",
  });
  const { register, handleSubmit, control } = form;
  // control is used for EnumChips via Controller
  useDraftSync(form.watch);

  return (
    <EditorShell
      title="Canvas (app)"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} placeholder="Canvas title" />
      </Field>
      <Field label="Aspect ratio">
        <Controller
          control={control}
          name="aspect"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={ASPECT_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Placeholder text">
        <TextField {...register("placeholder")} placeholder="e.g. Draw here…" />
      </Field>
      <Field label="Show toolbar">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("showToolbar")}
        />
      </Field>
    </EditorShell>
  );
};
