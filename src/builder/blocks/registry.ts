import { z } from "zod";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import {
  CARD_GRID_DEFAULTS,
  CardGridSchema,
  type CardGridValues,
  FORM_DEFAULTS,
  FormSchema,
  type FormValues,
  HEADER_DEFAULTS,
  HERO_DEFAULTS,
  HeaderSchema,
  type HeaderValues,
  HeroSchema,
  type HeroValues,
  LAYOUT_DEFAULTS,
  LayoutSchema,
  type LayoutValues,
  LIST_DEFAULTS,
  ListSchema,
  type ListValues,
  NAV_DEFAULTS,
  NavSchema,
  type NavValues,
  TEXT_DEFAULTS,
  TextSchema,
  type TextValues,
} from "@/components/builder/renderers/editors/schemas";
import type { BlockManifest } from "./types";

// Generic free-form schema for kinds that don't yet have dedicated editors.
// Stage 4 of P6 replaces these with typed schemas. Until then the JSON
// fallback editor + StubBlock detail keep them functional.
const Empty = z.object({}).passthrough();

// Helper to define a manifest with strong typing on defaults.
function manifest<T>(m: BlockManifest<T>): BlockManifest<T> {
  return m;
}

// ────────────────────────────── docs ──────────────────────────────

const headingManifest = manifest<HeaderValues>({
  context: "docs",
  kind: "heading",
  label: "Heading",
  group: "Prose",
  shortcut: "H",
  schema: HeaderSchema,
  defaults: HEADER_DEFAULTS,
  summary: (v) => `H${v.level}: ${v.text || "Untitled"}`,
});

const paragraphManifest = manifest<TextValues>({
  context: "docs",
  kind: "paragraph",
  label: "Paragraph",
  group: "Prose",
  shortcut: "P",
  schema: TextSchema,
  defaults: TEXT_DEFAULTS,
  summary: (v) => v.markdown.slice(0, 80) || "Empty paragraph",
});

const blockquoteManifest = manifest({
  context: "docs",
  kind: "blockquote",
  label: "Blockquote",
  group: "Prose",
  shortcut: "Q",
  schema: z.object({
    text: z.string().default(""),
    cite: z.string().default(""),
  }),
  defaults: { text: "", cite: "" },
  summary: (v) => `"${(v.text || "").slice(0, 60)}"`,
});

const calloutManifest = manifest({
  context: "docs",
  kind: "callout",
  label: "Callout",
  group: "Prose",
  shortcut: "O",
  schema: z.object({
    variant: z.enum(["info", "warn", "success", "error"]).default("info"),
    title: z.string().default(""),
    text: z.string().default(""),
  }),
  defaults: { variant: "info" as const, title: "", text: "" },
  summary: (v) => v.title || `${v.variant}: ${(v.text || "").slice(0, 50)}`,
});

const codeBlockManifest = manifest({
  context: "docs",
  kind: "code-block",
  label: "Code block",
  group: "Prose",
  shortcut: "C",
  schema: z.object({
    language: z.string().default("ts"),
    code: z.string().default(""),
    filename: z.string().default(""),
  }),
  defaults: { language: "ts", code: "", filename: "" },
  summary: (v) =>
    v.filename ? `${v.filename} (${v.language})` : `${v.language}`,
});

const bulletListManifest = manifest<ListValues>({
  context: "docs",
  kind: "bullet-list",
  label: "Bullet list",
  group: "Lists",
  shortcut: "B",
  schema: ListSchema,
  defaults: { ordered: false, items: [] },
  summary: (v) => `${v.items.length} items`,
});

const numberedListManifest = manifest<ListValues>({
  context: "docs",
  kind: "numbered-list",
  label: "Numbered list",
  group: "Lists",
  shortcut: "N",
  schema: ListSchema,
  defaults: { ordered: true, items: [] },
  summary: (v) => `${v.items.length} items`,
});

const checklistManifest = manifest({
  context: "docs",
  kind: "checklist",
  label: "Checklist",
  group: "Lists",
  shortcut: "K",
  schema: z.object({
    items: z
      .array(
        z.object({
          text: z.string().default(""),
          checked: z.boolean().default(false),
        }),
      )
      .default([]),
  }),
  defaults: { items: [] as { text: string; checked: boolean }[] },
  summary: (v) => {
    const done = v.items.filter((i) => i.checked).length;
    return `${done}/${v.items.length} done`;
  },
});

