"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { EnumChips, Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  as: string;
  want: string;
  soThat: string;
  acceptance: string[];
  priority: "P0" | "P1" | "P2";
  estimate: string;
};

const PRIORITY_OPTIONS = [
  { label: "P0", value: "P0" as const, hint: "Critical" },
  { label: "P1", value: "P1" as const, hint: "Important" },
  { label: "P2", value: "P2" as const, hint: "Nice to have" },
];

export const UserStoryEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("user-story", vm);
  const { register, handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "acceptance" as never,
  });
  return (
    <EditorShell
      title="User story"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="As a">
        <TextField {...register("as")} placeholder="e.g. signed-in admin" />
      </Field>
      <Field label="I want">
        <TextField
          {...register("want")}
          placeholder="e.g. to export weekly reports"
        />
      </Field>
      <Field label="So that">
        <TextField
          {...register("soThat")}
          placeholder="e.g. I can share with stakeholders"
        />
      </Field>
      <Field label="Priority">
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={PRIORITY_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Estimate" hint="e.g. 2d, 3pt">
        <TextField {...register("estimate")} />
      </Field>
      <Field label="Acceptance criteria">
        <div className="space-y-1">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-1">
              <TextField
                {...register(`acceptance.${i}` as const)}
                placeholder={`Criterion ${i + 1}`}
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
    </EditorShell>
  );
};
