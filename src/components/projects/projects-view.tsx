"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectKind } from "@/builder/types/entity";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsQuery,
} from "@/data/projects";

const KIND_OPTIONS: { value: ProjectKind; label: string; hint: string }[] = [
  {
    value: "web",
    label: "Web app",
    hint: "Multi-screen web plan + browser frame",
  },
  {
    value: "mobile",
    label: "Mobile app",
    hint: "Mobile plan with device frame + screen flow",
  },
  {
    value: "agent",
    label: "AI agent",
    hint: "Scenario sections + node graph",
  },
];

export function ProjectsView() {
  const projectsQuery = useProjectsQuery();
  const deleteMutation = useDeleteProjectMutation();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Plans you've started in this workspace.
          </p>
        </div>
        <CreateProjectDialog />
      </header>

      <section>
        {projectsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : null}
        {projectsQuery.isError ? (
          <div className="text-sm text-destructive">
            Failed to load projects: {String(projectsQuery.error)}
          </div>
        ) : null}
        {projectsQuery.data && projectsQuery.data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No projects yet. Create your first one — or open a demo from the
            home page.
          </div>
        ) : null}
        <ul className="space-y-2">
          {projectsQuery.data?.map((project) => (
            <li
              key={project.id}
              className="group flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Link href={`/plan/${project.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="uppercase">
                    {project.kind}
                  </Badge>
                  <div className="truncate font-medium">{project.title}</div>
                </div>
                {project.summary ? (
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {project.summary}
                  </div>
                ) : null}
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  /plan/{project.id}
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    confirm(`Delete "${project.title}"? This cannot be undone.`)
                  ) {
                    deleteMutation.mutate(project.id);
                  }
                }}
                aria-label={`Delete ${project.title}`}
                title="Delete project"
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← back to home
        </Link>
      </section>
    </main>
  );
}

function CreateProjectDialog() {
  const router = useRouter();
  const createMutation = useCreateProjectMutation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ProjectKind>("web");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const reset = () => {
    setKind("web");
    setTitle("");
    setSummary("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const project = await createMutation.mutateAsync({
      kind,
      title: trimmed,
      summary: summary.trim() || undefined,
    });
    setOpen(false);
    reset();
    router.push(`/plan/${project.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button">
            <span>New project</span>
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Pick a kind and give it a title. A starter plan will be seeded
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Kind</Label>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  className={`rounded-md border p-3 text-left text-sm transition-colors ${
                    kind === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {opt.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My new app"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-summary">Summary (optional)</Label>
            <Textarea
              id="project-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-line description"
              rows={2}
            />
          </div>

          {createMutation.isError ? (
            <div className="text-sm text-destructive">
              {String(createMutation.error)}
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
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? "Creating…" : "Create + open"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
