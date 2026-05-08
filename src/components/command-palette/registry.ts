"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Eye,
  FileImage,
  FileText,
  FolderKanban,
  Home,
  KanbanSquare,
  Keyboard,
  LayoutDashboard,
  Monitor,
  Moon,
  PanelLeft,
  Pencil,
  Plus,
  Printer,
  Redo2,
  Smartphone,
  Sun,
  SunMoon,
  Trash2,
  Undo2,
  Workflow,
  Wrench,
} from "lucide-react";
import { blockKindsForContext } from "@/builder/defaults";
import type { BlockContext } from "@/builder/types/entity";
import {
  ACTIONS,
  type ActionHandler,
  type CommandContext,
  type CommandWhen,
  currentInsertParent,
  evaluateWhen,
} from "./actions";
import commandsData from "./commands.json";

// ──────────────────────────────────────────────────────────────────
// Schema (mirrors commands.json)
// ──────────────────────────────────────────────────────────────────

export type StaticCommandEntry = {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  icon?: string;
  shortcut?: string[];
  action: string;
  args?: Record<string, unknown>;
  when?: CommandWhen;
};

export type ResolvedCommand = {
  id: string;
  group: string;
  label: string;
  keywords?: string[];
  icon?: LucideIcon;
  iconNode?: React.ReactNode;
  shortcut?: string[];
  run: (ctx: CommandContext) => void | Promise<void>;
};

export type GroupMap = Record<string, string>;

// Single source of truth for icon strings → React components. Adding a new
// icon to commands.json requires adding it here too — by design, so we keep
// the bundle small.
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  FolderKanban,
  Monitor,
  Smartphone,
  Bot,
  Sun,
  Moon,
  SunMoon,
  Keyboard,
  PanelLeft,
  FileText,
  LayoutDashboard,
  KanbanSquare,
  Workflow,
  Eye,
  Wrench,
  Undo2,
  Redo2,
  Pencil,
  Trash2,
  Plus,
  FileImage,
  Printer,
};

// ──────────────────────────────────────────────────────────────────
// Loaders
// ──────────────────────────────────────────────────────────────────

const data = commandsData as {
  groups: GroupMap;
  commands: StaticCommandEntry[];
};

export const COMMAND_GROUPS: GroupMap = data.groups;

function resolveStatic(entry: StaticCommandEntry): ResolvedCommand {
  const Icon = entry.icon ? ICON_MAP[entry.icon] : undefined;
  const handler: ActionHandler | undefined = ACTIONS[entry.action];
  const run: ResolvedCommand["run"] = async (ctx) => {
    if (!handler) {
      // eslint-disable-next-line no-console
      console.warn(`[palette] unknown action: ${entry.action}`);
      return;
    }
    await handler(ctx, entry.args);
  };
  return {
    id: entry.id,
    group: entry.group,
    label: entry.label,
    keywords: entry.keywords,
    icon: Icon,
    shortcut: entry.shortcut,
    run,
  };
}

// Dynamic: project list, sections, screens, block insert. Each factory
// inspects the live context and returns a flat array of ResolvedCommands.
function projectCommands(ctx: CommandContext): ResolvedCommand[] {
  return ctx.projects.slice(0, 24).map((p) => ({
    id: `plan.${p.id}`,
    group: "plan",
    label: p.title,
    keywords: [p.kind, p.id],
    icon: p.kind === "web" ? Monitor : p.kind === "mobile" ? Smartphone : Bot,
    run: () => {
      ctx.router.push(`/plan/${p.id}`);
    },
  }));
}

function sectionCommands(ctx: CommandContext): ResolvedCommand[] {
  if (!ctx.builder) return [];
  const state = ctx.builder.getState().state;
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  return Object.values(state.sections).map((section) => ({
    id: `section.${section.id}`,
    group: "section",
    label: section.title,
    keywords: ["section", section.id],
    icon: FileText,
    run: () => {
      ctx.builderUi.setTopMode(planKind === "agent" ? "app" : "docs");
      ctx.builderUi.setCurrentSectionId(section.id);
    },
  }));
}

function screenCommands(ctx: CommandContext): ResolvedCommand[] {
  if (!ctx.builder || !ctx.builderDispatch) return [];
  const state = ctx.builder.getState().state;
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  return Object.values(state.screens).map((screen) => ({
    id: `screen.${screen.id}`,
    group: "section",
    label: screen.title,
    keywords: ["screen", screen.id],
    icon: planKind === "mobile" ? Smartphone : Monitor,
    run: () => {
      ctx.builderUi.setTopMode("app");
      ctx.builderDispatch?.({ type: "SWITCH_SCREEN", screenId: screen.id });
    },
  }));
}

function insertBlockCommands(ctx: CommandContext): ResolvedCommand[] {
  if (!ctx.builder || !ctx.builderDispatch) return [];
  const parentId = currentInsertParent(ctx);
  if (!parentId) return [];
  const state = ctx.builder.getState().state;
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  const context: BlockContext =
    ctx.builderUi.topMode === "docs"
      ? "docs"
      : ctx.builderUi.topMode === "app"
        ? "app"
        : planKind === "agent"
          ? "agent"
          : "docs";
  const platform: "web" | "mobile" = planKind === "mobile" ? "mobile" : "web";
  return blockKindsForContext(context, platform).map((spec) => ({
    id: `insert.${spec.kind}`,
    group: "block",
    label: `${spec.group} · ${spec.label}`,
    keywords: ["insert", spec.kind, spec.group, spec.label],
    icon: Plus,
    run: () => ACTIONS["builder.insertBlock"]?.(ctx, { kind: spec.kind }),
  }));
}

// Public entry: resolve everything for the current frame. Pure function —
// no React state. The palette calls this on every render with the current
// context; results are filtered by `evaluateWhen` for static entries.
export function resolveCommands(ctx: CommandContext): ResolvedCommand[] {
  const statics = data.commands
    .filter((c) => evaluateWhen(c.when ?? "always", ctx))
    .map(resolveStatic);

  const dynamic: ResolvedCommand[] = [
    ...projectCommands(ctx),
    ...sectionCommands(ctx),
    ...screenCommands(ctx),
    ...insertBlockCommands(ctx),
  ];

  return [...statics, ...dynamic];
}
