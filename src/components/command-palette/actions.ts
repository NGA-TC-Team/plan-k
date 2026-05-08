"use client";

import { selectCanRedo, selectCanUndo } from "@/builder/selectors";
import type { BuilderStore, createBuilderStore } from "@/builder/store";
import type { BlockKind, ProjectKind } from "@/builder/types/entity";
import type { Project } from "@/data/projects";
import type {
  BuilderUiState,
  CanvasMode,
  TopMode,
} from "@/services/stores/builder-ui.store";
import type { Theme } from "@/services/stores/theme-store";

export type BuilderStoreHook = ReturnType<typeof createBuilderStore>;

// Minimal router contract — Next.js App Router exposes push().
export type RouterLike = { push: (href: string) => void };

// Ambient context every action receives. Code-side concerns (router,
// stores, dispatch) live here so the JSON stays declarative.
export type CommandContext = {
  router: RouterLike;
  builder: BuilderStoreHook | null;
  builderDispatch: BuilderStore["dispatch"] | null;
  ui: {
    setHelpSheetOpen: (open: boolean) => void;
    setPaletteOpen: (open: boolean) => void;
  };
  builderUi: BuilderUiState;
  theme: {
    set: (t: Theme) => void;
    toggle: () => void;
    current: Theme;
  };
  projects: Project[];
  createProject: (input: {
    kind: ProjectKind;
    title: string;
    summary?: string;
    seed?: boolean;
  }) => Promise<Project>;
};

export type CommandWhen =
  | "always"
  | "builder"
  | "builder.docs"
  | "builder.app"
  | "builder.agent"
  | "builder.canUndo"
  | "builder.canRedo"
  | "builder.selected"
  | "builder.canInsert";

export type ActionHandler = (
  ctx: CommandContext,
  args: Record<string, unknown> | undefined,
) => void | Promise<void>;

// ──────────────────────────────────────────────────────────────────
// Predicates
// ──────────────────────────────────────────────────────────────────

export function evaluateWhen(when: CommandWhen, ctx: CommandContext): boolean {
  if (when === "always") return true;
  if (!ctx.builder) return false;
  const state = ctx.builder.getState().state;
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  switch (when) {
    case "builder":
      return true;
    case "builder.docs":
      return ctx.builderUi.topMode === "docs";
    case "builder.app":
      return ctx.builderUi.topMode === "app";
    case "builder.agent":
      return planKind === "agent";
    case "builder.canUndo":
      return selectCanUndo(state);
    case "builder.canRedo":
      return selectCanRedo(state);
    case "builder.selected":
      return state.selection.kind === "node";
    case "builder.canInsert":
      return Boolean(currentInsertParent(ctx));
    default:
      return false;
  }
}

export function currentInsertParent(ctx: CommandContext): string | null {
  if (!ctx.builder) return null;
  const state = ctx.builder.getState().state;
  const planKind = Object.values(state.plans)[0]?.kind ?? null;
  const { topMode, currentSectionId } = ctx.builderUi;
  if (topMode === "docs") return currentSectionId;
  if (topMode === "app") return state.currentScreenId;
  if (planKind === "agent") return currentSectionId;
  return null;
}

// ──────────────────────────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────────────────────────

export const ACTIONS: Record<string, ActionHandler> = {
  navigate: (ctx, args) => {
    const to = String(args?.to ?? "/");
    ctx.router.push(to);
  },

  "theme.toggle": (ctx) => ctx.theme.toggle(),
  "theme.set": (ctx, args) => {
    const t = args?.theme;
    if (t === "dark" || t === "light") ctx.theme.set(t);
  },

  "help.open": (ctx) => ctx.ui.setHelpSheetOpen(true),
  "panel.toggleLeftRail": (ctx) => ctx.builderUi.toggleLeftRail(),

  "builder.setTopMode": (ctx, args) => {
    const mode = args?.mode as TopMode | undefined;
    if (mode === "docs" || mode === "app" || mode === "backlog") {
      ctx.builderUi.setTopMode(mode);
    }
  },
  "builder.setCanvasMode": (ctx, args) => {
    const mode = args?.mode as CanvasMode | undefined;
    if (mode === "screen" || mode === "flow") {
      ctx.builderUi.setCanvasMode(mode);
    }
  },
  "builder.setViewMode": (ctx, args) => {
    if (!ctx.builderDispatch) return;
    const mode = args?.mode;
    if (mode === "detail" || mode === "wireframe") {
      ctx.builderDispatch({ type: "SWITCH_VIEW_MODE", mode });
    }
  },

  "builder.undo": (ctx) => ctx.builderDispatch?.({ type: "UNDO" }),
  "builder.redo": (ctx) => ctx.builderDispatch?.({ type: "REDO" }),

  "builder.beginEditSelection": (ctx) => {
    if (!ctx.builder || !ctx.builderDispatch) return;
    const sel = ctx.builder.getState().state.selection;
    if (sel.kind === "node") {
      ctx.builderDispatch({ type: "BEGIN_EDIT", nodeId: sel.id });
    }
  },
  "builder.deleteSelection": (ctx) => {
    if (!ctx.builder || !ctx.builderDispatch) return;
    const sel = ctx.builder.getState().state.selection;
    if (sel.kind === "node") {
      ctx.builderDispatch({ type: "DELETE_BLOCK", nodeId: sel.id });
    }
  },

  "builder.switchScreen": (ctx, args) => {
    const screenId = args?.screenId;
    if (typeof screenId === "string" && ctx.builderDispatch) {
      ctx.builderDispatch({ type: "SWITCH_SCREEN", screenId });
    }
  },
  "builder.setSection": (ctx, args) => {
    const sectionId = args?.sectionId;
    if (typeof sectionId === "string") {
      ctx.builderUi.setCurrentSectionId(sectionId);
    }
  },
  "builder.insertBlock": async (ctx, args) => {
    const kind = args?.kind as BlockKind | undefined;
    if (!kind || !ctx.builderDispatch) return;
    const parentId = currentInsertParent(ctx);
    if (!parentId) return;
    const { defaultDataFor } = await import("@/builder/defaults");
    ctx.builderDispatch({
      type: "INSERT_BLOCK",
      parentId,
      block: {
        id: crypto.randomUUID(),
        parentId,
        kind,
        data: defaultDataFor(kind),
      },
    });
  },

  "create.project": async (ctx, args) => {
    const kind = args?.kind as ProjectKind | undefined;
    if (!kind) return;
    const title = window.prompt(
      `새 ${kind} 프로젝트 이름을 입력하세요`,
      "Untitled",
    );
    if (!title) return;
    const seed = window.confirm(
      "데모 시드 콘텐츠를 포함할까요? (취소=빈 프로젝트)",
    );
    const project = await ctx.createProject({ kind, title, seed });
    ctx.router.push(`/plan/${project.id}`);
  },

  "export.run": (ctx, args) => {
    if (!ctx.builder) return;
    const planId = Object.values(ctx.builder.getState().state.plans)[0]?.id;
    if (!planId) return;
    const format = args?.format === "png" ? "png" : "pdf";
    window.open(
      `/api/exports/${format}?planId=${encodeURIComponent(planId)}`,
      "_blank",
      "noopener",
    );
  },
  "export.print": (ctx) => {
    if (!ctx.builder) return;
    const planId = Object.values(ctx.builder.getState().state.plans)[0]?.id;
    if (!planId) return;
    window.open(
      `/plan/${encodeURIComponent(planId)}/print`,
      "_blank",
      "noopener",
    );
  },
};
