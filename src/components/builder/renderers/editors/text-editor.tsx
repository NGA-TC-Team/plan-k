"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { TEXT_DEFAULTS, TextSchema, type TextValues } from "./schemas";

export const TextEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, watch } = useForm<TextValues>({
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
      <Textarea
        rows={8}
        placeholder="Markdown / freeform"
        {...register("markdown")}
      />
    </EditorShell>
  );
};
