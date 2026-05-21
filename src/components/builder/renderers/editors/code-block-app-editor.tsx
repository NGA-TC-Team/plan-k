"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useForm } from "react-hook-form";
import {
  CodeBlockAppSchema,
  CODE_BLOCK_APP_DEFAULTS,
  type CodeBlockAppValues,
} from "@/components/builder/renderers/editors/schemas";
import { EnumChips, Field, TextAreaField, TextField } from "@/components/builder/fields";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

const THEME_OPTIONS = [
  { label: "Dark", value: "dark" as const },
  { label: "Light", value: "light" as const },
];

// App-context code-block editor.
// Uses CodeBlockAppSchema (language/code/showLineNumbers/theme).
// docs code-block uses its own manifest schema (language/code/filename).
export const CodeBlockAppEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useForm<CodeBlockAppValues>({
    // biome-ignore lint/suspicious/noExplicitAny: CodeBlockAppSchema .default() fields yield optional input type; cast to Resolver<T> recovers the concrete output type contract.
    resolver: zodResolver(CodeBlockAppSchema) as unknown as Resolver<CodeBlockAppValues>,
    defaultValues: {
      ...CODE_BLOCK_APP_DEFAULTS,
      ...(vm.displayValue as Partial<CodeBlockAppValues>),
    },
    mode: "onBlur",
  });
  const { register, handleSubmit, control } = form;
  useDraftSync(form.watch);

  return (
    <EditorShell
      title="Code block (app)"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Language">
        <TextField {...register("language")} placeholder="e.g. ts, py, sh" />
      </Field>
      <Field label="Code">
        <TextAreaField
          rows={8}
          className="font-mono text-xs"
          {...register("code")}
        />
      </Field>
      <Field label="Show line numbers">
        <input
          type="checkbox"
          className="size-4 rounded-sm border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("showLineNumbers")}
        />
      </Field>
      <Field label="Theme">
        <Controller
          control={control}
          name="theme"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={THEME_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
