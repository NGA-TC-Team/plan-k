import type { ProjectKind, ProjectMeta } from "@/builder/types/entity";

export type Project = ProjectMeta;

export type CreateProjectInput = {
  kind: ProjectKind;
  title: string;
  summary?: string;
  // When false, the new project skips the demo seed content (Janggu / Jukku /
  // Saetbyeol blocks + screens + agent graph) and starts with an empty docs
  // tree. Default true.
  seed?: boolean;
};
