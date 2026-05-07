import { asc, eq } from "drizzle-orm";
import { hydrate } from "@/builder/hydrate";
import type { BlockEntity } from "@/builder/types/entity";
import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";
import { db, intents, plans, projects } from "@/db";

export type SearchHit =
  | {
      kind: "project";
      planId: string;
      projectTitle: string;
      field: "title" | "summary";
      snippet: string;
    }
  | {
      kind: "section";
      planId: string;
      projectTitle: string;
      sectionId: string;
      sectionTitle: string;
      snippet: string;
    }
  | {
      kind: "block";
      planId: string;
      projectTitle: string;
      blockId: string;
      blockKind: string;
      sectionId: string | null;
      snippet: string;
    };

const MAX_HITS = 200;
const SNIPPET_PAD = 40;

export async function searchAcrossPlans(query: string): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const planRows = db.select().from(plans).all();
  const projectRows = db.select().from(projects).all();
  const projectsById = new Map(projectRows.map((p) => [p.id, p]));

  const hits: SearchHit[] = [];

  for (const planRow of planRows) {
    if (hits.length >= MAX_HITS) break;
    const tailRows = db
      .select()
      .from(intents)
      .where(eq(intents.planId, planRow.id))
      .orderBy(asc(intents.serverSeq))
      .all();
    const tail: IntentLogEntry[] = tailRows.map((row) => ({
      id: row.id,
      planId: row.planId,
      lamport: row.lamport,
      origin: row.origin,
      kind: row.kind,
      parentEntryId: row.parentEntryId ?? undefined,
      createdAt: row.createdAt.getTime(),
      intent: JSON.parse(row.intent),
    }));
    const snapshot = JSON.parse(planRow.snapshot) as AppState;
    const state = hydrate(snapshot, tail);

    const projectMeta = projectsById.get(planRow.id);
    const projectTitle =
      projectMeta?.title ?? state.projects[planRow.id]?.title ?? planRow.id;

    if (projectMeta) {
      if (projectMeta.title.toLowerCase().includes(needle)) {
        hits.push({
          kind: "project",
          planId: planRow.id,
          projectTitle,
          field: "title",
          snippet: snippetAround(projectMeta.title, needle),
        });
      }
      if (projectMeta.summary?.toLowerCase().includes(needle)) {
        hits.push({
          kind: "project",
          planId: planRow.id,
          projectTitle,
          field: "summary",
          snippet: snippetAround(projectMeta.summary, needle),
        });
      }
    }

    for (const section of Object.values(state.sections)) {
      if (section.title.toLowerCase().includes(needle)) {
        hits.push({
          kind: "section",
          planId: planRow.id,
          projectTitle,
          sectionId: section.id,
          sectionTitle: section.title,
          snippet: snippetAround(section.title, needle),
        });
        if (hits.length >= MAX_HITS) break;
      }
    }

    for (const block of Object.values(state.blocks)) {
      const text = blockText(block);
      if (!text) continue;
      if (text.toLowerCase().includes(needle)) {
        hits.push({
          kind: "block",
          planId: planRow.id,
          projectTitle,
          blockId: block.id,
          blockKind: block.kind,
          sectionId: ancestorSectionId(state, block.id),
          snippet: snippetAround(text, needle),
        });
        if (hits.length >= MAX_HITS) break;
      }
    }
  }

  return hits;
}

function blockText(block: BlockEntity): string {
  const data = block.data as Record<string, unknown>;
  switch (block.kind) {
    case "text":
      return String(data.markdown ?? "");
    case "header":
      return String(data.text ?? "");
    case "list": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      return items.map((i) => String(i)).join("\n");
    }
    case "hero":
      return [data.title, data.subtitle, data.cta].filter(Boolean).join(" ");
    case "card-grid": {
      const cards = Array.isArray(data.cards) ? (data.cards as unknown[]) : [];
      return cards
        .map((c) => {
          if (c && typeof c === "object") {
            const cc = c as Record<string, unknown>;
            return [cc.title, cc.body, cc.label]
              .filter(Boolean)
              .map(String)
              .join(" ");
          }
          return "";
        })
        .join("\n");
    }
    case "form": {
      const fields = Array.isArray(data.fields)
        ? (data.fields as unknown[])
        : [];
      return fields
        .map((f) => {
          if (f && typeof f === "object") {
            const ff = f as Record<string, unknown>;
            return [ff.label, ff.placeholder]
              .filter(Boolean)
              .map(String)
              .join(" ");
          }
          return "";
        })
        .join("\n");
    }
    case "nav": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      return items
        .map((i) => {
          if (i && typeof i === "object") {
            const ii = i as Record<string, unknown>;
            return String(ii.label ?? "");
          }
          return "";
        })
        .join(" ");
    }
    case "agent-step":
      return [data.role, JSON.stringify(data.spec ?? {})].join(" ");
    default:
      return "";
  }
}

function ancestorSectionId(state: AppState, blockId: string): string | null {
  // Walk the parent chain. Block parents are sections, screens, or other
  // blocks. Stop when we hit a section.
  let current: string = blockId;
  const seen = new Set<string>();
  while (!seen.has(current)) {
    seen.add(current);
    const node: BlockEntity | undefined = state.blocks[current];
    if (!node) return null;
    if (state.sections[node.parentId]) return node.parentId;
    current = node.parentId;
  }
  return null;
}

function snippetAround(text: string, needle: string): string {
  const idx = text.toLowerCase().indexOf(needle);
  if (idx < 0) return text.slice(0, 120);
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(text.length, idx + needle.length + SNIPPET_PAD);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
