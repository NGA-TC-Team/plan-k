"use client";

import { Controller } from "react-hook-form";
import { EnumChips, Field, NumberField } from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { PaginationValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const MODE_OPTIONS = [
  { value: "numbered", label: "Numbered" },
  { value: "prev-next", label: "Prev / Next" },
  { value: "load-more", label: "Load more" },
];

export const PaginationEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<PaginationValues>("pagination", vm);
  const { register, handleSubmit, control } = form;

  return (
    <EditorShell
      title="Pagination"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Mode">
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={MODE_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Current page">
        <NumberField
          {...register("page", { valueAsNumber: true })}
          min={1}
          placeholder="1"
        />
      </Field>
      <Field label="Total items">
        <NumberField
          {...register("total", { valueAsNumber: true })}
          min={0}
          placeholder="0"
        />
      </Field>
      <Field label="Per page">
        <NumberField
          {...register("perPage", { valueAsNumber: true })}
          min={1}
          placeholder="10"
        />
      </Field>
    </EditorShell>
  );
};
