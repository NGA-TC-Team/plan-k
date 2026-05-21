"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { TooltipValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SIDE_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
];

export const TooltipEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<TooltipValues>("tooltip", vm);
  const { register, handleSubmit, control } = form;

  return (
    <EditorShell
      title="Tooltip"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Trigger text">
        <TextField {...register("trigger")} placeholder="Hover me" />
      </Field>
      <Field label="Content">
        <TextAreaField {...register("content")} placeholder="Tooltip text" />
      </Field>
      <Field label="Side">
        <Controller
          control={control}
          name="side"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={SIDE_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
