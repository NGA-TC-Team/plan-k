---
name: plan-k-block
description: Insert, update, move, or delete content blocks inside docs sections, app screens, or agent scenario sections of a plan-k plan by appending IntentLogEntry records to /api/intents. Use when the user says "add a hero block to the homepage screen", "rewrite the markdown in the overview text block", "drop a personas list under the personas section", or "delete the second card-grid". Always call the `plan-k-plan` skill first to learn the parent's id and the block's existing `lamport`.
---

# plan-k :: block

Mutates blocks — the leaf content units inside sections (docs / agent) and screens (app). Operates by appending IntentLogEntry records; the server applies, persists, and broadcasts via SSE.

## Block contexts

Each block lives in exactly one of three contexts. The context is **inferred from the parent at the reducer layer** — you do not supply it in the intent payload (you may, and matching values pass through; mismatched values are rejected with `WRONG_MODE`).

| Context | Parent type | Kinds |
|---|---|---|
| `docs` | a docs section (any non-`agent-*` section kind) | `heading`, `paragraph`, `bullet-list`, `numbered-list`, `checklist`, `callout`, `code-block`, `blockquote`, `table`, `figure`, `rule`, `link-card`, `definition`, `decision`, `persona`, `user-story`, `risk`, `metric` |
| `app` | a screen, or another app block | `page-header`, `hero`, `cta-section`, `card-grid`, `form`, `button`, `input`, `image`, `text`, `list`, `sidebar`, `footer`, `tabs`, `modal`, `banner`, `stat`, `avatar`, `badge`, `divider`, `empty-state`, `nav` (+ mobile-only: `status-bar`, `bottom-nav`, `list-row`, `fab`, `sheet`) |
| `agent` | an `agent-*` section, or another agent block | `agent-step` |

**Docs kinds are document-writing primitives — distinct from app kinds, no name overlap.** Pick the kind that matches the prose role (`paragraph` for a body, `heading` for a title, `callout` for a note box, `decision` for an ADR, etc.).

Cross-context placement is rejected: `app` block under a section → `WRONG_MODE`; `docs` block under a screen → same.

## Prerequisite

1. Dev server running.
2. Read the plan via `plan-k-plan` — you need `planId`, the parent id, and target block's `entityMeta.lamport` for UPDATE/MOVE/DELETE.

## Endpoint

```
POST ${BASE_URL}/api/intents     body: IntentLogEntry → { ok: true, serverVersion } | { ok: false, reason }
```

## Block intents

```ts
{ type: "INSERT_BLOCK", parentId: <sectionId|screenId|blockId>, block: BlockEntity, index?: number }
{ type: "UPDATE_BLOCK", nodeId: <blockId>, patch: Partial<BlockEntity> }   // typically patch.data
{ type: "MOVE_BLOCK",   nodeId: <blockId>, toParentId, index: number }
{ type: "DELETE_BLOCK", nodeId: <blockId> }
```

`BlockEntity = { id, parentId, kind, data, context? }`. The `context` field is stamped by the reducer; you can omit it.

## Common docs data shapes

| `kind` | `data` |
|---|---|
| `heading` | `{ level: 1\|2\|3, text: string }` |
| `paragraph` | `{ markdown: string }` |
| `bullet-list` / `numbered-list` | `{ ordered: boolean, items: string[] }` |
| `checklist` | `{ items: { text: string, checked: boolean }[] }` |
| `callout` | `{ variant: "info"\|"warn"\|"error"\|"success", text: string }` |
| `code-block` | `{ language: string, code: string }` |
| `blockquote` | `{ text: string, cite: string }` |
| `table` | `{ columns: string[], rows: string[][] }` |
| `figure` | `{ src: string, alt: string, caption: string }` |
| `rule` | `{}` |
| `link-card` | `{ url, title, description }` |
| `definition` | `{ term: string, definition: string }` |
| `decision` | `{ question, options[], decision, rationale }` |
| `persona` | `{ name, role, needs[], pains[] }` |
| `user-story` | `{ as, want, soThat, acceptance[] }` |
| `risk` | `{ risk, impact, mitigation, owner }` |
| `metric` | `{ name, target, current, status }` |

## Common app data shapes

| `kind` | `data` |
|---|---|
| `text` | `{ markdown: string }` (display text in a screen) |
| `list` | `{ ordered: boolean, items: string[] }` |
| `hero` | `{ title, subtitle, cta }` |
| `card-grid` | `{ columns: number, cards: CardSpec[] }` |
| `form` | `{ fields: FieldSpec[] }` |
| `nav` | `{ items: NavItem[] }` |
| `button` | `{ label: string, variant: "primary"\|"secondary"\|... }` |

