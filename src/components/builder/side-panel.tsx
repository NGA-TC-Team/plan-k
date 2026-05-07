"use client";

import { projectBlock } from "@/builder/projection";
import { useBlock } from "@/hooks/builder/use-block.hook";
import {
  useBuilderState,
  useBuilderStateShallow,
} from "@/hooks/builder/use-builder-store.hook";
import { editorRenderers } from "./renderers/editors";

export function SidePanel() {
  const editingId = useBuilderState((s) =>
    s.state.editing.kind === "node" ? s.state.editing.id : null,
  );
  const selectionId = useBuilderState((s) =>
    s.state.selection.kind === "node" ? s.state.selection.id : null,
  );

  if (editingId) {
    return (
      <aside className="border-l p-3 text-sm">
        <EditorPane key={editingId} blockId={editingId} />
      </aside>
    );
  }

  if (selectionId) {
    return (
      <aside className="border-l p-3 text-sm">
        <SelectionPane blockId={selectionId} />
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col items-center justify-center border-l p-6 text-center text-xs text-muted-foreground">
      <div className="font-medium">Select a block</div>
      <div className="mt-1">Click to select · Double-click to edit</div>
    </aside>
  );
}

function EditorPane({ blockId }: { blockId: string }) {
  const { vm, handlers } = useBlock(blockId);
  if (!vm) return <FallbackMessage>Block missing</FallbackMessage>;
  const Editor = editorRenderers[vm.kind];
  if (!Editor) {
    return (
      <FallbackMessage>
        No editor registered for &lt;{vm.kind}&gt;
      </FallbackMessage>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <Editor vm={vm} handlers={handlers} />
    </div>
  );
}

function SelectionPane({ blockId }: { blockId: string }) {
  const vm = useBuilderStateShallow((s) => projectBlock(s.state, blockId));
  const handlers = useBlock(blockId).handlers;
  if (!vm) return <FallbackMessage>Block missing</FallbackMessage>;
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Selected · {vm.kind}
      </div>
      <div className="rounded border p-2 text-xs">
        <div>
          id: <code>{vm.id}</code>
        </div>
        <div>
          parent: <code>{vm.parentId}</code>
        </div>
        {vm.isPending ? (
          <div className="mt-1 text-amber-600">pending sync</div>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-accent"
          onClick={handlers.onBeginEdit}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          onClick={handlers.onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function FallbackMessage({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}
