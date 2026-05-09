"use client";

import {
  Clock,
  Download,
  Eye,
  FileImage,
  FileText,
  History,
  Home,
  KanbanSquare,
  LayoutDashboard,
  Monitor,
  Moon,
  Pencil,
  Printer,
  Redo2,
  Smartphone,
  Sun,
  Undo2,
  Workflow,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { selectCanRedo, selectCanUndo } from "@/builder/selectors";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBuilderUiStore, useThemeStore } from "@/services/stores";
import { useVersionsUiStore } from "@/services/stores/versions-ui.store";
import { SaveStatusChip } from "./save-status-chip";
import { VersionsDrawer } from "./versions-drawer";

export function TopBar() {
  const planMeta = useBuilderState((s) => Object.values(s.state.plans)[0]);
  const project = useBuilderState((s) =>
    planMeta ? s.state.projects[planMeta.projectId] : undefined,
  );
  const viewMode = useBuilderState((s) => s.state.viewMode);
  const canUndo = useBuilderState((s) => selectCanUndo(s.state));
  const canRedo = useBuilderState((s) => selectCanRedo(s.state));
  const dispatch = useBuilderDispatch();

  const topMode = useBuilderUiStore((s) => s.topMode);
  const setTopMode = useBuilderUiStore((s) => s.setTopMode);
  const canvasMode = useBuilderUiStore((s) => s.canvasMode);
  const setCanvasMode = useBuilderUiStore((s) => s.setCanvasMode);
  const zenMode = useBuilderUiStore((s) => s.zenMode);
  const showCanvasModeToggle =
    topMode === "app" &&
    (planMeta?.kind === "web" || planMeta?.kind === "mobile");
  const showViewModeToggle = topMode === "app";

  const kind = planMeta?.kind ?? "—";
  const title = project?.title ?? planMeta?.id ?? "Untitled plan";

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b bg-background px-4 transition-[padding] duration-200 ease-out",
        zenMode ? "py-1" : "py-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          title="plan-k home"
          aria-label="plan-k home"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 gap-1.5 px-2 font-semibold tracking-tight",
          })}
        >
          <Home className="size-3.5" />
          <span>plan-k</span>
        </Link>
        <Badge variant="secondary" className="uppercase tracking-wide">
          {kind}
        </Badge>
        <div className="min-w-0">
          {project ? (
            <ProjectMetaEditor
              project={project}
              fallbackTitle={title}
              planId={planMeta?.id}
            />
          ) : (
            <div className="truncate text-sm font-medium">{title}</div>
          )}
          <div className="flex items-center gap-2">
            {planMeta?.id ? (
              <span className="truncate text-[10px] text-muted-foreground">
                {planMeta.id}
              </span>
            ) : null}
            <SaveStatusChip />
          </div>
        </div>
      </div>

      <ToggleGroup
        value={[topMode]}
        onValueChange={(values) => {
          const next = values[0];
          if (next === "docs" || next === "app" || next === "backlog")
            setTopMode(next);
        }}
        size="sm"
        variant="outline"
        aria-label="Top mode"
      >
        <ToggleGroupItem value="backlog" aria-label="Backlog mode">
          <KanbanSquare className="size-3.5" />
          <span className={zenMode ? "sr-only" : undefined}>Backlog</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="docs" aria-label="Docs mode">
          <FileText className="size-3.5" />
          <span className={zenMode ? "sr-only" : undefined}>Docs</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="app" aria-label="App design mode">
          <LayoutDashboard className="size-3.5" />
          <span className={zenMode ? "sr-only" : undefined}>App design</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-2">
        {showCanvasModeToggle ? (
          <ToggleGroup
            value={[canvasMode]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "screen" || next === "flow") setCanvasMode(next);
            }}
            size="sm"
            variant="outline"
            aria-label="Canvas mode"
          >
            <ToggleGroupItem value="screen">
              <Smartphone className="size-3.5" />
              <span className={zenMode ? "sr-only" : undefined}>Screen</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="flow">
              <Workflow className="size-3.5" />
              <span className={zenMode ? "sr-only" : undefined}>Flow</span>
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
        {showViewModeToggle ? (
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "detail" || next === "wireframe") {
                dispatch({ type: "SWITCH_VIEW_MODE", mode: next });
              }
            }}
            size="sm"
            variant="outline"
            aria-label="View mode"
          >
            <ToggleGroupItem value="detail">
              <Eye className="size-3.5" />
              <span className={zenMode ? "sr-only" : undefined}>Detail</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="wireframe">
              <Wrench className="size-3.5" />
              <span className={zenMode ? "sr-only" : undefined}>Wire</span>
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}

        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "UNDO" })}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRedo}
            onClick={() => dispatch({ type: "REDO" })}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => useVersionsUiStore.getState().openDrawer()}
            aria-label="Version history"
            title="Version history"
          >
            <History className="size-4" />
          </Button>
          {planMeta?.id ? <ExportMenu planId={planMeta.id} /> : null}
          <ThemeToggle />
        </div>
      </div>
      {planMeta?.id ? <VersionsDrawer planId={planMeta.id} /> : null}
    </header>
  );
}

