"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, TextAreaField, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { HERO_DEFAULTS, HeroSchema, type HeroValues } from "./schemas";

export const HeroEditor: BlockRenderer = ({ vm, handlers }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HeroValues>({
    resolver: zodResolver(HeroSchema),
    defaultValues: {
      ...HERO_DEFAULTS,
      ...(vm.displayValue as Partial<HeroValues>),
    },
  });
  useDraftSync(watch);
  return (
    <EditorShell
      title="Hero"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title" error={errors.title?.message}>
        <TextField {...register("title")} placeholder="Hero title" />
      </Field>
      <Field label="Subtitle" error={errors.subtitle?.message}>
        <TextAreaField
          rows={2}
          {...register("subtitle")}
          placeholder="Optional subtitle"
        />
      </Field>
      <Field label="CTA label" error={errors.cta?.message}>
        <TextField {...register("cta")} placeholder="Get started" />
      </Field>
    </EditorShell>
  );
};
