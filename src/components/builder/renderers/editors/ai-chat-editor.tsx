"use client";

import { Controller } from "react-hook-form";
import {
  EnumChips,
  Field,
  RepeaterField,
  TextAreaField,
  TextField,
} from "@/components/builder/fields";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import type { AiChatValues } from "./schemas";
import { useBlockForm } from "./use-block-form";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "assistant", label: "Assistant" },
  { value: "system", label: "System" },
];

export const AiChatEditor: BlockRenderer = ({ vm, handlers }) => {
  const form = useBlockForm<AiChatValues>("ai-chat", vm);
  const { register, handleSubmit } = form;

  return (
    <EditorShell
      title="AI Chat"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Field label="Title">
        <TextField {...register("title")} placeholder="Chat window title" />
      </Field>
      <Field label="Placeholder">
        <TextField {...register("placeholder")} placeholder="Type a message…" />
      </Field>
      <Field label="Model label">
        <TextField {...register("modelLabel")} placeholder="GPT-4o, Claude…" />
      </Field>

      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Messages
      </h4>
      <RepeaterField
        form={form}
        name="messages"
        addLabel="Add message"
        newItem={() => ({
          role: "user" as const,
          content: "",
          timestamp: "",
        })}
        renderItem={({ index }, f) => (
          <div className="space-y-1">
            <Controller
              control={f.control}
              name={`messages.${index}.role` as const}
              render={({ field }) => (
                <EnumChips
                  value={field.value}
                  onChange={field.onChange}
                  options={ROLE_OPTIONS}
                />
              )}
            />
            <TextAreaField
              {...f.register(`messages.${index}.content` as const)}
              placeholder="Message content"
            />
            <TextField
              {...f.register(`messages.${index}.timestamp` as const)}
              placeholder="e.g. 10:23 AM"
            />
          </div>
        )}
      />

      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
        Suggestions
      </h4>
      <RepeaterField
        form={form}
        name="suggestions"
        addLabel="Add suggestion"
        newItem={() => ({ label: "" })}
        renderItem={({ index }, f) => (
          <TextField
            {...f.register(`suggestions.${index}.label` as const)}
            placeholder="Suggestion label"
          />
        )}
      />
    </EditorShell>
  );
};
