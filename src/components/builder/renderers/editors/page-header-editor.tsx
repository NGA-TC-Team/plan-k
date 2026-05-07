"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  title: string;
  subtitle: string;
  breadcrumbs: { label: string; href: string }[];
  actions: { label: string; variant: string; href: string }[];
};

export const PageHeaderEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("page-header", vm);
  const { register, handleSubmit, control } = form;
  const breadcrumbs = useFieldArray({ control, name: "breadcrumbs" });
  const actions = useFieldArray({ control, name: "actions" });
  return (
    <EditorShell
      title="Page header"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} />
      </Field>
      <Field label="Subtitle">
        <TextField {...register("subtitle")} />
      </Field>
      <Field label="Breadcrumbs">
        <div className="space-y-1">
          {breadcrumbs.fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-1">
              <TextField
                {...register(`breadcrumbs.${i}.label` as const)}
                placeholder="Label"
              />
              <TextField
                {...register(`breadcrumbs.${i}.href` as const)}
                placeholder="/href"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => breadcrumbs.remove(i)}
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
            onClick={() => breadcrumbs.append({ label: "", href: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add crumb
          </Button>
        </div>
      </Field>
      <Field label="Actions">
        <div className="space-y-1">
          {actions.fields.map((field, i) => (
            <div key={field.id} className="space-y-1 rounded border p-2">
              <TextField
                {...register(`actions.${i}.label` as const)}
                placeholder="Label"
              />
              <TextField
                {...register(`actions.${i}.variant` as const)}
                placeholder="primary | secondary"
              />
              <div className="flex gap-1">
                <TextField
                  {...register(`actions.${i}.href` as const)}
                  placeholder="/href"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => actions.remove(i)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              actions.append({ label: "", variant: "primary", href: "" })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add action
          </Button>
        </div>
      </Field>
    </EditorShell>
  );
};
