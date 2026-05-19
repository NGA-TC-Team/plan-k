---
name: plan-k
description: Local planning workspace for web, mobile, and AI agent specs. Builder UI for a single craftsperson working alongside Claude Code.
colors:
  primary: "#5e6ad2"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  on-primary: "#ffffff"
  brand-secure: "#7a7fad"
  canvas-light: "#ffffff"
  surface-1-light: "#f7f8f8"
  surface-2-light: "#e6e8ec"
  surface-3-light: "#d0d6e0"
  surface-4-light: "#b8bdc7"
  hairline-light: "#e1e4e9"
  hairline-strong-light: "#c8ccd3"
  hairline-tertiary-light: "#eef0f3"
  ink-light: "#010102"
  ink-muted-light: "#2e3036"
  ink-subtle-light: "#62666d"
  ink-tertiary-light: "#8a8f98"
  canvas-dark: "#010102"
  surface-1-dark: "#0c0d10"
  surface-2-dark: "#14161b"
  surface-3-dark: "#1b1d23"
  surface-4-dark: "#23252a"
  hairline-dark: "#23252a"
  hairline-strong-dark: "#2e3036"
  hairline-tertiary-dark: "#1a1c20"
  ink-dark: "#f7f8f8"
  ink-muted-dark: "#d0d6e0"
  ink-subtle-dark: "#8a8f98"
  ink-tertiary-dark: "#62666d"
  semantic-success-light: "#1f8a37"
  semantic-success-dark: "#27a644"
  semantic-destructive-light: "#d83a3a"
  semantic-destructive-dark: "#e85a5a"
typography:
  display-xl:
    fontFamily: "var(--font-geist-sans), 'SF Pro Display', -apple-system, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.0375em"
  display-lg:
    fontFamily: "var(--font-geist-sans), 'SF Pro Display', -apple-system, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.032em"
  headline:
    fontFamily: "var(--font-geist-sans), 'SF Pro Display', -apple-system, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.021em"
  card-title:
    fontFamily: "var(--font-geist-sans), 'SF Pro Display', -apple-system, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.018em"
  subhead:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.003em"
  body-sm:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
  caption:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.005em"
  eyebrow:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.031em"
  mono:
    fontFamily: "var(--font-geist-mono), 'JetBrains Mono', ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  button:
    fontFamily: "var(--font-geist-sans), -apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
  full: "9999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  rail: "44px"
  pane: "320px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary-focus}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-1-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "30px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-subtle-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
    height: "28px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.ink-dark}"
  input-text:
    backgroundColor: "{colors.surface-1-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    height: "30px"
  block-shell:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0px"
  block-shell-selected:
    backgroundColor: "{colors.surface-1-dark}"
    textColor: "{colors.ink-dark}"
  canvas-shell:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "32px 40px"
  left-rail-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-subtle-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
    height: "28px"
  left-rail-item-active:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.ink-dark}"
  sheet-panel:
    backgroundColor: "{colors.surface-1-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "20px"
  dropdown-menu:
    backgroundColor: "{colors.surface-3-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "4px"
  chat-message-user:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
  chat-message-assistant:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "8px 0px"
  kbd-key:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.ink-muted-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: "1px 5px"
  status-badge:
    backgroundColor: "{colors.surface-2-dark}"
    textColor: "{colors.ink-muted-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: plan-k

## 1. Overview

**Creative North Star: "The Drafting Surface."**

plan-k is the bench a single craftsperson sits at to draft plans, specs, and design docs alongside Claude Code. The interface behaves like a well-tooled drafting table, not a SaaS dashboard. Tools live at the edges of the room (the left rail, the right chat, the inspector) so the canvas in the middle can hold the work without competition. The page is quiet by design. Type is small, contrast is high, lavender appears once per screen, motion exists only to confirm state. The user is fluent. The interface does not over-explain itself.

The system rejects four families drawn directly from PRODUCT.md anti-references: SaaS pastel palettes with dark blue-purple gradients and icon grids, Figma and Miro style colorful creative tools with playful emoji-and-color combinations, exaggerated animations and delight effects (sparkles, elastic bounces, parallax), and the generic Notion or Confluence document-tool aesthetic. plan-k looks like a tool that builds tools, not a meeting-notes app.

Implementation is symmetric across light and dark. Both themes share the lavender accent unchanged and ride the same four-step surface ladder inverted around the canvas. The user toggles, the system does not assume.

