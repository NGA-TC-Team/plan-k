"use client";

import { useId } from "react";
import {
  Field,
  NumberField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { FileUploadValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const FileUploadEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<FileUploadValues>("file-upload", vm);
  const { register, handleSubmit } = form;
  const multipleId = useId();
  return (
    <EditorShell
      title="File upload"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Accept" hint='e.g. "image/*" or ".pdf,.docx"'>
        <TextField {...register("accept")} placeholder="image/*" />
      </Field>
      <Field label="Max size (MB)">
        <NumberField
          {...register("maxSizeMb", { valueAsNumber: true })}
          min={0}
        />
      </Field>
      <Field label="Help text">
        <TextField {...register("helpText")} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("multiple")} id={multipleId} />
        <label htmlFor={multipleId}>Allow multiple files</label>
      </div>
    </EditorShell>
  );
};
