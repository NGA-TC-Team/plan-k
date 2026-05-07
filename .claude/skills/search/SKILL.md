---
name: plan-k-search
description: Find sections, blocks, and project metadata across all plan-k plans by keyword. Use when the user asks "find the section about personas", "where did I write about pricing", "search for X across my plans", or "which plan has the hero with that title". Returns a flat list of hits with planId, target id, and a short snippet — pick the most relevant or surface a short list back to the user.
---

# plan-k :: search

Substring search (case-insensitive) over all stored plans. Currently iterates plans in the app server — fine for a local workspace; FTS5 may replace it later.

## Prerequisite

Dev server running. `BASE_URL` defaults to `http://localhost:3000`.

## Endpoint

```
GET ${BASE_URL}/api/search?q=<query>     → { query, hits: SearchHit[] }
```

`SearchHit` is one of:

```ts
{ kind: "project", planId, projectTitle, field: "title"|"summary", snippet }
{ kind: "section", planId, projectTitle, sectionId, sectionTitle, snippet }
{ kind: "block",   planId, projectTitle, blockId, blockKind, sectionId|null, snippet }
```

Empty query returns empty hits (no error).

## Recipe

```bash
curl -fs "${BASE_URL:-http://localhost:3000}/api/search?q=$(jq -rn --arg q "personas" '$q|@uri')" \
  | jq '.hits | group_by(.kind) | map({k: .[0].kind, n: length, samples: [.[0:3][]]})'
```

## How to surface results

- 1 hit → answer with the target's URL: `http://localhost:3000/plan/<planId>` (use `plan-k-plan` to fetch detail if user wants more).
- 2–10 hits → short bullet list: `kind • plan title • snippet`.
- >10 hits → tell the user the count and ask whether to narrow by kind (project / section / block) or by plan.

If the search returns nothing, suggest the user try shorter / less specific keywords. Don't fall back to silently calling `plan-k-plan` on every plan — that defeats the purpose.

## Limits

- Max 200 hits per response (server-capped).
- Snippet is ±40 chars around the match.
- Only stored content is searched. Drafts that haven't been committed via an intent yet are invisible.