**Key Characteristics:**
- Single chromatic accent: Linear lavender-blue `#5e6ad2`, used on focus rings, the active rail item, the primary CTA, and the canvas AI-active glow.
- Four-step surface ladder (canvas, surface-1, surface-2, surface-3, surface-4) carries hierarchy without drop shadows in either theme.
- Density tuned for long sessions: 13 to 14px body, 6 to 8px control padding, 28 to 30px control heights. Compact but never cramped.
- Geist Sans for everything; Geist Mono only inside code blocks and the kbd component.
- Negative letter-spacing on display (-3.75% at the top step), positive tracking only on eyebrow labels (+3.1%).
- Light and dark are mirrored; neither is the default. OS preference plus explicit toggle.
- The central canvas is the protagonist. Chrome (rail, sheet, chat) recedes onto surface-1 or surface-2.

## 2. Colors

A monochromatic ladder in two themes, tied together by a single lavender hue. The faint blue tint in the dark canvas (`#010102`, not `#000`) and the warm grey hairlines on light are intentional. Accent saturation only appears where a state change demands it.

### Primary
- **Linear Lavender-Blue** (`#5e6ad2`, light + dark): The one chromatic color in the system. Used on the AI-active canvas glow, focus rings, the primary CTA fill, the active left-rail item indicator, and link emphasis. Never used as a section background, never as a card fill. Identical across themes; lavender is the brand signature, not a mode-dependent decoration.
- **Lavender Hover** (`#828fff`): The lighter step. Applied to `:hover` on the primary CTA.
- **Lavender Focus** (`#5e69d1`): The focus-ring tint, also the pressed state of the primary CTA.

### Neutral, Light Mode
- **Paper Canvas** (`#ffffff`): The page background.
- **Surface 1** (`#f7f8f8`): Cards, panels, sheet bodies, inputs.
- **Surface 2** (`#e6e8ec`): Hovered cards, the active rail item background, muted backgrounds.
- **Surface 3** (`#d0d6e0`): Dropdown menus, popovers.
- **Surface 4** (`#b8bdc7`): The deepest lifted surface in light mode; rarely needed.
- **Hairline** (`#e1e4e9`): Every 1px divider in light. Card borders. Table grid lines.
- **Hairline Strong** (`#c8ccd3`): Input field outlines when focused, blockquote rules.
- **Hairline Tertiary** (`#eef0f3`): Nested-surface hairlines.
- **Ink** (`#010102`): All primary text. Same value as the dark canvas; the system inverts around it.
- **Ink Muted** (`#2e3036`): Secondary text, meta information.
- **Ink Subtle** (`#62666d`): Inactive labels, footnote text, disabled states.
- **Ink Tertiary** (`#8a8f98`): Quaternary, used sparingly.

### Neutral, Dark Mode
- **Slate Canvas** (`#010102`): The page background. Faint blue undertone (not `#000` pure black). Long-session friendly under low ambient light.
- **Surface 1** (`#0c0d10`), **Surface 2** (`#14161b`), **Surface 3** (`#1b1d23`), **Surface 4** (`#23252a`): The four lift steps. Each carries roughly the same role as its light-mode mirror.
- **Hairline** (`#23252a`), **Hairline Strong** (`#2e3036`), **Hairline Tertiary** (`#1a1c20`): Borders and rules.
- **Ink** (`#f7f8f8`), **Ink Muted** (`#d0d6e0`), **Ink Subtle** (`#8a8f98`), **Ink Tertiary** (`#62666d`): Text scale.

### Semantic
- **Success** (`#1f8a37` light, `#27a644` dark): Status pills, saved-state confirmations. The one chromatic exception to lavender-only.
- **Destructive** (`#d83a3a` light, `#e85a5a` dark): Confirm-destructive dialogs, error inline messages. Used inside text and pill backgrounds; never as a full-surface fill.

### Named Rules
**The One Lavender Rule.** Lavender appears at most twice on any screen: once for the active focus or selection, once for the primary CTA or AI-active state. A third lavender on the same screen is a bug. If the design needs more emphasis, lift the surface or change the type weight, do not paint another lavender.

**The Anchor Inversion Rule.** Ink (`#010102` light, `#f7f8f8` dark) and Canvas swap on theme change; they are the same two values, inverted. Anything else (surfaces, hairlines, accents) follows the same hue ladder mirrored. Light is not a brighter dark, it is the mirror.

**The No-Black Rule.** `#000000` and `#ffffff` true black or white are forbidden as token values for any role except `on-primary`. Every neutral carries a faint blue undertone matching the lavender brand hue.

## 3. Typography

