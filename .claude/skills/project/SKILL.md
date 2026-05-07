---
name: plan-k-project
description: Create, list, and delete plan-k projects via the local Next.js API. Use when the user says "list my plans/projects", "make a new web/mobile/agent project", "delete the X project", or otherwise asks to manage the top-level project list in this plan-k workspace. Requires `bun run dev` to be running on localhost (or NEXT_PUBLIC_API_BASE_URL).
---

# plan-k :: project

The plan-k app is a locally-run planning workspace. The user invokes you to operate it.

## Prerequisite

The dev server must be running. Run `curl -fs ${BASE_URL:-http://localhost:3000}/api/projects > /dev/null` before any action; if it fails, tell the user to run `bun run dev` and stop.

`BASE_URL` defaults to `http://localhost:3000` and can be overridden by `NEXT_PUBLIC_API_BASE_URL`.

## Endpoints

```
GET    ${BASE_URL}/api/projects              → ProjectMeta[]
POST   ${BASE_URL}/api/projects              { kind, title, summary? } → ProjectMeta (201)
DELETE ${BASE_URL}/api/projects/:id          → { ok: true } | 404
```

`ProjectMeta = { id, kind: "web"|"mobile"|"agent", title, summary, createdAt, updatedAt }`

## Recipes

### List

```bash
curl -s "${BASE_URL:-http://localhost:3000}/api/projects" | jq '.[] | {id, kind, title}'
```

### Create

```bash
curl -s -X POST "${BASE_URL:-http://localhost:3000}/api/projects" \
  -H 'Content-Type: application/json' \
  -d '{"kind":"web","title":"My new app","summary":"optional one-liner"}' | jq
```

After creation, the response includes `id`. Tell the user the URL: `http://localhost:3000/plan/<id>`.

### Delete

```bash
curl -s -X DELETE "${BASE_URL:-http://localhost:3000}/api/projects/<id>" | jq
```

Confirm with the user before deleting unless they explicitly named the project to remove. Deletion is irreversible — the plan, its intent log, and all sections/blocks are cascade-deleted.

## Validation

`kind` must be one of `web | mobile | agent`. `title` required (non-empty). `summary` optional.

If the user describes a kind ambiguously ("앱 기획서"), pick the closest match and confirm in one short line before creating.
