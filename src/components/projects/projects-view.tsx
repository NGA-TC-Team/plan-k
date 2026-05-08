"use client";

import {
  ArrowLeft,
  Bot,
  ChevronDown,
  FileText,
  FolderKanban,
  type LucideIcon,
  Monitor,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectKind } from "@/builder/types/entity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsQuery,
} from "@/data/projects";

const KIND_ICON: Record<ProjectKind, LucideIcon> = {
  web: Monitor,
  mobile: Smartphone,
  agent: Bot,
};

type CreateOption = {
  id: string;
  kind: ProjectKind;
  seed: boolean;
  title: string;
  summary: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

// Templates reuse the demo seeds (Janggu / Jukku / Saetbyeol). Empty options
// give an unseeded project of the same kind. The dropdown shows both groups
// so the user can pick a populated starter or a blank canvas in one click.
const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "tmpl-web-janggu",
    kind: "web",
    seed: true,
    title: "Janggu (장구) — 골목상권 운영 SaaS",
    summary:
      "배민·쿠팡이츠·요기요 통합 운영 대시보드. 200+ blocks across docs + 7 screens.",
    label: "Janggu (장구) template",
    hint: "Web SaaS — full PRD + 7 screens",
    icon: Monitor,
  },
  {
    id: "tmpl-mobile-jukku",
    kind: "mobile",
    seed: true,
    title: "Jukku (죽구) — 페어 습관 트래커",
    summary:
      "친구 한 명과 21일 페어링하는 습관 트래커. 200 blocks + 7 mobile screens.",
    label: "Jukku (죽구) template",
    hint: "Mobile B2C — onboarding → today → detail",
    icon: Smartphone,
  },
  {
    id: "tmpl-agent-saetbyeol",
    kind: "agent",
    seed: true,
    title: "Saetbyeol (샛별) — CS 트리아지 에이전트",
    summary:
      "새벽배송 CS 인박스 트리아지 에이전트. Tools + memory + 7-node scenario graph.",
    label: "Saetbyeol (샛별) template",
    hint: "Agent — tools spec + memory + sample interactions",
    icon: Bot,
  },
  {
    id: "empty-web",
    kind: "web",
    seed: false,
    title: "Untitled web project",
    summary: "",
    label: "Empty — Web app",
    hint: "빈 docs 트리 + 빈 Home 화면",
    icon: Monitor,
  },
  {
    id: "empty-mobile",
    kind: "mobile",
    seed: false,
    title: "Untitled mobile project",
    summary: "",
    label: "Empty — Mobile app",
    hint: "빈 docs 트리 + 빈 Main 화면",
    icon: Smartphone,
  },
  {
    id: "empty-agent",
    kind: "agent",
    seed: false,
    title: "Untitled agent project",
    summary: "",
    label: "Empty — AI agent",
    hint: "빈 docs 트리, 노드/엣지 없음",
    icon: Bot,
  },
];

export function ProjectsView() {
  const projectsQuery = useProjectsQuery();
  const deleteMutation = useDeleteProjectMutation();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FolderKanban className="size-6" />
            <span>Projects</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Plans you've started in this workspace.
          </p>
        </div>
        <CreateProjectMenu />
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
                  <Badge variant="secondary" className="uppercase gap-1">
                    {(() => {
                      const Icon = KIND_ICON[project.kind] ?? Monitor;
                      return <Icon className="size-3" />;
                    })()}
                    <span>{project.kind}</span>
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
        <Link
          href="/"
          className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-3" />
          <span>back to home</span>
        </Link>
      </section>
    </main>
  );
}

function CreateProjectMenu() {
  const router = useRouter();
  const createMutation = useCreateProjectMutation();

  const handleCreate = async (option: CreateOption) => {
    const project = await createMutation.mutateAsync({
      kind: option.kind,
      title: option.title,
      summary: option.summary || undefined,
      seed: option.seed,
    });
    router.push(`/plan/${project.id}`);
  };

  const templates = CREATE_OPTIONS.filter((o) => o.seed);
  const empties = CREATE_OPTIONS.filter((o) => !o.seed);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" disabled={createMutation.isPending}>
            <Plus className="size-4" />
            <span>
              {createMutation.isPending ? "Creating…" : "New project"}
            </span>
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-muted-foreground" />
          <span>Templates (seeded with demo content)</span>
        </DropdownMenuLabel>
        {templates.map((opt) => {
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => handleCreate(opt)}
              className="flex-col items-start gap-0.5 py-2"
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="size-3.5" />
                <span>{opt.label}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {opt.hint}
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <FileText className="size-3.5 text-muted-foreground" />
          <span>Empty — start from scratch</span>
        </DropdownMenuLabel>
        {empties.map((opt) => {
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.id}
              onClick={() => handleCreate(opt)}
              className="flex-col items-start gap-0.5 py-2"
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="size-3.5" />
                <span>{opt.label}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {opt.hint}
              </div>
            </DropdownMenuItem>
          );
        })}
        {createMutation.isError ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-destructive">
              {String(createMutation.error)}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
