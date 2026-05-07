"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { HEADER_DEFAULTS, HeaderSchema, type HeaderValues } from "./schemas";

export const HeaderEditor: BlockRenderer = ({ vm, handlers }) => {
  const { register, handleSubmit, watch } = useForm<HeaderValues>({
    resolver: zodResolver(HeaderSchema),
    defaultValues: {
      ...HEADER_DEFAULTS,
      ...(vm.displayValue as Partial<HeaderValues>),
    },
  });
  useDraftSync(watch);
  return (
    <EditorShell
      title="Header"
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Level</span>
        <select
          {...register("level", { valueAsNumber: true })}
          className="w-full rounded border bg-background px-2 py-1 text-sm"
        >
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
        </select>
      </div>
      <div className="block space-y-1 text-xs">
        <span className="font-medium">Text</span>
        <Input {...register("text")} placeholder="Heading text" />
      </div>
    </EditorShell>
  );
};
