"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import {
  EnumChips,
  Field,
  MarkdownField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  question: string;
  status: "proposed" | "accepted" | "superseded";
  context: string;
  options: { label: string; pros: string; cons: string }[];
  decision: string;
  rationale: string;
  consequences: string;
};

const STATUS_OPTIONS = [
  { label: "Proposed", value: "proposed" as const },
  { label: "Accepted", value: "accepted" as const },
  { label: "Superseded", value: "superseded" as const },
];

export const DecisionEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("decision", vm);
  const { register, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });
  return (
    <EditorShell
      title="Decision (ADR)"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Question">
        <TextField {...register("question")} />
      </Field>
      <Field label="Status">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={STATUS_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Context">
        <MarkdownField rows={4} {...register("context")} />
      </Field>
      <Field label="Options">
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="space-y-1 rounded border p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Option {i + 1}</span>
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
              <TextField
                {...register(`options.${i}.label` as const)}
                placeholder="Option name"
              />
              <TextAreaField
                rows={2}
                {...register(`options.${i}.pros` as const)}
                placeholder="Pros"
              />
              <TextAreaField
                rows={2}
                {...register(`options.${i}.cons` as const)}
                placeholder="Cons"
              />
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append({ label: "", pros: "", cons: "" })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add option
          </Button>
        </div>
      </Field>
      <Field label="Decision">
        <MarkdownField rows={3} {...register("decision")} />
      </Field>
      <Field label="Rationale">
        <MarkdownField rows={3} {...register("rationale")} />
      </Field>
      <Field label="Consequences">
        <MarkdownField rows={3} {...register("consequences")} />
      </Field>
    </EditorShell>
  );
};
