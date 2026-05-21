"use client";

import { useId } from "react";
import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  RepeaterField,
  SwitchField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { CalendarValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

export const CalendarEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<CalendarValues>("calendar", vm);
  const { register, handleSubmit, control } = form;
  const showWeekendsId = useId();
  return (
    <EditorShell
      title="Calendar"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="View">
        <Controller
          control={control}
          name="view"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VIEW_OPTIONS}
            />
          )}
        />
      </Field>
      <Field label="Date">
        <TextField {...register("date")} placeholder="YYYY-MM-DD" />
      </Field>
      <label
        htmlFor={showWeekendsId}
        className="flex items-center gap-2 text-xs"
      >
        <SwitchField {...register("showWeekends")} id={showWeekendsId} />
        Show weekends
      </label>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Events
      </h4>
      <RepeaterField
        form={form}
        name="events"
        addLabel="Add event"
        newItem={() => ({ title: "", date: "", color: "" })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <TextField
              {...f.register(`events.${index}.title` as const)}
              placeholder="Event title"
            />
            <TextField
              {...f.register(`events.${index}.date` as const)}
              placeholder="YYYY-MM-DD"
            />
            <TextField
              {...f.register(`events.${index}.color` as const)}
              placeholder="#3b82f6 or blue"
            />
          </div>
        )}
      />
    </EditorShell>
  );
};
