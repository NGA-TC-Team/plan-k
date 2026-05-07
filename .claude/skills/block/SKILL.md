---
name: plan-k-block
description: Insert, update, move, or delete content blocks (text, list, header, hero, card-grid, form, nav, agent-step) within a plan-k section or screen by constructing IntentLogEntry records and POSTing them to /api/intents. Use when the user says "add a hero block to the homepage", "rewrite the markdown in the overview text block", "make the personas list have these 3 items", or "delete the second card-grid". Always call the `plan-k-plan` skill first to learn the parent's id and the block's existing `lamport`.
---

# plan-k :: block

Mutates blocks — the leaf content units inside sections and screens. Operates by appending IntentLogEntry records to the plan's intent log; the server applies, persists, and broadcasts via SSE.

## Prerequisite

1. Dev server running.
2. Read the plan via the `plan-k-plan` skill — you need the `planId`, the `parentId` (a section, screen, or another block id), and any target block's existing `lamport`.

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

`BlockEntity = { id, parentId, kind, data }`.

## Block kinds + default data shape

| `kind` | `data` shape | use for |
|---|---|---|
| `text` | `{ markdown: string }` | freeform paragraph / markdown body |
| `header` | `{ level: 1\|2\|3, text: string }` | section header inside a section |
| `list` | `{ ordered: boolean, items: string[] }` | bullet / numbered list |
| `hero` | `{ title, subtitle?, cta? }` | landing-style hero |
| `card-grid` | `{ columns: number, cards: CardSpec[] }` | feature grid |
| `form` | `{ fields: FieldSpec[] }` | form mockup |
| `nav` | `{ items: NavItem[] }` | nav bar items |
| `agent-step` | `{ role: "input"\|"tool"\|"llm"\|"output", spec: object }` | agent scenario step |

When in doubt, prefer `text` with markdown — it renders cleanly in both detail and wireframe modes and exports well to PDF.

## Lamport rules

Same as the `plan-k-section` skill:

- New `INSERT_BLOCK`: any positive lamport (use `Date.now()`).
- `UPDATE_BLOCK` / `MOVE_BLOCK` / `DELETE_BLOCK`: lamport must be `> entityMeta[blockId].lamport`. Read it from the plan first; if absent in `snapshot.entityMeta`, scan `tailEntries` for the most recent intent that touched it.
- On `STALE_LAMPORT`, re-read and retry.

## Recipe — insert a text block under a section

```bash
PLAN_ID=demo-web
PARENT_ID=<section or screen id from `plan-k-plan`>
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
        type: "INSERT_BLOCK",
        parentId: $parent,
        block: { id: $block, parentId: $parent, kind: "text", data: { markdown: "## Personas\n\n30대 직장인…" } }
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
NEW_TEXT="새 본문 내용…"

curl -fs -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$(uuidgen)" --arg plan "$PLAN_ID" --arg blk "$BLOCK_ID" \
    --arg md "$NEW_TEXT" --argjson lamp "$NEXT" --argjson now "$(date +%s000)" \
    '{
      id: $id, planId: $plan, origin: "claude:block",
      lamport: $lamp, createdAt: $now, kind: "primary",
      intent: { type: "UPDATE_BLOCK", nodeId: $blk, patch: { data: { markdown: $md } } }
    }')" | jq
```

`UPDATE_BLOCK` replaces `data` entirely — preserve fields you don't intend to change by reading the existing block first and merging.

## Recipe — fill a list block with N items

```bash
items=$(printf '"%s",' "30대 직장인" "스타트업 PM" "프리랜서 개발자")
items="[${items%,}]"

curl -fs -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --argjson items "$items" \
    --arg id "$(uuidgen)" --arg plan "demo-web" --arg blk "$BLOCK_ID" \
    --argjson lamp "$NEXT" --argjson now "$(date +%s000)" \
    '{
      id: $id, planId: $plan, origin: "claude:block",
      lamport: $lamp, createdAt: $now, kind: "primary",
      intent: {
        type: "UPDATE_BLOCK", nodeId: $blk,
        patch: { data: { ordered: false, items: $items } }
      }
    }')" | jq
```

## Failure modes

| reason | meaning | response |
|---|---|---|
| `PLAN_NOT_FOUND` | wrong planId | re-list with `project` skill |
| `DUPLICATE_ENTRY` | reused entry `id` | regenerate uuid + retry |
| `STALE_LAMPORT` | snapshot outdated | re-read plan, bump lamport, retry |
| `NOT_FOUND` | blockId or parentId doesn't exist | re-read plan |

## What this skill does NOT do

- It does not edit section structure (titles, hierarchy) — use `plan-k-section`.
- It does not handle agent graph nodes/edges — those have their own intent types (`INSERT_AGENT_NODE`, etc.) and aren't a skill yet.
- It does not export — use `plan-k-export` after editing.