**Display Font:** Geist Sans (with `SF Pro Display, -apple-system, system-ui` fallback).
**Body Font:** Geist Sans (same family; one voice across the system).
**Mono Font:** Geist Mono (with `JetBrains Mono, ui-monospace, SF Mono, Menlo` fallback).

**Character:** One sans, two weights, aggressive negative tracking on display, no second display family. The font does not draw attention to itself. The user reads the words, not the typeface.

### Hierarchy
- **Display XL** (600, 44px, line 1.08, tracking -3.75%): The largest headline a product page should carry, used at most on the project landing and section opener. Builder pages typically do not use this size.
- **Display LG** (600, 32px, line 1.15, tracking -3.2%): Section openers inside the builder, sheet titles.
- **Headline** (600, 22px, line 1.25, tracking -2.1%): Dialog titles, panel headings.
- **Card Title** (600, 17px, line 1.3, tracking -1.8%): Inspector group headings, sheet-row titles.
- **Subhead** (500, 15px, line 1.4, tracking -1.0%): Lead paragraph in docs context, callout headings.
- **Body** (400, 14px, line 1.55, tracking -0.3%): Default text. Inputs. Block content.
- **Body SM** (400, 13px, line 1.5, tracking 0): Compact UI. Chat messages. Left rail item labels.
- **Label** (500, 12px, line 1.3, tracking 0): Form field labels, status pill text.
- **Caption** (400, 11px, line 1.4, tracking +0.5%): Footnotes, save-status chip, slot meta info.
- **Eyebrow** (500, 11px, line 1.3, tracking +3.1%): Section taxonomy labels, the rare positive-tracked element. Contrast against negative-tracked display marks the eyebrow as metadata.
- **Mono** (400, 12px, line 1.5): Code blocks, kbd component, ID tokens.

### Named Rules
**The One Family Rule.** Geist Sans carries display through body. The product never pairs a display serif with a sans body. Hierarchy comes from size, weight, and tracking; not from family change.

**The Tighter-Goes-Bigger Rule.** Letter-spacing scales negatively as size grows. Display XL holds -3.75%; body holds -0.3%. Eyebrow is the one exception, tracking positive +3.1% as taxonomy marker.

**The 14-Pixel Floor.** Default body is 14px. The 11px caption is a metadata size only; never paragraph body, never inline next to a 14px label unless the visual hierarchy demands it.

## 4. Elevation

plan-k carries depth through the four-step surface ladder and 1px hairline borders. Drop shadows are not part of the system. The single decorative effect is the inset lavender glow on `.canvas-shell.ai-active`, used to signal an in-flight Claude run, not to manufacture depth.

The surfaces stack predictably: canvas, then surface-1 (cards, sheets, inputs), then surface-2 (hovered cards, active rail items, kbd, status badges), then surface-3 (dropdown menus, popovers), then surface-4 (deepest lift, rare). Light and dark mirror this stack with equal step distances. No tonal shadow, no ambient glow except the canvas-active state.

### Surface Ladder (used in place of shadow vocabulary)
- **Level 0 (flat)**: Body type, the canvas itself, the page chrome at rest. No border, no fill.
- **Level 1**: `surface-1` background, optional 1px `hairline` border. Cards, sheets, inputs.
- **Level 2**: `surface-2` background, optional 1px `hairline-strong` border. Hovered cards, active rail items, the kbd component, status badges.
- **Level 3**: `surface-3` background. Dropdown menus, popovers.
- **Level 4**: `surface-4` background. The deepest lift, used rarely (deep modal-on-modal contexts).
- **AI-Active Canvas Glow**: `inset 0 0 80px color-mix(in oklch, var(--primary) 18%, transparent)` plus a 1px lavender inset ring. Animated as a 2.4s `ease-in-out` pulse. The only ornamental effect in the system.

### Named Rules
**The No-Shadow Rule.** Box-shadow as decoration is forbidden. Depth is communicated via surface lift only. The one exception is the canvas AI-active inset glow; if a designer reaches for `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`, the answer is wrong, lift the surface instead.

**The Hairline Rule.** Every separating line is 1px, never 2px or thicker. Hairline tokens (`hairline`, `hairline-strong`, `hairline-tertiary`) own this; no ad-hoc `border-color` outside the token set.

**The AI-Active Reservation.** The pulsing lavender canvas glow is reserved exclusively for in-flight Claude runs. Never used as a decorative or always-on effect. The pulse means "the assistant is thinking," and the moment the run ends the glow drops.

## 5. Components

