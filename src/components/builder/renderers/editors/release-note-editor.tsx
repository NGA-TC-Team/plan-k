"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Bucket = "added" | "changed" | "fixed" | "removed";

type Values = {
  version: string;
  date: string;
  highlights: string;
  added: string[];
  changed: string[];
  fixed: string[];
  removed: string[];
};

function BucketList({
  // biome-ignore lint/suspicious/noExplicitAny: same composite escape hatch as persona-editor.
  form,
  name,
  label,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: see above.
  form: any;
  name: Bucket;
  label: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });
  return (
    <Field label={label}>
      <div className="space-y-1">
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-1">
            <TextField
              {...form.register(`${name}.${i}` as const)}
              placeholder={`${label} entry`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(i)}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append("")}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </Field>
  );
}

export const ReleaseNoteEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("release-note", vm);
  const { register, handleSubmit } = form;

  return (
    <EditorShell
      title="Release note"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Version">
        <TextField {...register("version")} placeholder="v1.4.0" />
      </Field>
      <Field label="Date">
        <TextField {...register("date")} placeholder="2026-04-15" />
      </Field>
      <Field label="Highlights" hint="One-sentence summary">
        <TextField {...register("highlights")} />
      </Field>
      <BucketList form={form} name="added" label="Added" />
      <BucketList form={form} name="changed" label="Changed" />
      <BucketList form={form} name="fixed" label="Fixed" />
      <BucketList form={form} name="removed" label="Removed" />
    </EditorShell>
  );
};
