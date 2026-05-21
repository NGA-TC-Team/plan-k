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
import type { MessageBubbleValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const SIDE_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const STATUS_OPTIONS = [
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
];

const VARIANT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "info", label: "Info" },
  { value: "system", label: "System" },
];

export const MessageBubbleEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<MessageBubbleValues>("message-bubble", vm);
  const { register, handleSubmit, control } = form;

  return (
    <EditorShell
      title="Message Bubble"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Sender">
        <TextField {...register("sender")} placeholder="Alice" />
      </Field>
      <Field label="Avatar URL">
        <TextField {...register("avatar")} placeholder="https://…" />
      </Field>
      <Field label="Content">
        <TextAreaField {...register("content")} placeholder="Message text" />
      </Field>
      <Field label="Timestamp">
        <TextField {...register("timestamp")} placeholder="10:23 AM" />
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
      <Field label="Variant">
        <Controller
          control={control}
          name="variant"
          render={({ field }) => (
            <EnumChips
              value={field.value}
              onChange={field.onChange}
              options={VARIANT_OPTIONS}
            />
          )}
        />
      </Field>
    </EditorShell>
  );
};