The builder is the protagonist. Chrome is muted; the canvas in the middle is where the user looks. Five primitive families plus three signature components carry the entire surface.

### Buttons
- **Shape:** All buttons share `{rounded.md}` 8px corners. Never pill (except inside `kbd` and `status-badge`), never `{rounded.lg}` 12px. Heights step in 28 / 30 / 36 only.
- **Primary:** `{colors.primary}` lavender background, `{colors.on-primary}` white text, `{typography.button}` 13/500. Padding 6 by 12, height 30px. Reserved for the single most important action on the screen.
- **Secondary:** `{colors.surface-1}` background, `{colors.ink}` text. 1px `{colors.hairline}` border. The everyday button. Same 30px height.
- **Ghost:** transparent background, `{colors.ink-subtle}` text. Hover lifts to `{colors.surface-2}` fill with `{colors.ink}` text. Height 28px. The compact toolbar variant.
- **Hover / Focus:** Primary hover shifts to `{colors.primary-hover}` lighter lavender. Focus ring is a 2px `{colors.primary-focus}` outline at 50% opacity around the button, not a glow. 150ms `ease-out-quart` on background only; layout properties do not transition.

### Inputs and Fields
- **Style:** `{colors.surface-1}` background, 1px `{colors.hairline}` border, `{rounded.md}` 8px corners. Padding 6 by 10, height 30px. Same `{typography.body}` 14/400 as paragraph text.
- **Focus:** The border shifts to `{colors.hairline-strong}` and a 2px `{colors.primary-focus}` outline appears around the element. No glow, no scale, no transform.
- **Error:** Border shifts to `{colors.semantic-destructive}`; inline message renders below at `{typography.caption}` in the same destructive ink. The input fill stays neutral; the surrounding state changes, not the surface.
- **Disabled:** `{colors.ink-tertiary}` text, no border change, cursor `not-allowed`.

### Block Shell (signature)
- **Style:** The container around any block in the builder. Default is a transparent shell with `{rounded.sm}` 6px corners. Padding is zero at the shell level; the block content owns its own breathing room via the `SPACING_DEFAULTS_BY_KIND` table in `src/builder/spacing.ts`.
- **Selected:** `{colors.surface-1}` background fill plus a 1px `{colors.hairline}` border. No lavender unless the block is being explicitly focused for AI insertion.
- **Drag Affordance:** A 6-dot handle appears at the top-left of the shell on hover. The handle uses `{colors.ink-tertiary}` ink, no border, no shadow.
- **Insert Slot:** Between blocks, a 6px tall zero-content slot expands to 24px on hover and shows a 1px lavender dashed centerline. The slot is the only place a lavender dashed border is permitted in the system.

### Canvas Shell (signature)
- **Style:** The central work surface. `{colors.canvas}` background, `{rounded.xl}` 16px corners on the outer frame, 32 to 40px inner padding. The shell sits inside a `{colors.surface-1}` page chrome to give the canvas a faint visual lift without any shadow.
- **AI-Active:** `.ai-active` class toggles the inset lavender glow described in Elevation. Pulse animates at 2.4s `ease-in-out`. `prefers-reduced-motion: reduce` disables the animation; the static glow remains so the in-flight state stays legible.
- **Print Mode:** Inside `@media print`, the canvas drops to `background: white` and `color: black` and any `[data-frame]` blocks resolve `break-inside: avoid`. PDF and image exports inherit this rule.

### Left Rail
- **Style:** A 44px-wide fixed sidebar on `{colors.canvas}` with no border on the canvas side, a single 1px `{colors.hairline}` on the content side. Items render as 28px-tall buttons with 6 by 8 padding, `{typography.body-sm}` text.
- **Default:** transparent fill, `{colors.ink-subtle}` text.
- **Active:** `{colors.surface-2}` background fill, `{colors.ink}` text, plus a 2px lavender vertical bar on the right edge of the row, 16px tall, centered. The 2px lavender bar is the rail's exception to The One Lavender Rule (it is the persistent selection indicator).
- **Hover:** background fills to `{colors.surface-1}` only. No scale, no color shift.

### Sheet Panel
- **Style:** `{colors.surface-1}` background, `{rounded.lg}` 12px corners, 20px inner padding. Used for the backlog sheet, the print options popover body, the property value editor.
- **Header:** 13px label in `{colors.ink-muted}`, 8px bottom margin. Body below.
- **Close Affordance:** Top-right `button-ghost` with an X icon at 14px stroke.

