import { describe, expect, it } from "bun:test";
import type { AppState } from "@/builder/types/state";
import { decideShortcut, type ShortcutEvent } from "./decide-shortcut";

const noEdit = { kind: "none" } as AppState["editing"];
const editingFoo = {
  kind: "node",
  id: "foo",
  origin: "human:test" as const,
  lamport: 1,
  draft: {},
  previousValue: {},
} as AppState["editing"];
const selectionFoo = { kind: "node", id: "foo" } as AppState["selection"];
const noSel = { kind: "none" } as AppState["selection"];

const ev = (overrides: Partial<ShortcutEvent>): ShortcutEvent => ({
  key: "Enter",
  isTyping: false,
  ...overrides,
});

describe("decideShortcut", () => {
  it("Esc cancels edit even while typing", () => {
    const intent = decideShortcut(ev({ key: "Escape", isTyping: true }), {
      editing: editingFoo,
      selection: selectionFoo,
    });
    expect(intent).toEqual({ type: "CANCEL_EDIT" });
  });

  it("⌘Enter commits while editing (typing in textarea)", () => {
    const intent = decideShortcut(
      ev({ key: "Enter", metaKey: true, isTyping: true }),
      { editing: editingFoo, selection: selectionFoo },
    );
    expect(intent).toEqual({ type: "COMMIT_EDIT" });
  });

  it("plain Enter on selected node opens editor", () => {
    const intent = decideShortcut(ev({ key: "Enter" }), {
      editing: noEdit,
      selection: selectionFoo,
    });
    expect(intent).toEqual({ type: "BEGIN_EDIT", nodeId: "foo" });
  });

  it("plain Enter while editing commits", () => {
    const intent = decideShortcut(ev({ key: "Enter" }), {
      editing: editingFoo,
      selection: selectionFoo,
    });
    expect(intent).toEqual({ type: "COMMIT_EDIT" });
  });

  it("Delete on selection removes the block", () => {
    const intent = decideShortcut(ev({ key: "Delete" }), {
      editing: noEdit,
      selection: selectionFoo,
    });
    expect(intent).toEqual({ type: "DELETE_BLOCK", nodeId: "foo" });
  });

  it("Backspace on selection removes the block", () => {
    const intent = decideShortcut(ev({ key: "Backspace" }), {
      editing: noEdit,
      selection: selectionFoo,
    });
    expect(intent).toEqual({ type: "DELETE_BLOCK", nodeId: "foo" });
  });

  it("Delete is suppressed while typing — protects text inputs", () => {
    const intent = decideShortcut(ev({ key: "Delete", isTyping: true }), {
      editing: noEdit,
      selection: selectionFoo,
    });
    expect(intent).toBeNull();
  });

  it("⌘Z undoes outside text inputs", () => {
    const intent = decideShortcut(ev({ key: "z", metaKey: true }), {
      editing: noEdit,
      selection: noSel,
    });
    expect(intent).toEqual({ type: "UNDO" });
  });

  it("⌘⇧Z redoes", () => {
    const intent = decideShortcut(
      ev({ key: "z", metaKey: true, shiftKey: true }),
      { editing: noEdit, selection: noSel },
    );
    expect(intent).toEqual({ type: "REDO" });
  });

  it("⌘Z is suppressed while typing — defers to native input undo", () => {
    const intent = decideShortcut(
      ev({ key: "z", metaKey: true, isTyping: true }),
      { editing: noEdit, selection: noSel },
    );
    expect(intent).toBeNull();
  });

  it("returns null when no selection and not editing", () => {
    expect(
      decideShortcut(ev({ key: "Enter" }), {
        editing: noEdit,
        selection: noSel,
      }),
    ).toBeNull();
    expect(
      decideShortcut(ev({ key: "Delete" }), {
        editing: noEdit,
        selection: noSel,
      }),
    ).toBeNull();
  });
});
