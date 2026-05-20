"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";

// Generic editor for kinds that don't have a dedicated editor yet. Surfaces
// the raw `data` JSON; on apply, dispatches the parsed object as the new
// draft via CHANGE_DRAFT.
export const JsonFallbackEditor: BlockRenderer = ({ vm, handlers }) => {
  const dispatch = useBuilderDispatch();
  const [text, setText] = useState(() =>
    JSON.stringify(vm.displayValue ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  // Re-seed when switching to a different block. We intentionally key on
  // vm.id instead of vm.displayValue so live edits don't blow away the
  // textarea on every keystroke.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed on id change
  useEffect(() => {
    setText(JSON.stringify(vm.displayValue ?? {}, null, 2));
    setError(null);
  }, [vm.id]);

  const onChange = (value: string) => {
    setText(value);
    try {
      const parsed = JSON.parse(value);
      setError(null);
      dispatch({ type: "CHANGE_DRAFT", value: parsed });
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
          No dedicated editor for this kind. Edit the raw data.
        </div>
      )}
    </EditorShell>
  );
};
