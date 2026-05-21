"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  RepeaterField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { TimelineValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const ORIENTATION_OPTIONS = [
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
];

const STATUS_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
];

export const TimelineEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<TimelineValues>("timeline", vm);
  const { handleSubmit, control } = form;
  return (
    <EditorShell
      title="Timeline"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Orientation">
        <Controller
          control={control}
          name="orientation"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={ORIENTATION_OPTIONS}
            />
          )}
        />
      </Field>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Items
      </h4>
      <RepeaterField
        form={form}
        name="items"
        addLabel="Add item"
        newItem={() => ({
          title: "",
          time: "",
          body: "",
          icon: "",
          status: "default" as const,
        })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <TextField
              {...f.register(`items.${index}.title` as const)}
              placeholder="Title"
            />
            <TextField
              {...f.register(`items.${index}.time` as const)}
              placeholder="Time or date"
            />
            <TextField
              {...f.register(`items.${index}.body` as const)}
              placeholder="Description"
            />
            <Controller
              control={f.control}
              name={`items.${index}.status` as const}
              render={({ field }) => (
                <EnumChips
                  value={field.value}
                  onChange={field.onChange}
                  options={STATUS_OPTIONS}
                />
              )}
            />
          </div>
        )}
      />
    </EditorShell>
  );
};