(Real renderers exist for: docs paragraph/heading/bullet-list/numbered-list, app text/list/hero/card-grid/form/nav, agent agent-step. Other kinds render as labeled stubs — fine for plans, exports look basic.)

## Lamport rules

- `INSERT_BLOCK` with a brand-new id: any positive lamport (use `Date.now()`).
- `UPDATE_BLOCK` / `MOVE_BLOCK` / `DELETE_BLOCK`: lamport > `entityMeta[blockId].lamport`. If the block was just created and not yet checkpointed, scan `tailEntries` for the most recent intent that touched it.
- `STALE_LAMPORT` → re-read plan, bump lamport, retry.

## Recipe — insert a docs paragraph block under a section

```bash
PLAN_ID=demo-web
PARENT_ID=$(curl -fs "${BASE_URL:-http://localhost:3000}/api/plans/$PLAN_ID" | jq -r '.snapshot.docsRootIds[0]')
NEW_ID=$(uuidgen)
ENTRY_ID=$(uuidgen)
NOW=$(date +%s000)

curl -fs -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$ENTRY_ID" --arg plan "$PLAN_ID" --arg parent "$PARENT_ID" --arg block "$NEW_ID" \
    --argjson now "$NOW" \
    '{
      id: $id, planId: $plan, origin: "claude:block",
      lamport: $now, createdAt: $now, kind: "primary",
      intent: {
        type: "INSERT_BLOCK", parentId: $parent,
        block: { id: $block, parentId: $parent, kind: "paragraph", data: { markdown: "## Personas\n\n30대 직장인…" } }
      }
    }')" | jq
```

## Recipe — insert an app hero block under a screen

```bash
PLAN_ID=demo-web
SCREEN_ID=$(curl -fs "${BASE_URL:-http://localhost:3000}/api/plans/$PLAN_ID" \
  | jq -r '.snapshot.screens | to_entries | .[0].key')
NEW_ID=$(uuidgen)

curl -fs -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$(uuidgen)" --arg plan "$PLAN_ID" --arg parent "$SCREEN_ID" --arg block "$NEW_ID" \
    --argjson now "$(date +%s000)" \
    '{
      id: $id, planId: $plan, origin: "claude:block",
      lamport: $now, createdAt: $now, kind: "primary",
      intent: {
        type: "INSERT_BLOCK", parentId: $parent,
        block: { id: $block, parentId: $parent, kind: "hero",
                 data: { title: "Welcome", subtitle: "Plan it with Claude", cta: "Get started" } }
      }
    }')" | jq
```

## Recipe — rewrite a text block's markdown

```bash
PLAN_ID=demo-web
BLOCK_ID=<from plan>
LAMPORT=$(curl -fs "${BASE_URL}/api/plans/$PLAN_ID" \
  | jq --arg id "$BLOCK_ID" '.snapshot.entityMeta[$id].lamport // 0')
NEXT=$((LAMPORT + 1))

curl -fs -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$(uuidgen)" --arg plan "$PLAN_ID" --arg blk "$BLOCK_ID" \
    --argjson lamp "$NEXT" --argjson now "$(date +%s000)" \
    '{
      id: $id, planId: $plan, origin: "claude:block",
      lamport: $lamp, createdAt: $now, kind: "primary",
      intent: { type: "UPDATE_BLOCK", nodeId: $blk, patch: { data: { markdown: "새 본문 내용…" } } }
    }')" | jq
```

`UPDATE_BLOCK` replaces `data` entirely — preserve fields you don't intend to change by reading the existing block first and merging.

## Failure modes

| reason | meaning | response |
|---|---|---|
| `PLAN_NOT_FOUND` | wrong planId | re-list with `project` skill |
| `DUPLICATE_ENTRY` | reused entry `id` | regenerate uuid + retry |
| `STALE_LAMPORT` | snapshot outdated | re-read plan, bump lamport, retry |
| `NOT_FOUND` | blockId or parentId doesn't exist | re-read plan |
| `WRONG_MODE` | block context conflicts with parent (e.g. app block under section) | place under a compatible parent |

## What this skill does NOT do

- Section structure (titles, hierarchy) — use `plan-k-section`.
- Agent graph nodes/edges — separate intent set, not yet exposed as a skill.
- Export — use `plan-k-export` after editing.