const tableManifest = manifest({
  context: "docs",
  kind: "table",
  label: "Table",
  group: "Structure",
  shortcut: "T",
  schema: z.object({
    columns: z.array(z.string()).default(["", ""]),
    rows: z.array(z.array(z.string())).default([["", ""]]),
    // px widths per column. undefined → even distribution in the renderer.
    columnWidths: z.array(z.number()).optional(),
  }),
  defaults: { columns: ["", ""], rows: [["", ""]], columnWidths: undefined },
  summary: (v) => `${v.columns.length} cols × ${v.rows.length} rows`,
});

const ruleManifest = manifest({
  context: "docs",
  kind: "rule",
  label: "Horizontal rule",
  group: "Structure",
  shortcut: "R",
  schema: Empty,
  defaults: {},
  summary: () => "Rule",
});

const canvasManifest = manifest({
  context: "docs",
  kind: "canvas",
  label: "Canvas",
  group: "Media",
  shortcut: "X",
  schema: z.object({
    title: z.string().default(""),
    // tldraw StoreSnapshot serialized via getSnapshot() — opaque to this app.
    snapshot: z.unknown().nullable().default(null),
    // PNG data URL of the last Apply render.
    previewDataUrl: z.string().default(""),
  }),
  defaults: {
    title: "",
    snapshot: null as unknown,
    previewDataUrl: "",
  },
  summary(data) {
    const t = (data as { title?: string }).title?.trim();
    return t && t.length > 0 ? t : "Empty canvas";
  },
});

const figureManifest = manifest({
  context: "docs",
  kind: "figure",
  label: "Figure",
  group: "Media",
  shortcut: "F",
  schema: z.object({
    // imageRef replaces legacy `src`. Renderers read imageRef ?? src for back-compat.
    imageRef: z.string().default(""),
    alt: z.string().default(""),
    caption: z.string().default(""),
    width: z.number().int().positive().optional(),
  }),
  defaults: { imageRef: "", alt: "", caption: "" } as {
    imageRef: string;
    alt: string;
    caption: string;
    width?: number;
  },
  summary: (v) => v.alt || v.caption || "Figure",
});

const linkCardManifest = manifest({
  context: "docs",
  kind: "link-card",
  label: "Link card",
  group: "Media",
  shortcut: "L",
  schema: z.object({
    url: z.string().default(""),
    title: z.string().default(""),
    description: z.string().default(""),
    faviconUrl: z.string().default(""),
  }),
  defaults: { url: "", title: "", description: "", faviconUrl: "" },
  summary: (v) => v.title || v.url || "Link card",
});

const definitionManifest = manifest({
  context: "docs",
  kind: "definition",
  label: "Definition",
  group: "Reference",
  shortcut: "G",
  schema: z.object({
    term: z.string().default(""),
    definition: z.string().default(""),
  }),
  defaults: { term: "", definition: "" },
  summary: (v) => v.term || "Term",
});

const decisionManifest = manifest({
  context: "docs",
  kind: "decision",
  label: "Decision (ADR)",
  group: "Spec",
  shortcut: "D",
  schema: z.object({
    question: z.string().default(""),
    status: z.enum(["proposed", "accepted", "superseded"]).default("proposed"),
    context: z.string().default(""),
    options: z
      .array(
        z.object({
          label: z.string().default(""),
          pros: z.string().default(""),
          cons: z.string().default(""),
        }),
      )
      .default([]),
    decision: z.string().default(""),
    rationale: z.string().default(""),
    consequences: z.string().default(""),
  }),
  defaults: {
    question: "",
    status: "proposed" as const,
    context: "",
    options: [] as { label: string; pros: string; cons: string }[],
    decision: "",
    rationale: "",
    consequences: "",
  },
  summary: (v) => `[${v.status}] ${v.question || "Decision"}`,
});

const personaManifest = manifest({
  context: "docs",
  kind: "persona",
  label: "Persona",
  group: "Spec",
  shortcut: "E",
  schema: z.object({
    name: z.string().default(""),
    role: z.string().default(""),
    demographics: z.string().default(""),
    goals: z.array(z.string()).default([]),
    needs: z.array(z.string()).default([]),
    pains: z.array(z.string()).default([]),
    quote: z.string().default(""),
    profileImageRef: z.string().default(""),
    profileImageAlt: z.string().default(""),
  }),
  defaults: {
    name: "",
    role: "",
    demographics: "",
    goals: [] as string[],
    needs: [] as string[],
    pains: [] as string[],
    quote: "",
    profileImageRef: "",
    profileImageAlt: "",
  },
  summary: (v) => `${v.name || "Persona"} (${v.role || "—"})`,
});

