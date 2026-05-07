import type { Command, Intent, IntentLogEntry } from "./types/intent";

export type SideEffects = {
  persistIntent?: (entry: IntentLogEntry) => void;
  emitToast?: (level: "info" | "warn" | "error", message: string) => void;
  focusNode?: (nodeId: string) => void;
};

export type RunnerDeps = SideEffects & {
  dispatch: (intent: Intent) => void;
};

export function runCommand(command: Command, deps: RunnerDeps): void {
  switch (command.type) {
    case "DISPATCH_INTENT":
      deps.dispatch(command.intent);
      return;
    case "PERSIST_INTENT":
      deps.persistIntent?.(command.entry);
      return;
    case "EMIT_TOAST":
      deps.emitToast?.(command.level, command.message);
      return;
    case "FOCUS_NODE":
      deps.focusNode?.(command.nodeId);
      return;
  }
}
