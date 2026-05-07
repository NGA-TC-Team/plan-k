"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { Field, TextField } from "@/components/builder/fields";
import { Button } from "@/components/ui/button";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

type Values = {
  columns: string[];
  rows: string[][];
};

export const TableEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<Values>("table", vm);
  const { register, handleSubmit, control, watch, setValue } = form;
  const {
    fields: cols,
    append: appendCol,
    remove: removeCol,
  } = useFieldArray({
    control,
    // string[] arrays: RHF uses index keys; satisfy types with `as never`.
    name: "columns" as never,
  });
  const {
    fields: rows,
    append: appendRow,
    remove: removeRow,
  } = useFieldArray({
    control,
    name: "rows" as never,
  });

  const colCount = cols.length;

  function addColumn() {
    appendCol("");
    // Extend each row with a new empty cell to keep the matrix square.
    const current = watch("rows") as string[][];
    setValue(
      "rows",
      current.map((r) => [...r, ""]),
    );
  }
  function removeColumn(i: number) {
    removeCol(i);
    const current = watch("rows") as string[][];
    setValue(
      "rows",
      current.map((r) => r.filter((_, idx) => idx !== i)),
    );
  }
  function addRow() {
    appendRow(Array(colCount).fill("") as never);
  }

  return (
    <EditorShell
      title="Table"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Columns">
        <div className="space-y-1">
          {cols.map((field, i) => (
            <div key={field.id} className="flex items-center gap-1">
              <TextField
                {...register(`columns.${i}` as const)}
                placeholder={`Column ${i + 1}`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeColumn(i)}
                aria-label="Remove column"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addColumn}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add column
          </Button>
        </div>
      </Field>
      <Field label="Rows">
        <div className="space-y-2">
          {rows.map((field, ri) => (
            <div key={field.id} className="space-y-1 rounded border p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Row {ri + 1}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(ri)}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {Array.from({ length: colCount }).map((_, ci) => (
                <TextField
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional in the matrix.
                  key={ci}
                  {...register(`rows.${ri}.${ci}` as const)}
                  placeholder={cols[ci] ? `(${ri + 1}, ${cols[ci]})` : `Cell`}
                />
              ))}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add row
          </Button>
        </div>
      </Field>
    </EditorShell>
  );
};
