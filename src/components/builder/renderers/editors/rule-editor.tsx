"use client";

import type { BlockRenderer } from "../types";
import { EditorShell } from "./editor-shell";
import { useBlockForm } from "./use-block-form";

export const RuleEditor: BlockRenderer = ({ vm, handlers }) => {
  // Rule has no editable properties — the form exists only so the standard
  // commit/cancel flow still applies.
  const { handleSubmit } = useBlockForm<Record<string, never>>("rule", vm);
  return (
    <EditorShell
      title="Horizontal rule"
      isPending={vm.isPending}
      onSubmit={handleSubmit(() => handlers.onCommitEdit())}
      onCancel={handlers.onCancelEdit}
    >
      <p className="text-xs text-muted-foreground">
        Horizontal rule. Delete to remove.
      </p>
    </EditorShell>
  );
};
