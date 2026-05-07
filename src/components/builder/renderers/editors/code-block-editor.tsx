"use client";

import {
  Field,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = { language: string; code: string; filename: string };

const LANGUAGES = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "sh",
  "json",
  "sql",
  "yaml",
  "md",
  "text",
].map((v) => ({ label: v, value: v }));

export const CodeBlockEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit } = useBlockForm<Values>("code-block", vm);
  return (
    <EditorShell
      title="Code block"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Filename">
        <TextField
          {...register("filename")}
          placeholder="e.g. components/Button.tsx"
        />
      </Field>
      <Field label="Language">
        <SelectField options={LANGUAGES} {...register("language")} />
      </Field>
      <Field label="Code">
        <TextAreaField
          rows={12}
          className="font-mono text-xs"
          {...register("code")}
        />
      </Field>
    </EditorShell>
  );
};
