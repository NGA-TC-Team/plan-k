import { desc } from "drizzle-orm";
import { buildSeedSnapshot } from "@/builder/defaults";
import { defaultIdFactory } from "@/builder/ids";
import type { ProjectKind, ProjectMeta } from "@/builder/types/entity";
import { db, plans, projects } from "@/db";

export type CreateProjectInput = {
  kind: ProjectKind;
  title: string;
  summary?: string;
};

export async function listProjects(): Promise<ProjectMeta[]> {
  const rows = db
    .select()
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .all();
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }));
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectMeta> {
  const id = crypto.randomUUID();
  const now = new Date();
  const summary = input.summary ?? "";

  const ids = defaultIdFactory();
  const snapshot = buildSeedSnapshot(id, input.kind, {
    newId: ids.newEntryId,
    origin: `seed:${id}`,
  });
  // Inline the project meta in the seed snapshot so the builder shows the
  // user-supplied title/summary immediately.
  snapshot.projects = {
    [id]: {
      id,
      kind: input.kind,
      title: input.title,
      summary,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    },
  };

  db.transaction((tx) => {
    tx.insert(projects)
      .values({
        id,
        kind: input.kind,
        title: input.title,
        summary,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(plans)
      .values({
        id,
        kind: input.kind,
        snapshot: JSON.stringify(snapshot),
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  return {
    id,
    kind: input.kind,
    title: input.title,
    summary,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  };
}
