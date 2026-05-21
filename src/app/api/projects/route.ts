import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectKindSchema } from "@/lib/api-schemas";
import { parseJsonBody } from "@/lib/api-validation";
import {
  createProject,
  listProjects,
} from "@/services/third-party-facade/project-store";

const ProjectsBodySchema = z.object({
  kind: ProjectKindSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().max(1000).optional(),
  seed: z.boolean().optional(),
});

export async function GET() {
  const items = await listProjects();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, ProjectsBodySchema);
  if (!parsed.ok) return parsed.response;
  const { kind, title, summary, seed } = parsed.data;
  const project = await createProject({ kind, title, summary, seed });
  return NextResponse.json(project, { status: 201 });
}
