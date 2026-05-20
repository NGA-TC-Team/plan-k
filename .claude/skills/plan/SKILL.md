---
name: plan-k-plan
description: Read a plan-k plan's current snapshot — projects, plans, screens, sections, blocks — to answer questions about its structure or to gather context before mutating it. Use when the user says "show me what's in plan X", "what sections does the demo-web plan have", or "before you change Y, look at the current state". Also use as a prerequisite step for any section/block edit.
---

# plan-k :: plan

Reads the current state of a plan. Always do this before mutating with the `section` or `block` skills — mutations need to know the current `lamport`, `entityMeta`, and target IDs.

## Prerequisite

Dev server running. `BASE_URL` defaults to `http://localhost:3000`.

## Endpoint

```
GET ${BASE_URL}/api/plans/:id     → { snapshot: AppState, tailEntries: IntentLogEntry[] }
```

Demo plan IDs (auto-seeded on first read): `demo-web`, `demo-mobile`, `demo-agent`. Real project IDs are uuids returned by `POST /api/projects`.

## Snapshot shape (essentials)

```ts
type AppState = {
  projects: Record<id, { id, kind, title, summary, createdAt, updatedAt }>;
  plans:    Record<id, { id, projectId, kind, meta, agentTab }>;
  screens:  Record<id, { id, planId, title }>;
  sections: Record<id, { id, planId, parentId: string|null, kind, title }>;
  blocks:   Record<id, { id, parentId, type, data }>;
  docsRootIds: string[];                 // top-level section order
  children: Record<parentId, string[]>;  // ordered child IDs (sections + blocks)
  entityMeta: Record<id, { lamport, origin }>;
  // …others for selection, undo history, etc.
};
```

**Important**: `snapshot` is a seed *checkpoint*, not the live state. Recent edits live in `tailEntries[]` until a future checkpoint roll-up. To answer "what does this plan currently look like?", you must consider both.

Quick check for a freshly-inserted section:

```bash
curl -fs "$BASE_URL/api/plans/$ID" \
  | jq --arg sec "$NEW_ID" '
      (.snapshot.sections[$sec]) //
      (.tailEntries[] | select(.intent.type=="INSERT_SECTION" and .intent.section.id==$sec) | .intent.section)
    '
```

## Recipes

### Summarize a plan

```bash
ID=demo-web
curl -s "${BASE_URL:-http://localhost:3000}/api/plans/$ID" \
  | jq '{
      title: (.snapshot.projects | to_entries | .[0].value.title // .snapshot.plans | to_entries | .[0].value.id),
      kind:  (.snapshot.plans | to_entries | .[0].value.kind),
      sections: [.snapshot.docsRootIds[] | . as $id | {id: ., title: .snapshot.sections[$id].title}],
      screens:  (.snapshot.screens | to_entries | map({id: .key, title: .value.title}))
    }'
```

(Or just dump key counts and let the user ask for details.)

### Find a section by title

```bash
curl -s "${BASE_URL:-http://localhost:3000}/api/plans/$ID" \
  | jq --arg t "personas" '.snapshot.sections | to_entries | map(select(.value.title|test($t;"i"))) | .[].value'
```

### Get the current `lamport` for a target entity

Required when constructing UPDATE intents:

```bash
curl -s "${BASE_URL:-http://localhost:3000}/api/plans/$ID" \
  | jq --arg id "$TARGET_ID" '.snapshot.entityMeta[$id]'
# → {"lamport": N, "origin": "..."}    new entry must have lamport > N
```

If `null`, the entity has no prior meta — start with lamport `1`.

## Block taxonomy (after the docs/app/agent split)

Each block carries a `context` ("docs" | "app" | "agent") inferred from its parent. The full kind set lives in `BLOCK_KIND_REGISTRY` (server source). Summary:

- **docs** (under a non-`agent-*` section, document-writing primitives — distinct names from app): heading, paragraph, bullet-list, numbered-list, checklist, callout, code-block, blockquote, table, figure, rule, link-card, definition, decision, persona, user-story, risk, metric, canvas.
- **app** (under a screen, UI mockup primitives): page-header, hero, cta-section, card-grid, form, button, input, image, text, list, sidebar, footer, tabs, modal, banner, stat, avatar, badge, divider, empty-state, nav. Mobile-only on `kind: "mobile"` plans: status-bar, bottom-nav, list-row, fab, sheet.
- **agent** (under an `agent-*` section, e.g. `agent-examples`): agent-step.

Real renderers exist for: docs paragraph/heading/bullet-list/numbered-list/persona/canvas, app text/list/hero/card-grid/form/nav, agent agent-step. Other kinds render as labeled stubs.

## When to use this skill vs others

- Pure reading / Q&A → this skill alone.
- Going to mutate something next → call this first to learn IDs and lamport, then hand off to `section` / `block`.
