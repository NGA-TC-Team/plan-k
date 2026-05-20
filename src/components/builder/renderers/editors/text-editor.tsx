"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MentionInput } from "@/components/builder/mention-input";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { TEXT_DEFAULTS, TextSchema, type TextValues } from "./schemas";

export const TextEditor: BlockRenderer = ({ vm, handlers }) => {
  const { control, handleSubmit, watch } = useForm<TextValues>({
    resolver: zodResolver(TextSchema),
    defaultValues: {
      ...TEXT_DEFAULTS,
      ...(vm.displayValue as Partial<TextValues>),
    },
  });
  useDraftSync(watch);
  return (
    <EditorShell
      title="Text"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <Controller
        control={control}
        name="markdown"
        render={({ field }) => (
          <MentionInput
            rows={8}
            placeholder="Markdown. Type @ to reference an entity."
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
    </EditorShell>
  );
};
