---
name: plan-k-chat
description: In-app chat context bridge. Use this skill ONLY when the assistant is being driven by the plan-k right-panel chat (env var PLAN_K_SESSION_ID is set). Provides session metadata, mention resolution, attachment paths, and approval-mode staging for IntentLogEntry records. Triggers automatically from system prompts injected by the chat runner — humans should not invoke it directly.
---

# plan-k :: chat

This skill is a thin facade over local Next.js endpoints. It only makes sense inside the chat subprocess spawned by `src/services/third-party-facade/claude-runner.ts`. Outside that context, prefer the dedicated skills (`plan-k-plan`, `plan-k-block`, `plan-k-section`, `plan-k-project`, `plan-k-search`, `plan-k-export`).

## Environment hand-off

The runner exports these env vars before spawn — read them via `printenv` if needed:

| Var | Meaning |
|---|---|
| `PLAN_K_SESSION_ID` | Active chat session id (`cs_…`) |
| `PLAN_K_PLAN_ID` | The plan this session is bound to |
| `PLAN_K_MESSAGE_ID` | Assistant message id this turn writes into |
| `PLAN_K_RUN_ID` | Unique run id (for logs) |
| `PLAN_K_APPROVAL_MODE` | `"1"` ⇒ stage intents instead of applying |
| `PLAN_K_INTERNAL_BASE_URL` | Base URL of the local Next dev server |

Refer to these in every command — never hardcode values.

## Endpoints

```
BASE="$PLAN_K_INTERNAL_BASE_URL"
SID="$PLAN_K_SESSION_ID"
MID="$PLAN_K_MESSAGE_ID"
```

### 1. `get_session` — full session snapshot

```bash
curl -fsS "$BASE/api/chat/sessions/$SID"
```

Returns `{ session, messages, attachments, staged }`. Use this when you need
to look up the absolute path of an attachment so a `Read` tool call can
open it: each attachment row exposes `storagePath` (relative to the repo
root) — the file is at `<cwd>/local-uploads/<sessionId>/<storagePath>`.

### 2. `resolve_mentions` — turn `@block:abc` chips into snapshots

The system prompt lists tagged blocks/sections/screens. To pull their
current contents without re-reading the whole plan, call
`plan-k-plan` once and filter — the plan response already includes
everything; this skill is a hint, not a separate endpoint.

Always call `plan-k-plan` first for fresh `lamport` values **before any mutation**.

### 3. `stage_intent` — APPROVAL MODE ONLY

When `PLAN_K_APPROVAL_MODE=1`, **do not POST to `/api/intents`**. Instead,
build the IntentLogEntry exactly as `plan-k-block` / `plan-k-section`
describe, then POST it here:

```bash
curl -fsS -X POST \
  "$BASE/api/chat/sessions/$SID/staging?messageId=$MID" \
  -H "Content-Type: application/json" \
  -d '<IntentLogEntry JSON>'
```

The response is `{ ok: true, stagedId }`. The user reviews the staged
diff in the side-panel and taps Apply (forwards to `/api/intents`) or
Reject (drops). You should NOT poll the result — emit your reasoning,
stop, and let the human resolve.

### 4. `record_assistant_note` — surface progress steps

Long mutations benefit from a visible "step" log. Append a tool message
(role `tool`) directly to the session by POSTing to:

```bash
curl -fsS -X POST \
  "$BASE/api/chat/sessions/$SID/notes" \
  -H "Content-Type: application/json" \
  -d '{"text":"updated 3 hero blocks"}'
```

(Optional — only when the user benefits from a checkpoint.)

## Mutation policy summary

| Mode | Mutation skill calls hit … |
|---|---|
| `auto` (default) | `${BASE}/api/intents` — applies + broadcasts via SSE |
| `approval` | `${BASE}/api/chat/sessions/$SID/staging?messageId=$MID` — stages, awaits human |

If you mistakenly POST to `/api/intents` in approval mode, the change is
applied immediately and bypasses review. Always check
`echo $PLAN_K_APPROVAL_MODE` before the first mutation in the turn.

## What this skill does NOT do

- It does not read or write files outside `local-uploads/`. Use the standard `Read` tool with the absolute attachment path returned by `get_session`.
- It does not search across plans. Use `plan-k-search` for that.
- It does not export. Use `plan-k-export` for PDF/PNG.
