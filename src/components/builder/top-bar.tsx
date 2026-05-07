"use client";

import { Download, Pencil, Redo2, Undo2 } from "lucide-react";
import { useState } from "react";
import { selectCanRedo, selectCanUndo } from "@/builder/selectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useBuilderUiStore } from "@/services/stores";

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
  const showCanvasModeToggle =
    topMode === "app" &&
    (planMeta?.kind === "web" || planMeta?.kind === "mobile");

  const kind = planMeta?.kind ?? "—";
  const title = project?.title ?? planMeta?.id ?? "Untitled plan";

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
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
          {planMeta?.id ? (
            <div className="truncate text-[10px] text-muted-foreground">
              {planMeta.id}
            </div>
          ) : null}
        </div>
      </div>

      <ToggleGroup
        value={[topMode]}
        onValueChange={(values) => {
          const next = values[0];
          if (next === "docs" || next === "app") setTopMode(next);
        }}
        size="sm"
        variant="outline"
        aria-label="Top mode"
      >
        <ToggleGroupItem value="docs" aria-label="Docs mode">
          Docs
        </ToggleGroupItem>
        <ToggleGroupItem value="app" aria-label="App design mode">
          App design
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
            <ToggleGroupItem value="screen">Screen</ToggleGroupItem>
            <ToggleGroupItem value="flow">Flow</ToggleGroupItem>
          </ToggleGroup>
        ) : null}
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
          <ToggleGroupItem value="detail">Detail</ToggleGroupItem>
          <ToggleGroupItem value="wireframe">Wire</ToggleGroupItem>
        </ToggleGroup>

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
          {planMeta?.id ? <ExportMenu planId={planMeta.id} /> : null}
        </div>
      </div>
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
        className="group/title flex max-w-full items-center gap-1.5 rounded px-1 -mx-1 py-0.5 text-left hover:bg-accent"
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
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => trigger("png")}>
          Export as PNG
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
          Open print view
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