const userStoryManifest = manifest({
  context: "docs",
  kind: "user-story",
  label: "User story",
  group: "Spec",
  shortcut: "U",
  schema: z.object({
    as: z.string().default(""),
    want: z.string().default(""),
    soThat: z.string().default(""),
    acceptance: z.array(z.string()).default([]),
    priority: z.enum(["P0", "P1", "P2"]).default("P1"),
    estimate: z.string().default(""),
  }),
  defaults: {
    as: "",
    want: "",
    soThat: "",
    acceptance: [] as string[],
    priority: "P1" as const,
    estimate: "",
  },
  summary: (v) => `[${v.priority}] As ${v.as || "—"}: ${v.want || "…"}`,
});

// `impact` is loosely typed (string) for back-compat with existing data; a
// new typed `level` field captures low/medium/high. Same idea for
// `likelihood`. Editors in stage 5 prefer the typed fields.
const riskManifest = manifest({
  context: "docs",
  kind: "risk",
  label: "Risk",
  group: "Spec",
  shortcut: "I",
  schema: z.object({
    risk: z.string().default(""),
    impact: z.string().default(""),
    impactLevel: z.enum(["low", "medium", "high"]).default("medium"),
    likelihood: z.enum(["low", "medium", "high"]).default("medium"),
    mitigation: z.string().default(""),
    owner: z.string().default(""),
  }),
  defaults: {
    risk: "",
    impact: "",
    impactLevel: "medium" as const,
    likelihood: "medium" as const,
    mitigation: "",
    owner: "",
  },
  summary: (v) => `[${v.impactLevel}/${v.likelihood}] ${v.risk || "Risk"}`,
});

const metricManifest = manifest({
  context: "docs",
  kind: "metric",
  label: "Metric / KPI",
  group: "Spec",
  shortcut: "M",
  schema: z.object({
    name: z.string().default(""),
    target: z.string().default(""),
    current: z.string().default(""),
    status: z.enum(["ok", "warn", "bad"]).default("ok"),
    unit: z.string().default(""),
    trend: z.enum(["up", "down", "flat"]).default("flat"),
  }),
  defaults: {
    name: "",
    target: "",
    current: "",
    status: "ok" as const,
    unit: "",
    trend: "flat" as const,
  },
  summary: (v) => `${v.name || "Metric"}: ${v.current}/${v.target}${v.unit}`,
});

// ── P7: gap fillers for new section kinds ──

const milestoneManifest = manifest({
  context: "docs",
  kind: "milestone",
  label: "Milestone",
  group: "Spec",
  shortcut: "V",
  schema: z.object({
    date: z.string().default(""),
    title: z.string().default(""),
    status: z
      .enum(["planned", "in-progress", "shipped", "delayed"])
      .default("planned"),
    scope: z.string().default(""),
    exitCriteria: z.string().default(""),
  }),
  defaults: {
    date: "",
    title: "",
    status: "planned" as const,
    scope: "",
    exitCriteria: "",
  },
  summary: (v) =>
    `[${v.status}] ${v.title || "Milestone"}${v.date ? ` · ${v.date}` : ""}`,
});

const releaseNoteManifest = manifest({
  context: "docs",
  kind: "release-note",
  label: "Release note",
  group: "Spec",
  shortcut: "W",
  schema: z.object({
    version: z.string().default(""),
    date: z.string().default(""),
    highlights: z.string().default(""),
    added: z.array(z.string()).default([]),
    changed: z.array(z.string()).default([]),
    fixed: z.array(z.string()).default([]),
    removed: z.array(z.string()).default([]),
  }),
  defaults: {
    version: "",
    date: "",
    highlights: "",
    added: [] as string[],
    changed: [] as string[],
    fixed: [] as string[],
    removed: [] as string[],
  },
  summary: (v) =>
    `${v.version || "Release"}${v.date ? ` (${v.date})` : ""} · +${v.added.length}/~${v.changed.length}/!${v.fixed.length}/-${v.removed.length}`,
});

