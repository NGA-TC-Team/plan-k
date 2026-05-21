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
import type { RatingValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

export const RatingEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<RatingValues>("rating", vm);
  const { register, handleSubmit } = form;
  const allowHalfId = useId();
  const readOnlyId = useId();
  return (
    <EditorShell
      title="Rating"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Label">
        <TextField {...register("label")} />
      </Field>
      <Field label="Max stars">
        <NumberField
          {...register("max", { valueAsNumber: true })}
          min={1}
          max={10}
        />
      </Field>
      <Field label="Default value">
        <NumberField {...register("value", { valueAsNumber: true })} min={0} />
      </Field>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("allowHalf")} id={allowHalfId} />
        <label htmlFor={allowHalfId}>Allow half star</label>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <SwitchField {...register("readOnly")} id={readOnlyId} />
        <label htmlFor={readOnlyId}>Read only</label>
      </div>
    </EditorShell>
  );
};