### Dropdown Menu
- **Style:** `{colors.surface-3}` background, 1px `{colors.hairline-strong}` border, `{rounded.md}` 8px corners, 4px padding. The surface lift to surface-3 is deliberate: dropdowns are above the sheet panels (surface-1) and inputs.
- **Item:** 28px-tall row, 6 by 8 padding, `{typography.body-sm}` 13/400.
- **Item Hover:** `{colors.surface-4}` fill, `{colors.ink}` text. No lavender on hover; only on the active selected item.
- **Separator:** 1px `{colors.hairline}`, 4px vertical margin.

### Chat Message
- **User Bubble:** `{colors.surface-2}` background, `{rounded.lg}` 12px corners, 10 by 14 padding, `{typography.body-sm}` text. Right-aligned in the chat column.
- **Assistant Body:** transparent background, no border, full-width column. Markdown renders through the `.prose-chat` CSS preset in `globals.css`: 13px body, tight margins, mono `code` inline at `{colors.surface-2}` background. The assistant message does not look like a chat bubble; it looks like a section of the document, because that is what it is.

### Kbd
- **Style:** `{colors.surface-2}` background, `{colors.ink-muted}` text, `{rounded.xs}` 4px corners, 1 by 5 padding, `{typography.caption}` mono. Used inside tooltips and the slash menu to show keystrokes. The kbd is the only place where the caption size is paired with mono.

### Status Badge
- **Style:** `{colors.surface-2}` background, `{colors.ink-muted}` text, `{rounded.pill}` corners, 2 by 8 padding, `{typography.caption}`. Used for save-status, block validity, slot type marker.
- **Success State:** background `{colors.semantic-success}` at 12% opacity, text `{colors.semantic-success}` at full intensity. Same pattern for destructive.

## 6. Do's and Don'ts

### Do
- **Do** lift the surface to communicate depth (`surface-1`, `surface-2`, `surface-3`), never reach for `box-shadow`.
- **Do** reserve lavender `#5e6ad2` for at most two roles per screen: focus or selection, and primary CTA or AI-active glow.
- **Do** pair `{typography.display-*}` weight 600 with body weight 400. Never 700+ display weights.
- **Do** apply negative letter-spacing on display sizes (-1.0% to -3.75%) and positive only on eyebrow (+3.1%).
- **Do** use 1px hairline borders everywhere; thicker rules are visual noise.
- **Do** keep the canvas as the protagonist of every builder screen; rail, sheets, chat, inspector all step back onto surface-1 or surface-2.
- **Do** mirror the dark and light themes exactly. Same hue ladder, inverted around ink and canvas.
- **Do** respect `prefers-reduced-motion: reduce`. Drop the canvas AI-active pulse to a static glow, drop all transitions to 80ms or less, or remove them entirely.
- **Do** use Geist Mono only inside code blocks and the kbd component.

### Don't
- **Don't** ship SaaS pastel plus dark-purple gradient plus icon-grid combinations. PRODUCT.md explicitly names this; the design system enforces it.
- **Don't** introduce Figma or Miro style colorful creative-tool palettes. Multi-hue chips, rainbow color tags, playful emoji-and-color combinations are forbidden. The product is a planner, not a whiteboard.
- **Don't** add exaggerated animations or delight effects. No sparkles, parallax, elastic bounces, or rotational motion. Motion conveys state, never decoration.
- **Don't** dress the surface as a Notion or Confluence document tool. plan-k is a builder; flat document-grid layouts do not represent the canvas.
- **Don't** use `#000000` or `#ffffff` for canvas, ink, surface, or hairline. Every neutral carries the lavender undertone via the token set.
- **Don't** use side-stripe borders (`border-left` greater than 1px as a colored accent). The active rail item indicator is a 2px lavender bar centered inside a 28px row, not a stripe down the entire item. No other surface has a colored stripe.
- **Don't** use gradient text. Emphasis is weight and size, not `background-clip: text`.
- **Don't** use modals as a first thought. Most write actions belong inline in the builder or in a side sheet. Modal-on-modal is always wrong.
- **Don't** pill-round CTAs. Pill-radius lives on `kbd` and `status-badge` only.
- **Don't** introduce a second chromatic accent (orange, pink, teal). Lavender is the only chromatic role. Success green is semantic, not decorative.
- **Don't** animate CSS layout properties (`width`, `height`, `margin`, `padding`). Animate `opacity`, `transform`, `background-color` only.
- **Don't** ship a component without `:hover`, `:focus-visible`, `:active`, and `:disabled` states. The product register requires the full state vocabulary.
