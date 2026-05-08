import { extractBlockText } from "@/builder/blocks/extract-text";
import { collectStrings } from "@/builder/refs/extract";
import type { BlockEntity } from "@/builder/types/entity";
import type { IntentLogEntry } from "@/builder/types/intent";
import { deleteEntity, upsertEntity } from "@/db/search-index";

// Best-effort post-append search-index maintenance. Mirrors
// syncRefsForIntent — runs after the intent has committed, derives the
// new content directly from the intent payload (no snapshot load), and
// swallows failures so the user-visible save is unaffected.
export function syncSearchForIntent(entry: IntentLogEntry): void {
  try {
    runSync(entry);
  } catch (err) {
    console.warn(
      `[search-sync] failed for plan=${entry.planId} intent=${entry.intent.type}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function runSync(entry: IntentLogEntry): void {
  const intent = entry.intent;
  switch (intent.type) {
    case "INSERT_BLOCK": {
      const block = intent.block;
      upsertEntity(entry.planId, "block", block.id, extractBlockText(block));
      return;
    }
    case "UPDATE_BLOCK": {
      // Only re-index when data was patched. Without an existing
      // snapshot we may not know the kind, so when a kind is included
      // we use the manifest-aware extractor; otherwise fall back to a
      // generic string walker that overshoots harmlessly (FTS just
      // sees a longer document).
      if (intent.patch && "data" in intent.patch && intent.patch.data) {
        const text = intent.patch.kind
          ? extractBlockText({
              id: intent.nodeId,
              kind: intent.patch.kind,
              parentId: "" as BlockEntity["parentId"],
              data: intent.patch.data as Record<string, unknown>,
            })
          : collectStrings(intent.patch.data).join(" ");
        upsertEntity(entry.planId, "block", intent.nodeId, text);
      }
      return;
    }
    case "DELETE_BLOCK":
      deleteEntity(intent.nodeId);
      return;
    case "INSERT_SECTION": {
      const section = intent.section;
      const text = section.title?.trim();
      if (text) upsertEntity(entry.planId, "section", section.id, text);
      return;
    }
    case "UPDATE_SECTION": {
      // Only the title field is text-relevant.
      if (
        intent.patch &&
        "title" in intent.patch &&
        typeof intent.patch.title === "string"
      ) {
        upsertEntity(
          entry.planId,
          "section",
          intent.sectionId,
          intent.patch.title,
        );
      }
      return;
    }
    case "DELETE_SECTION":
      deleteEntity(intent.sectionId);
      return;
    case "UPDATE_PROJECT": {
      // Project meta updates don't carry the full record, but the only
      // text-relevant fields are title/summary; if either is in the
      // patch the row is redrawn from the patch alone.
      const patch = intent.patch ?? {};
      const parts = [patch.title, patch.summary].filter(Boolean) as string[];
      if (parts.length === 0) return;
      const planId = entry.planId;
      upsertEntity(planId, "project", planId, parts.join(" "));
      return;
    }
    case "DELETE_PROJECT":
      // The plan row is cascade-deleted; the AFTER DELETE trigger on
      // `plans` cleans the FTS rows for free. Nothing to do here.
      return;
    default:
      return;
  }
}
