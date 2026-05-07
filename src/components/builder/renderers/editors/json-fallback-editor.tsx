"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useDraftSync } from "@/hooks/builder/use-draft-sync.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

// Generic editor for kinds that don't have a dedicated editor yet. Surfaces
// the raw `data` JSON; on apply, dispatches the parsed object as the new
// data via the standard draft-sync path.
export const JsonFallbackEditor: BlockRenderer = ({ vm, handlers }) => {
  const initial = JSON.stringify(vm.displayValue ?? {}, null, 2);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  // Build a watch-shaped function that returns the current parsed object,
  // matching useDraftSync's contract for react-hook-form's watch().
  const watch = ((): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return vm.displayValue ?? {};
    }
  }) as Parameters<typeof useDraftSync>[0];
  useDraftSync(watch);

  const onChange = (value: string) => {
    setText(value);
    try {
      JSON.parse(value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <EditorShell
      title={`${vm.kind} · JSON`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) handlers.onCommitEdit();
      }}
      onCancel={handlers.onCancelEdit}
    >
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        spellCheck={false}
        className="font-mono text-xs"
      />
      {error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        <div className="text-xs text-muted-foreground">
          No dedicated editor for this kind yet — edit the raw data.
        </div>
      )}
    </EditorShell>
  );
};
