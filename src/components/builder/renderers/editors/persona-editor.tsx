"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import {
  Field,
  ImageRefField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  name: string;
  role: string;
  demographics: string;
  goals: string[];
  needs: string[];
  pains: string[];
  quote: string;
  profileImageRef: string;
  profileImageAlt: string;
};

function StringList({
  form,
  name,
  label,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: composite over the parent form's specific field paths.
  form: any;
  name: "goals" | "needs" | "pains";
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
              placeholder={`${label} ${i + 1}`}
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

export const PersonaEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("persona", vm);
  const { register, handleSubmit } = form;
  return (
    <EditorShell
      title="Persona"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <ImageRefField
        form={form}
        srcName="profileImageRef"
        altName="profileImageAlt"
      />
      <Field label="Name">
        <TextField {...register("name")} />
      </Field>
      <Field label="Role">
        <TextField {...register("role")} placeholder="e.g. Product Manager" />
      </Field>
      <Field label="Demographics">
        <TextAreaField rows={2} {...register("demographics")} />
      </Field>
      <StringList form={form} name="goals" label="Goals" />
      <StringList form={form} name="needs" label="Needs" />
      <StringList form={form} name="pains" label="Pains" />
      <Field label="Quote">
        <TextAreaField rows={2} {...register("quote")} />
      </Field>
    </EditorShell>
  );
};
