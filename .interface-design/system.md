# plan-k design system

## Intent

- **Who**: a single planner (the repo owner) drafting app plans/specs locally and exporting to PDF/PNG.
- **What they do**: write, structure, and review plans on a drafting table — not present them to an audience.
- **Feel**: terminal/CAD. Cold, precise, quiet. Closer to a drafting console than a dashboard. Calm focus, not trading-floor speed.

## Direction

- World: drafting console + blueprint paper. Graphite ink on cool paper.
- Signature: **graphite structure + blueprint-cyan signal**. Structure is monochrome; cyan only appears where the system needs to *say something* (focus ring, active chart series, AI-active canvas glow).
- Rejected defaults:
  - shadcn neutral pure-gray → cool graphite (hue 235, low chroma)
  - dashboardy blue everywhere → cyan reserved for ring/active only
  - sidebar in a different color → sidebar = canvas, divided by a single border line
  - layered card shadows → borders-only, elevation by lightness shift

## Tokens

All tokens live in `src/app/globals.css`. Read that file for exact values — this doc records *intent*, not duplicates.

- **Hue policy**: structural tokens use hue **235** (cool graphite). Signal tokens (`--ring`, `--chart-1`, dark `--sidebar-primary`) use hue **220** (blueprint cyan). Destructive uses hue **25** (muted brick), low chroma in light, slightly higher in dark.
- **Chroma policy**: structural chroma stays ≤ 0.014. Cyan signal chroma 0.135 (light) / 0.15 (dark). No high-chroma colors anywhere else.
- **Lightness ladder (light)**: bg 0.985 → secondary/muted 0.955 → accent 0.945 → border 0.895. Card stays at 1.0 (paper on table). Step ≈ 0.03–0.05.
- **Lightness ladder (dark)**: bg 0.155 → card 0.198 → popover 0.220 → muted 0.235 → secondary/accent 0.255. Step ≈ 0.03–0.04.
- **Foreground hierarchy**: foreground (primary text) → muted-foreground (secondary/metadata). Tertiary/muted is expressed by reducing opacity at call site (`text-muted-foreground/70`).

## Depth

- Strategy: **borders-only**. The sole exception is `--popover` which sits one lightness step above its parent — *no* drop shadow.
- Ring shadows (`0 0 0 1px`) allowed for focus.
- The canvas AI-active glow is the only ambient effect, and it uses `--ring` (cyan) so it reads as a signal, not as elevation.

## Spacing

- Base unit: **4px** (Tailwind default scale). Don't introduce off-grid pixel values. Common steps: 4 / 8 / 12 / 16 / 24 / 32.

## Radius

- `--radius: 0.375rem` (6px). Sharper than shadcn default — drafting console, not consumer app. The Tailwind `radius-*` tokens scale off this.

## Typography

- Sans (Geist Sans) for body and headings. Headings use tighter tracking and heavier weight, never a different family.
- Mono (Geist Mono) with `tabular-nums` for any numeric data, ID, lamport, timestamp, or aligned column. If a value would ever sit in a column or be compared to another value, it's mono.
- Four text levels: foreground / muted-foreground / opacity-reduced muted / disabled (uses `--input` border + `--muted-foreground/60`).

## Surfaces

- Sidebar shares background with canvas; separation comes from a single `--sidebar-border` line, never a different color.
- Inputs are **darker** than their surrounding surface (inset feel) — use `--input` border + `bg-muted` if needed, not a lighter fill.
- Popover is the one surface that elevates (one lightness step up) — that's how it's findable without a shadow.

## Color use rules

- Cyan ring/accent: focus state, active selection, primary chart series, AI-active canvas glow. **Nowhere else.**
- Destructive: only on destructive actions (delete, irreversible). Never as a "warning" tint.
- Charts: default to graphite progression (chart-2 through chart-5). Use chart-1 (cyan) only for the *highlighted* series. If everything is highlighted, nothing is.

## Patterns to apply

When building new components, follow this order:

1. State the intent block (who/what/feel) before writing CSS.
2. Pick tokens, never raw hex.
3. Default to border separation. Reach for popover elevation only when the surface is actually floating over another.
4. If you reach for cyan, ask whether it's a signal. If not, use graphite.
5. Run the squint test: blur the screen — hierarchy should still read; nothing should jump out.

