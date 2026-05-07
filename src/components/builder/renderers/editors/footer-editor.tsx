"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormProvider, useFieldArray, useFormContext } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  items: Record<string, unknown>[];
  columns: { title: string; links: { label: string; href: string }[] }[];
  copyright: string;
};

function ColumnLinks({ columnIndex }: { columnIndex: number }) {
  const form = useFormContext<Values>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `columns.${columnIndex}.links`,
  });
  return (
    <div className="space-y-1">
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-center gap-1">
          <TextField
            {...form.register(
              `columns.${columnIndex}.links.${i}.label` as const,
            )}
            placeholder="Label"
          />
          <TextField
            {...form.register(
              `columns.${columnIndex}.links.${i}.href` as const,
            )}
            placeholder="/href"
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
        onClick={() => append({ label: "", href: "" })}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add link
      </Button>
    </div>
  );
}

export const FooterEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("footer", vm);
  const { register, handleSubmit, control } = form;
  const cols = useFieldArray({ control, name: "columns" });
  return (
    <FormProvider {...form}>
      <EditorShell
        title="Footer"
        isPending={vm.isPending}
        onSubmit={handleSubmit(() => handlers.onCommitEdit())}
        onCancel={handlers.onCancelEdit}
      >
        <Field label="Columns">
          <div className="space-y-2">
            {cols.fields.map((field, i) => (
              <div key={field.id} className="space-y-1 rounded border p-2">
                <div className="flex items-center justify-between">
                  <TextField
                    {...register(`columns.${i}.title` as const)}
                    placeholder="Column title"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => cols.remove(i)}
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <ColumnLinks columnIndex={i} />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => cols.append({ title: "", links: [] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add column
            </Button>
          </div>
        </Field>
        <Field label="Copyright">
          <TextField {...register("copyright")} placeholder="© 2026 Example" />
        </Field>
      </EditorShell>
    </FormProvider>
  );
};
