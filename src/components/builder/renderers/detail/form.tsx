"use client";

import type { BlockRenderer } from "../types";

type Field = { label?: string; type?: string; required?: boolean };

export const FormDetail: BlockRenderer = ({ vm }) => {
  const fields = (vm.displayValue.fields as Field[]) ?? [];
  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Empty form
      </div>
    );
  }
  return (
    <form
      className="space-y-2 py-2"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {fields.map((f, i) => (
        <div key={`${vm.id}-${i}`} className="space-y-1">
          <div className="text-sm font-medium">
            {f.label ?? (
              <span className="italic text-muted-foreground">Field label</span>
            )}
            {f.required ? <span className="text-red-500"> *</span> : null}
          </div>
          <div className="rounded border bg-zinc-50 px-2 py-1 text-xs text-muted-foreground dark:bg-zinc-900">
            type: {f.type ?? "text"}
          </div>
        </div>
      ))}
    </form>
  );
};