const colorSwatchManifest = manifest({
  context: "docs",
  kind: "color-swatch",
  label: "Color swatch",
  group: "Media",
  shortcut: "Y",
  schema: z.object({
    name: z.string().default(""),
    hex: z
      .string()
      .regex(/^#?[0-9a-fA-F]{3,8}$/, "Must be a hex color")
      .or(z.literal(""))
      .default(""),
    role: z.string().default(""),
    contrastNote: z.string().default(""),
  }),
  defaults: { name: "", hex: "", role: "", contrastNote: "" },
  summary: (v) => `${v.name || "Color"}${v.hex ? ` ${v.hex}` : ""}`,
});

const journeyStepManifest = manifest({
  context: "docs",
  kind: "journey-step",
  label: "Journey step",
  group: "Spec",
  shortcut: "J",
  schema: z.object({
    step: z.number().int().min(1).default(1),
    persona: z.string().default(""),
    action: z.string().default(""),
    system: z.string().default(""),
    outcome: z.string().default(""),
    painPoint: z.string().default(""),
  }),
  defaults: {
    step: 1,
    persona: "",
    action: "",
    system: "",
    outcome: "",
    painPoint: "",
  },
  summary: (v) =>
    `Step ${v.step}${v.persona ? ` · ${v.persona}` : ""}: ${(v.action || "").slice(0, 40)}`,
});

const apiEndpointManifest = manifest({
  context: "docs",
  kind: "api-endpoint",
  label: "API endpoint",
  group: "Reference",
  shortcut: "A",
  schema: z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
    path: z.string().default(""),
    summary: z.string().default(""),
    auth: z.string().default(""),
    request: z.string().default(""),
    response: z.string().default(""),
    errors: z
      .array(
        z.object({
          status: z.number().int().min(100).max(599).default(400),
          reason: z.string().default(""),
        }),
      )
      .default([]),
  }),
  defaults: {
    method: "GET" as const,
    path: "",
    summary: "",
    auth: "",
    request: "",
    response: "",
    errors: [] as { status: number; reason: string }[],
  },
  summary: (v) => `${v.method} ${v.path || "/"}`,
});

const mathBlockManifest = manifest({
  context: "docs",
  kind: "math-block",
  label: "Math",
  group: "Structure",
  shortcut: "M",
  schema: z.object({ tex: z.string().default("") }),
  defaults: { tex: "" },
  summary: (v) => (v.tex as string).slice(0, 40) || "Math",
});

// ────────────────────────────── app (web/shared) ──────────────────────────────

const pageHeaderManifest = manifest({
  context: "app",
  kind: "page-header",
  label: "Page header",
  group: "Layout",
  shortcut: "H",
  schema: z.object({
    title: z.string().default(""),
    subtitle: z.string().default(""),
    breadcrumbs: z
      .array(
        z.object({
          label: z.string().default(""),
          href: z.string().default(""),
        }),
      )
      .default([]),
    actions: z
      .array(
        z.object({
          label: z.string().default(""),
          variant: z.string().default("primary"),
          href: z.string().default(""),
        }),
      )
      .default([]),
  }),
  defaults: {
    title: "",
    subtitle: "",
    breadcrumbs: [] as { label: string; href: string }[],
    actions: [] as { label: string; variant: string; href: string }[],
  },
  summary: (v) => v.title || "Page header",
});

const sidebarManifest = manifest({
  context: "app",
  kind: "sidebar",
  label: "Sidebar",
  group: "Layout",
  shortcut: "S",
  schema: z.object({
    items: z
      .array(
        z.object({
          label: z.string().default(""),
          href: z.string().default(""),
          icon: z.string().default(""),
        }),
      )
      .default([]),
  }),
  defaults: {
    items: [] as { label: string; href: string; icon: string }[],
  },
  summary: (v) => `${v.items.length} items`,
});

