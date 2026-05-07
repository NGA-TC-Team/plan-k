---
name: plan-k-export
description: Export a plan-k plan to PDF or PNG via the local Puppeteer-backed export API. Use when the user says "export plan X to PDF", "save the demo-web plan as a PNG", "give me a PDF of the personas section", or otherwise wants a printable artifact. Supports full-plan and section-scoped output.
---

# plan-k :: export

Calls the local export API, which renders `/plan/[id]/print` in a headless Chromium and streams back a PDF or PNG.

## Prerequisite

Dev server running. `BASE_URL` defaults to `http://localhost:3000`.

## Endpoints

```
GET ${BASE_URL}/api/exports/pdf?planId=<id>[&sectionId=<id>]   → application/pdf
GET ${BASE_URL}/api/exports/png?planId=<id>[&sectionId=<id>]   → image/png
```

`sectionId` (optional) scopes the output to a single section + its descendants. Get IDs from the `plan-k-plan` skill first if the user names a section by title.

## Recipe — full plan to PDF

```bash
PLAN_ID=demo-web
OUT="${PLAN_ID}.pdf"
curl -fsSL "${BASE_URL:-http://localhost:3000}/api/exports/pdf?planId=${PLAN_ID}" -o "$OUT"
ls -la "$OUT"
```

Tell the user the saved path. Default save location: current working directory unless they specified one.

## Recipe — section to PNG

```bash
PLAN_ID=demo-web
SECTION_ID=<from `plan-k-plan` snapshot>
curl -fsSL "${BASE_URL:-http://localhost:3000}/api/exports/png?planId=${PLAN_ID}&sectionId=${SECTION_ID}" \
  -o "${PLAN_ID}-${SECTION_ID}.png"
```

## Notes

- Each call boots / reuses a single shared Puppeteer browser process server-side. The first export after server restart is slower (~1–2s extra) for warm-up.
- The exported file's filename slug is computed server-side and embedded as `Content-Disposition`. If you want to honor it, use `curl -OJ` instead of `-o`.
- If the user wants both PDF + PNG, fire both in parallel — they're independent.
