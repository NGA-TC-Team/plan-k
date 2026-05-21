"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { PopoverValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SIDE_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "right", label: "Right" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
];

export const PopoverEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<PopoverValues>("popover", vm);
  const { register, handleSubmit, control } = form;

  return (
    <EditorShell
      title="Popover"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Trigger label">
        <TextField {...register("trigger")} placeholder="Open" />
      </Field>
      <Field label="Title">
        <TextField
          {...register("title")}
          placeholder="Popover title (optional)"
        />
      </Field>
      <Field label="Body">
        <TextAreaField {...register("body")} placeholder="Popover content" />
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
      <Field label="Show arrow">
        <SwitchField {...register("withArrow")} />
      </Field>
    </EditorShell>
  );
};