// `items` is kept for backward-compat with prior data; new editors write to
// `columns` + `copyright`. Detail renderer prefers the new shape and falls
// back to items.
const footerManifest = manifest({
  context: "app",
  kind: "footer",
  label: "Footer",
  group: "Layout",
  shortcut: "E",
  schema: z.object({
    items: z.array(z.object({}).passthrough()).default([]),
    columns: z
      .array(
        z.object({
          title: z.string().default(""),
          links: z
            .array(
              z.object({
                label: z.string().default(""),
                href: z.string().default(""),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
    copyright: z.string().default(""),
  }),
  defaults: {
    items: [] as Array<Record<string, unknown>>,
    columns: [] as {
      title: string;
      links: { label: string; href: string }[];
    }[],
    copyright: "",
  },
  summary: (v) =>
    v.columns.length > 0 ? `${v.columns.length} columns` : "Footer",
});

const tabsManifest = manifest({
  context: "app",
  kind: "tabs",
  label: "Tabs",
  group: "Layout",
  shortcut: "W",
  schema: z.object({
    tabs: z
      .array(
        z.object({
          label: z.string().default(""),
          id: z.string().default(""),
        }),
      )
      .default([]),
    defaultTabId: z.string().default(""),
  }),
  defaults: {
    tabs: [] as { label: string; id: string }[],
    defaultTabId: "",
  },
  summary: (v) => `${v.tabs.length} tabs`,
});

const modalManifest = manifest({
  context: "app",
  kind: "modal",
  label: "Modal",
  group: "Layout",
  shortcut: "D",
  schema: z.object({
    title: z.string().default(""),
    body: z.string().default(""),
    primaryCta: z.string().default(""),
    secondaryCta: z.string().default(""),
    size: z.enum(["sm", "md", "lg"]).default("md"),
  }),
  defaults: {
    title: "",
    body: "",
    primaryCta: "",
    secondaryCta: "",
    size: "md" as const,
  },
  summary: (v) => v.title || "Modal",
});

const dividerManifest = manifest({
  context: "app",
  kind: "divider",
  label: "Divider",
  group: "Layout",
  schema: z.object({
    orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
    spacing: z.enum(["sm", "md", "lg"]).default("md"),
  }),
  defaults: {
    orientation: "horizontal" as const,
    spacing: "md" as const,
  },
  summary: (v) => `${v.orientation} divider`,
});

const navManifest = manifest<NavValues>({
  context: "app",
  kind: "nav",
  label: "Nav",
  group: "Navigation",
  shortcut: "N",
  schema: NavSchema,
  defaults: NAV_DEFAULTS,
  summary: (v) => `${v.items.length} items`,
});

const heroManifest = manifest<HeroValues>({
  context: "app",
  kind: "hero",
  label: "Hero",
  group: "Content",
  shortcut: "O",
  schema: HeroSchema,
  defaults: HERO_DEFAULTS,
  summary: (v) => v.title || "Hero",
});

const ctaSectionManifest = manifest({
  context: "app",
  kind: "cta-section",
  label: "CTA section",
  group: "Content",
  shortcut: "A",
  schema: z.object({
    title: z.string().default(""),
    body: z.string().default(""),
    cta: z.string().default(""),
    ctaHref: z.string().default(""),
    variant: z.enum(["primary", "muted"]).default("primary"),
  }),
  defaults: {
    title: "",
    body: "",
    cta: "",
    ctaHref: "",
    variant: "primary" as const,
  },
  summary: (v) => v.title || "CTA",
});

const cardGridManifest = manifest<CardGridValues>({
  context: "app",
  kind: "card-grid",
  label: "Card grid",
  group: "Content",
  shortcut: "G",
  schema: CardGridSchema,
  defaults: CARD_GRID_DEFAULTS,
  summary: (v) => `${v.cards.length} cards · ${v.columns} cols`,
});

const textManifest = manifest<TextValues>({
  context: "app",
  kind: "text",
  label: "Text",
  group: "Content",
  shortcut: "T",
  schema: TextSchema,
  defaults: TEXT_DEFAULTS,
  summary: (v) => v.markdown.slice(0, 80) || "Empty text",
});

const listManifest = manifest<ListValues>({
  context: "app",
  kind: "list",
  label: "List",
  group: "Content",
  shortcut: "L",
  schema: ListSchema,
  defaults: LIST_DEFAULTS,
  summary: (v) => `${v.items.length} items`,
});

const imageManifest = manifest({
  context: "app",
  kind: "image",
  label: "Image",
  group: "Content",
  shortcut: "M",
  schema: z.object({
    // imageRef replaces legacy `src`. Renderers read imageRef ?? src for back-compat.
    imageRef: z.string().default(""),
    alt: z.string().default(""),
    caption: z.string().default(""),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    fit: z.enum(["cover", "contain"]).default("cover"),
  }),
  defaults: {
    imageRef: "",
    alt: "",
    caption: "",
    fit: "cover" as const,
  } as {
    imageRef: string;
    alt: string;
    caption: string;
    width?: number;
    height?: number;
    fit: "cover" | "contain";
  },
  summary: (v) => v.alt || "Image",
});

const statManifest = manifest({
  context: "app",
  kind: "stat",
  label: "Stat",
  group: "Content",
  shortcut: "C",
  schema: z.object({
    label: z.string().default(""),
    value: z.string().default(""),
    change: z.string().default(""),
    changeKind: z.enum(["up", "down", "none"]).default("none"),
  }),
  defaults: {
    label: "",
    value: "",
    change: "",
    changeKind: "none" as const,
  },
  summary: (v) => `${v.label}: ${v.value}`,
});

const avatarManifest = manifest({
  context: "app",
  kind: "avatar",
  label: "Avatar",
  group: "Content",
  shortcut: "V",
  schema: z.object({
    name: z.string().default(""),
    src: z.string().default(""),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    subtitle: z.string().default(""),
  }),
  defaults: {
    name: "",
    src: "",
    size: "md" as const,
    subtitle: "",
  },
  summary: (v) => v.name || "Avatar",
});

const badgeManifest = manifest({
  context: "app",
  kind: "badge",
  label: "Badge",
  group: "Content",
  shortcut: "Y",
  schema: z.object({
    label: z.string().default(""),
    variant: z
      .enum(["default", "primary", "success", "warn", "error", "outline"])
      .default("default"),
  }),
  defaults: { label: "", variant: "default" as const },
  summary: (v) => v.label || "Badge",
});

const formManifest = manifest<FormValues>({
  context: "app",
  kind: "form",
  label: "Form",
  group: "Input",
  shortcut: "F",
  schema: FormSchema,
  defaults: FORM_DEFAULTS,
  summary: (v) => `${v.fields.length} fields`,
});

// Button action is a discriminated union: none / link to a screen / external url.
// We model it as a flat object for simpler RHF handling — the editor switches
// the visible secondary fields based on `action.kind`.
const ButtonActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("screen"),
    screenId: z.string().default(""),
  }),
  z.object({ kind: z.literal("url"), href: z.string().default("") }),
]);

const buttonManifest = manifest({
  context: "app",
  kind: "button",
  label: "Button",
  group: "Input",
  shortcut: "B",
  schema: z.object({
    label: z.string().default("Action"),
    variant: z
      .enum(["primary", "secondary", "ghost", "destructive"])
      .default("primary"),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    action: ButtonActionSchema.default({ kind: "none" }),
    icon: z.string().default(""),
    disabled: z.boolean().default(false),
  }),
  defaults: {
    label: "Action",
    variant: "primary" as const,
    size: "md" as const,
    action: { kind: "none" } as z.infer<typeof ButtonActionSchema>,
    icon: "",
    disabled: false,
  },
  summary: (v) => v.label || "Button",
});

const inputManifest = manifest({
  context: "app",
  kind: "input",
  label: "Input",
  group: "Input",
  shortcut: "I",
  schema: z.object({
    label: z.string().default(""),
    placeholder: z.string().default(""),
    type: z.string().default("text"),
    required: z.boolean().default(false),
    helpText: z.string().default(""),
    defaultValue: z.string().default(""),
  }),
  defaults: {
    label: "",
    placeholder: "",
    type: "text",
    required: false,
    helpText: "",
    defaultValue: "",
  },
  summary: (v) => v.label || v.placeholder || "Input",
});

const bannerManifest = manifest({
  context: "app",
  kind: "banner",
  label: "Banner",
  group: "Feedback",
  shortcut: "R",
  schema: z.object({
    variant: z.enum(["info", "warn", "success", "error"]).default("info"),
    text: z.string().default(""),
    dismissible: z.boolean().default(false),
    ctaLabel: z.string().default(""),
  }),
  defaults: {
    variant: "info" as const,
    text: "",
    dismissible: false,
    ctaLabel: "",
  },
  summary: (v) => `${v.variant}: ${(v.text || "").slice(0, 50)}`,
});

const emptyStateManifest = manifest({
  context: "app",
  kind: "empty-state",
  label: "Empty state",
  group: "Feedback",
  shortcut: "X",
  schema: z.object({
    title: z.string().default(""),
    body: z.string().default(""),
    icon: z.string().default(""),
    ctaLabel: z.string().default(""),
    ctaHref: z.string().default(""),
  }),
  defaults: {
    title: "",
    body: "",
    icon: "",
    ctaLabel: "",
    ctaHref: "",
  },
  summary: (v) => v.title || "Empty state",
});

// ────────────────────────────── app — mobile-only ──────────────────────────────

const statusBarManifest = manifest({
  context: "app",
  kind: "status-bar",
  label: "Status bar",
  group: "Mobile",
  platform: "mobile",
  shortcut: "Q",
  schema: z.object({
    variant: z.enum(["light", "dark"]).default("light"),
    time: z.string().default(""),
    batteryPct: z.number().int().min(0).max(100).optional(),
  }),
  defaults: { variant: "light" as const, time: "" } as {
    variant: "light" | "dark";
    time: string;
    batteryPct?: number;
  },
  summary: (v) => `Status bar (${v.variant})`,
});

const bottomNavManifest = manifest({
  context: "app",
  kind: "bottom-nav",
  label: "Bottom nav",
  group: "Mobile",
  platform: "mobile",
  shortcut: "U",
  schema: z.object({
    items: z
      .array(
        z.object({
          label: z.string().default(""),
          icon: z.string().default(""),
          screenId: z.string().default(""),
        }),
      )
      .default([]),
    activeIndex: z.number().int().min(0).default(0),
  }),
  defaults: {
    items: [] as { label: string; icon: string; screenId: string }[],
    activeIndex: 0,
  },
  summary: (v) => `${v.items.length} items`,
});

const listRowManifest = manifest({
  context: "app",
  kind: "list-row",
  label: "List row",
  group: "Mobile",
  platform: "mobile",
  shortcut: "K",
  schema: z.object({
    title: z.string().default(""),
    subtitle: z.string().default(""),
    leading: z.string().default(""),
    trailing: z.string().default(""),
    chevron: z.boolean().default(false),
  }),
  defaults: {
    title: "",
    subtitle: "",
    leading: "",
    trailing: "",
    chevron: false,
  },
  summary: (v) => v.title || "List row",
});

const fabManifest = manifest({
  context: "app",
  kind: "fab",
  label: "FAB",
  group: "Mobile",
  platform: "mobile",
  shortcut: "P",
  schema: z.object({
    label: z.string().default("+"),
    icon: z.string().default(""),
    position: z.enum(["br", "bl", "center"]).default("br"),
    action: ButtonActionSchema.default({ kind: "none" }),
  }),
  defaults: {
    label: "+",
    icon: "",
    position: "br" as const,
    action: { kind: "none" } as z.infer<typeof ButtonActionSchema>,
  },
  summary: (v) => `FAB: ${v.label}`,
});

const sheetManifest = manifest({
  context: "app",
  kind: "sheet",
  label: "Sheet",
  group: "Mobile",
  platform: "mobile",
  shortcut: "Z",
  schema: z.object({
    title: z.string().default(""),
    body: z.string().default(""),
    height: z.enum(["auto", "half", "full"]).default("auto"),
    primaryCta: z.string().default(""),
  }),
  defaults: {
    title: "",
    body: "",
    height: "auto" as const,
    primaryCta: "",
  },
  summary: (v) => v.title || "Sheet",
});

// ────────────────────────────── agent ──────────────────────────────

// Agent-step block data is { role, spec: object }. The editor's form schema
// (AgentStepSchema) uses specJson:string instead — that's a form-only concern,
// not the persisted data shape. Stage 4 normalises this gap.
const agentStepManifest = manifest({
  context: "agent",
  kind: "agent-step",
  label: "Step",
  group: "Agent",
  shortcut: "S",
  schema: z.object({
    role: z.enum(["input", "tool", "llm", "output"]).default("input"),
    spec: z.record(z.string(), z.unknown()).default({}),
  }),
  defaults: { role: "input" as const, spec: {} as Record<string, unknown> },
  summary: (v) => `[${v.role}] step`,
});

// ────────────────────────────── layout ──────────────────────────────

// docs context layout manifest.
// Shortcut "X" (unused in docs context).
const layoutDocsManifest = manifest<LayoutValues>({
  context: "docs",
  kind: "layout",
  label: "Layout",
  group: "Structure",
  shortcut: "X",
  schema: LayoutSchema,
  defaults: LAYOUT_DEFAULTS,
  summary: (v) =>
    `${v.mode}${v.mode === "grid" ? ` (${v.cols ?? 2} cols)` : ""} — ${v.gap} gap`,
});

// app context layout manifest.
// Shortcut "J" (unused in app context).
const layoutAppManifest = manifest<LayoutValues>({
  context: "app",
  kind: "layout",
  label: "Layout",
  group: "Structure",
  shortcut: "J",
  schema: LayoutSchema,
  defaults: LAYOUT_DEFAULTS,
  summary: (v) =>
    `${v.mode}${v.mode === "grid" ? ` (${v.cols ?? 2} cols)` : ""} — ${v.gap} gap`,
});

// ────────────────────────────── aggregate ──────────────────────────────

export const blockManifests = {
  // docs
  heading: headingManifest,
  paragraph: paragraphManifest,
  blockquote: blockquoteManifest,
  callout: calloutManifest,
  canvas: canvasManifest,
  "code-block": codeBlockManifest,
  "bullet-list": bulletListManifest,
  "numbered-list": numberedListManifest,
  checklist: checklistManifest,
  table: tableManifest,
  rule: ruleManifest,
  figure: figureManifest,
  "link-card": linkCardManifest,
  definition: definitionManifest,
  decision: decisionManifest,
  persona: personaManifest,
  "user-story": userStoryManifest,
  risk: riskManifest,
  metric: metricManifest,
  milestone: milestoneManifest,
  "release-note": releaseNoteManifest,
  "color-swatch": colorSwatchManifest,
  "journey-step": journeyStepManifest,
  "api-endpoint": apiEndpointManifest,
  "math-block": mathBlockManifest,
  // shared structure — docs context is the canonical manifest; renderer maps
  // register layout in both docs and app explicitly.
  layout: layoutDocsManifest,
  // app
  "page-header": pageHeaderManifest,
  sidebar: sidebarManifest,
  footer: footerManifest,
  tabs: tabsManifest,
  modal: modalManifest,
  divider: dividerManifest,
  nav: navManifest,
  hero: heroManifest,
  "cta-section": ctaSectionManifest,
  "card-grid": cardGridManifest,
  text: textManifest,
  list: listManifest,
  image: imageManifest,
  stat: statManifest,
  avatar: avatarManifest,
  badge: badgeManifest,
  form: formManifest,
  button: buttonManifest,
  input: inputManifest,
  banner: bannerManifest,
  "empty-state": emptyStateManifest,
  "status-bar": statusBarManifest,
  "bottom-nav": bottomNavManifest,
  "list-row": listRowManifest,
  fab: fabManifest,
  sheet: sheetManifest,
  // agent
  "agent-step": agentStepManifest,
  // biome-ignore lint/suspicious/noExplicitAny: Each manifest is parameterised over its kind's defaults type; the aggregate widens via `any` because TS can't infer a common contravariant `summary` signature across heterogeneous T.
} as const satisfies Record<BlockKind, BlockManifest<any>>;

export type AnyBlockManifest = (typeof blockManifests)[BlockKind];

export function manifestFor(kind: BlockKind): AnyBlockManifest {
  return blockManifests[kind];
}

export function defaultDataFor(kind: BlockKind): Record<string, unknown> {
  // Return a structuredClone so callers can mutate freely.
  return structuredClone(
    blockManifests[kind].defaults as Record<string, unknown>,
  );
}

export function summaryFor(
  kind: BlockKind,
  data: Record<string, unknown>,
): string {
  const m = blockManifests[kind];
  if (typeof m.summary === "function") {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: manifest summary is parameterised over the kind's defaults type.
      return (m.summary as (v: any) => string)(data);
    } catch {
      return m.label;
    }
  }
  return m.label;
}

export type BlockKindSpec = {
  context: BlockContext;
  kind: BlockKind;
  label: string;
  group: string;
  platform?: "mobile";
  shortcut?: string;
};

const KIND_ORDER: BlockKind[] = Object.keys(blockManifests) as BlockKind[];

export const BLOCK_KIND_REGISTRY: BlockKindSpec[] = [
  ...KIND_ORDER.map((kind) => {
    const m = blockManifests[kind];
    return {
      context: m.context,
      kind: m.kind,
      label: m.label,
      group: m.group,
      platform: m.platform,
      shortcut: m.shortcut,
    };
  }),
  // layout appears in both docs (via blockManifests) and app.
  // The app-context entry is registered explicitly here so insert slots
  // and kind pickers include it without duplicating the manifest object.
  {
    context: "app" as BlockContext,
    kind: "layout" as BlockKind,
    label: layoutAppManifest.label,
    group: layoutAppManifest.group,
    shortcut: layoutAppManifest.shortcut,
  },
];

export function blockKindsForContext(
  context: BlockContext,
  platform: "mobile" | "web" = "web",
): BlockKindSpec[] {
  return BLOCK_KIND_REGISTRY.filter(
    (s) =>
      s.context === context &&
      (s.platform === undefined || s.platform === platform),
  );
}
