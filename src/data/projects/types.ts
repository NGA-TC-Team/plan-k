import type { ProjectKind, ProjectMeta } from "@/builder/types/entity";

export type Project = ProjectMeta;

export type CreateProjectInput = {
  kind: ProjectKind;
  title: string;
  summary?: string;
};
