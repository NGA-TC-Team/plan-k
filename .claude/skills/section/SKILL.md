---
name: plan-k-section
description: Insert, rename, move, or delete docs sections in a plan-k plan by constructing IntentLogEntry records and POSTing them to /api/intents. Use when the user says things like "add a personas section to plan X", "rename the goals section to Vision", "delete the risks section", or "move the API section under the tech parent". Always call the `plan-k-plan` skill first to get the current `lamport`, `parentId`, and target IDs.
---

# plan-k :: section

Mutates docs sections by appending IntentLogEntry records to the plan's intent log. The server applies the entry, broadcasts it via SSE, and any open builder tab updates immediately.

## Prerequisite

1. Dev server running.
2. Read the plan first via the `plan-k-plan` skill — you need the `planId`, the current `entityMeta` for any target section, and the existing `docsRootIds` order.

## Endpoint

```
POST ${BASE_URL}/api/intents     body: IntentLogEntry → { ok: true, serverVersion } | { ok: false, reason }
```

## IntentLogEntry shape

```ts
{
  id:        uuid,            // crypto.randomUUID() — must be unique per plan
  planId:    string,
  origin:    string,          // free-form, e.g. "claude:section"
  lamport:   number,          // > existing entityMeta[targetId].lamport for UPDATE/MOVE
  intent:    Intent,          // see below
  createdAt: ms-since-epoch,
  kind:      "primary",       // always "primary" when proposing a new mutation
}
```

## Section intents

```ts
// Create a new section (root or child)
{ type: "INSERT_SECTION", section: { id, planId, parentId: null|<parentId>, kind, title }, index?: number }

// Rename / change kind
{ type: "UPDATE_SECTION", sectionId, patch: { title?, kind? } }

// Move within siblings or to a new parent
{ type: "MOVE_SECTION", sectionId, toParentId: null|<parentId>, index: number }

// Delete (cascades to children + blocks within)
{ type: "DELETE_SECTION", sectionId }
```

`SectionKind` (pick the closest match, fall back to `"custom"`):

```
overview personas glossary policy policy-general policy-special
policy-writing policy-error business ops tech api data risks metrics
agent-persona agent-tools agent-memory agent-trigger agent-examples
agent-failure platform native-modules permissions custom
```

## Lamport rules

- For `INSERT_SECTION` with a brand-new id: any positive lamport works; convention is `Date.now()` or "max(existing lamports)+1".
- For `UPDATE_SECTION`, `MOVE_SECTION`, `DELETE_SECTION`: lamport MUST be strictly greater than `entityMeta[sectionId].lamport`. Get it from the plan snapshot first, then add `1`. If the section was created by a recent intent and not yet checkpointed, its `entityMeta` lives in `tailEntries`, not `snapshot.entityMeta` — fall back to scanning both.

If the server returns `{ ok: false, reason: "STALE_LAMPORT" }`, re-read the plan and retry with a higher lamport.

## Recipe — insert a new root section

```bash
PLAN_ID=demo-web
NEW_ID=$(uuidgen)
ENTRY_ID=$(uuidgen)
NOW=$(date +%s%3N)

curl -s -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$ENTRY_ID" --arg plan "$PLAN_ID" --arg sec "$NEW_ID" \
    --argjson now "$NOW" \
    '{
      id: $id, planId: $plan, origin: "claude:section",
      lamport: $now, createdAt: $now, kind: "primary",
      intent: {
        type: "INSERT_SECTION",
        section: { id: $sec, planId: $plan, parentId: null, kind: "personas", title: "Personas" }
      }
    }')"
```

## Recipe — rename a section

```bash
PLAN_ID=demo-web
SECTION_ID=<from snapshot>
LAMPORT=$(curl -s "${BASE_URL}/api/plans/$PLAN_ID" \
  | jq --arg id "$SECTION_ID" '.snapshot.entityMeta[$id].lamport // 0')
NEXT=$((LAMPORT + 1))

curl -s -X POST "${BASE_URL:-http://localhost:3000}/api/intents" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n \
    --arg id "$(uuidgen)" --arg plan "$PLAN_ID" --arg sec "$SECTION_ID" \
    --argjson lamp "$NEXT" --argjson now "$(date +%s%3N)" \
    '{
      id: $id, planId: $plan, origin: "claude:section",
      lamport: $lamp, createdAt: $now, kind: "primary",
      intent: { type: "UPDATE_SECTION", sectionId: $sec, patch: { title: "Vision" } }
    }')"
```

## Failure modes

| reason | meaning | response |
|---|---|---|
| `PLAN_NOT_FOUND` | wrong planId | re-list with `project` skill |
| `DUPLICATE_ENTRY` | reused entry `id` | regenerate uuid + retry |
| `STALE_LAMPORT` | snapshot was updated by someone else | re-read plan, bump lamport, retry |
| `NOT_FOUND` | sectionId doesn't exist | re-read plan |

## What this skill does NOT do

- It does not edit blocks within a section. Sections **do** accept blocks as children — use the `plan-k-block` skill. A docs block (`text`/`header`/`list`/...) goes under a non-`agent-*` section; an agent block (`agent-step`) goes under an `agent-*` section.
- It does not create new screens — that's the screens path (not yet exposed as a skill).
- It does not delete a project — use the `project` skill.