## Extracted patterns (scanned 2026-05-08, src/components)

These are observed from current code, not aspirations. Reuse them; if you find yourself reaching outside this list, it's a new pattern — capture it here.

- **Spacing scale in use**: `1 / 2 / 3 / 6` (4 / 8 / 12 / 24 px). Use `1`–`2` for control-strip density (icons, chips, chat composer), `3` for card/list internal padding, `6` for builder-page outer padding. Base 4px grid is clean — no off-grid pixel values found.
- **Gap scale**: `gap-1` and `gap-2` dominate. Default to `gap-1` for tight control rows, `gap-2` for label+control pairs.
- **Section rhythm**: `space-y-1 / 2 / 3` for inside-card stacks; `space-y-6` reserved for top-level print sections.
- **Depth ratio**: 337 borders vs 43 shadows in current code. Borders-only direction is already the de-facto state — keep it. Shadow occurrences come from shadcn primitives (`shadow-sm`/`shadow-xs`) and should not be added by hand.
- **Control height**: `h-8` (32px) is the de-facto default in this codebase, *not* shadcn's 36px. Button uses `h-7 / h-8 / h-9` ladder; keep 32px as the standard control height for inputs, selects, triggers, and chips. Use `h-7` (28px) only inside dense builder strips.
- **Type density**: `text-xs` and `text-sm` are the working sizes for app chrome body, controls, lists, side panels. `text-base` and above are allowed for **page-level h1/h2** (route entry points like `app/page.tsx`, `projects-view.tsx`), builder previews (hero/header renderers), and print views — *not* for inline app chrome.

## Radius ladder (codified)

The codebase mixes bare `rounded` (4px Tailwind raw), `rounded-md` (~4.8px), and `rounded-lg` (6px) at near-identical sizes — invisible difference, real drift. Standardize:

- `rounded-sm` — chips, kbd keys, icon-only badges
- `rounded-md` — **default** for inputs, buttons, controls, cards
- `rounded-lg` — modals, popovers, dialogs, dropdown menus
- `rounded-full` — avatars, dots, status pips only
- **Ban bare `rounded`** going forward — pick `-sm`, `-md`, or `-lg` deliberately. Existing call sites can migrate when touched.

## Scope of these rules

The system rules apply to **plan-k's own UI (app chrome)**: builder shell, top bar, side panel, left rail, chat, projects list, fields, block selection, insert slot, flow canvas, agent graph chrome.

They do **not** apply to:

- `src/components/builder/renderers/**` — these render the user's plan content (hero blocks, badges, banners, decision tables, etc.). Semantic colors (red/amber/emerald/blue/zinc) are intentional content.
- `src/components/builder/frames/**` — browser/mobile skeuomorphic chrome (traffic-light dots, phone bezel, drop-shadow on the device frame). Intentional.
- `src/components/print/print-view.tsx` — print-optimized output. Direct grays acceptable for fidelity (consider tokenizing later, low priority).

When you can't tell whether something is chrome or content: ask "would the user expect this to come out in their PDF/PNG export?" If yes → content (system rules don't apply). If no → chrome (rules apply).

## Selected-state convention

Block selection uses `ring-2 ring-ring ring-offset-2 ring-offset-background` (blueprint cyan). This is the *only* place ring-ring appears as a structural ring — every other ring usage is reserved for focus-visible states from shadcn primitives.

## Pending/in-flight indicator

For "Saving…", "Pending…", or any in-flight chip: `bg-ring/15 text-ring` + a small `bg-ring animate-pulse` dot. Never amber/yellow. Cyan + pulse = "system signal", which is consistent with the canvas AI-active glow.

## Open questions / not yet decided

- Per-component patterns (Button heights, Card padding scale, Input states) — not codified yet. Add when 2+ uses appear.
- Print stylesheet (`@media print`) currently flattens to white/black. Decide later whether exported PDFs should preserve the cool-paper bg or stay pure white for print fidelity.
- Grid backdrop on the canvas (CAD-style faint grid lines) — proposed but not added. Revisit when the canvas surface itself is restyled.