type ProjectMetaSnapshot = {
  id: string;
  title: string;
  summary: string;
};

function ProjectMetaEditor({
  project,
  fallbackTitle,
  planId,
}: {
  project: ProjectMetaSnapshot;
  fallbackTitle: string;
  planId: string | undefined;
}) {
  const dispatch = useBuilderDispatch();
  const [open, setOpen] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [summaryInput, setSummaryInput] = useState(project.summary ?? "");

  const beginEdit = () => {
    setTitleInput(project.title);
    setSummaryInput(project.summary ?? "");
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = titleInput.trim();
    const summary = summaryInput.trim();
    const patch: { title?: string; summary?: string } = {};
    if (title && title !== project.title) patch.title = title;
    if (summary !== (project.summary ?? "")) patch.summary = summary;
    if (Object.keys(patch).length > 0) {
      dispatch({
        type: "UPDATE_PROJECT",
        projectId: project.id,
        patch,
      });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={beginEdit}
        className="group/title flex max-w-full items-center gap-1.5 rounded-sm px-1 -mx-1 py-0.5 text-left hover:bg-accent"
        aria-label="Edit project title"
      >
        <span className="truncate text-sm font-medium">{fallbackTitle}</span>
        <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
      </button>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Title and summary appear in the projects list and at the top of
              exported PDFs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="project-meta-title">Title</Label>
            <Input
              id="project-meta-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Project title"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-meta-summary">Summary</Label>
            <Textarea
              id="project-meta-summary"
              value={summaryInput}
              onChange={(e) => setSummaryInput(e.target.value)}
              placeholder="One-line description"
              rows={2}
            />
          </div>

          {planId ? (
            <div className="text-[11px] text-muted-foreground">
              plan id: <code>{planId}</code>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={!titleInput.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExportMenu({ planId }: { planId: string }) {
  const trigger = (kind: "pdf" | "png") => {
    if (typeof window === "undefined") return;
    const url = `/api/exports/${kind}?planId=${encodeURIComponent(planId)}`;
    window.open(url, "_blank", "noopener");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Export"
            title="Export"
          >
            <Download className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => trigger("pdf")}>
          <FileText className="size-3.5" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => trigger("png")}>
          <FileImage className="size-3.5" />
          <span>Export as PNG</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(
              `/plan/${encodeURIComponent(planId)}/print`,
              "_blank",
              "noopener",
            );
          }}
        >
          <Printer className="size-3.5" />
          <span>Open print view</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Mode icon map — resolves to the icon representing the *current* mode choice.
const THEME_MODE_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  auto: Clock,
} as const;

const THEME_MODE_LABELS: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
  auto: "Auto",
};

// Validates a raw string value as a 0–23 integer hour.
// Returns the parsed integer, or null if invalid/out-of-range.
function parseHour(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 23) return null;
  return parsed;
}

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const autoDarkStart = useThemeStore((s) => s.autoDarkStart);
  const autoDarkEnd = useThemeStore((s) => s.autoDarkEnd);
  const setAutoSchedule = useThemeStore((s) => s.setAutoSchedule);
  const ModeIcon = THEME_MODE_ICONS[mode] ?? Sun;

  // Local draft values — committed on blur/Enter; reverts to store value on invalid input.
  const [draftStart, setDraftStart] = useState(String(autoDarkStart));
  const [draftEnd, setDraftEnd] = useState(String(autoDarkEnd));

  function commitStart(raw: string) {
    const hour = parseHour(raw);
    if (hour === null) {
      // Revert to store value on invalid input
      setDraftStart(String(autoDarkStart));
    } else {
      setAutoSchedule(hour, autoDarkEnd);
    }
  }

  function commitEnd(raw: string) {
    const hour = parseHour(raw);
    if (hour === null) {
      setDraftEnd(String(autoDarkEnd));
    } else {
      setAutoSchedule(autoDarkStart, hour);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Theme: ${THEME_MODE_LABELS[mode] ?? mode}`}
            title={`Theme: ${THEME_MODE_LABELS[mode] ?? mode}`}
          >
            <ModeIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(v) =>
            setMode(v as import("@/services/stores").ThemeMode)
          }
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 size-3.5" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 size-3.5" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 size-3.5" />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="auto">
            <Clock className="mr-2 size-3.5" />
            Auto
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {mode === "auto" && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Auto schedule
              </p>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  step={1}
                  value={draftStart}
                  className="h-7 w-12 px-1 text-center text-xs"
                  aria-label="Dark mode start hour (0–23)"
                  onChange={(e) => setDraftStart(e.target.value)}
                  onBlur={(e) => commitStart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitStart(e.currentTarget.value);
                  }}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  step={1}
                  value={draftEnd}
                  className="h-7 w-12 px-1 text-center text-xs"
                  aria-label="Dark mode end hour (0–23)"
                  onChange={(e) => setDraftEnd(e.target.value)}
                  onBlur={(e) => commitEnd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEnd(e.currentTarget.value);
                  }}
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
