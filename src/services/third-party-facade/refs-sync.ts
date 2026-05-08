import type { IntentLogEntry } from "@/builder/types/intent";
import { deleteOutgoingRefs, syncRefsForBlock } from "./refs-store";

// Best-effort post-append refs maintenance. Runs after appendIntent has
// committed so failures never block the user-visible save. The intent
// payload carries the new block.data directly, so we don't need to load
// the snapshot — this avoids the hydration tax described in the design
// note (§3-5 D).
export function syncRefsForIntent(entry: IntentLogEntry): void {
  try {
    runSync(entry);
  } catch (err) {
    console.warn(
      `[refs-sync] failed for plan=${entry.planId} intent=${entry.intent.type}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function runSync(entry: IntentLogEntry): void {
  const intent = entry.intent;
  switch (intent.type) {
    case "INSERT_BLOCK": {
      const block = intent.block;
      syncRefsForBlock(entry.planId, block.id, block.data);
      return;
    }
    case "UPDATE_BLOCK": {
      // patch may or may not include data. Without it the ref set can't
      // have changed (we only parse data). Skip.
      if (intent.patch && "data" in intent.patch && intent.patch.data) {
        syncRefsForBlock(entry.planId, intent.nodeId, intent.patch.data);
      }
      return;
    }
    case "DELETE_BLOCK": {
      deleteOutgoingRefs(entry.planId, intent.nodeId);
      return;
    }
    default:
      return;
  }
}
