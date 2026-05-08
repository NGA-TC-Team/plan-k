"use client";

import { Bot, type LucideIcon, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import type { ProjectKind } from "@/builder/types/entity";
import { useProjectsQuery } from "@/data/projects";
import { formatRelativeTime } from "@/lib/relative-time";

const KIND_ICON: Record<ProjectKind, LucideIcon> = {
  web: Monitor,
  mobile: Smartphone,
  agent: Bot,
};

const KIND_LABEL: Record<ProjectKind, string> = {
  web: "Web",
  mobile: "Mobile",
  agent: "Agent",
};

const RECENTS_LIMIT = 5;

export function RecentsList() {
  const { data, isLoading } = useProjectsQuery();

  if (isLoading) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            key={i}
            className="h-[68px] animate-pulse rounded-lg border bg-muted/30"
          />
        ))}
      </ul>
    );
  }

  const recents = (data ?? []).slice(0, RECENTS_LIMIT);
  if (recents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        최근 편집한 플랜이 없습니다. 아래 데모를 열거나{" "}
        <Link href="/projects" className="underline">
          새 프로젝트를 시작
        </Link>
        하세요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {recents.map((p) => {
        const Icon = KIND_ICON[p.kind];
        return (
          <li key={p.id}>
            <Link
              href={`/plan/${p.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.title}</div>
                {p.summary ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {p.summary}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end text-xs text-muted-foreground">
                <span>{KIND_LABEL[p.kind]}</span>
                <span>{formatRelativeTime(p.updatedAt)}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
