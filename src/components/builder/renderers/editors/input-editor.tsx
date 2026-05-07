"use client";

import { useId } from "react";
import {
  Field,
  SelectField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  label: string;
  placeholder: string;
  type: string;
  required: boolean;
  helpText: string;
  defaultValue: string;
};

const TYPES = [
  "text",
  "email",
  "password",
  "number",
  "tel",
  "url",
  "search",
  "textarea",
].map((t) => ({ label: t, value: t }));

export const InputEditor: BlockRenderer = ({ vm, handlers }) => {
  const requiredId = useId();
  const { register, handleSubmit } = useBlockForm<Values>("input", vm);
  return (
    <EditorShell
      title="Input"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Placeholder">
        <TextField {...register("placeholder")} />
      </Field>
      <Field label="Type">
        <SelectField options={TYPES} {...register("type")} />
      </Field>
      <Field label="Help text">
        <TextField {...register("helpText")} />
      </Field>
      <Field label="Default value">
        <TextField {...register("defaultValue")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField id={requiredId} {...register("required")} />
        <label htmlFor={requiredId}>Required</label>
      </div>
    </EditorShell>
  );
};
