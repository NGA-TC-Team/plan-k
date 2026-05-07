import { NextResponse } from "next/server";
import {
  createProject,
  listProjects,
} from "@/services/third-party-facade/project-store";

export async function GET() {
  const items = await listProjects();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    kind?: string;
    title?: string;
    summary?: string;
  };
  if (body.kind !== "web" && body.kind !== "mobile" && body.kind !== "agent") {
    return NextResponse.json(
      { ok: false, reason: "INVALID_KIND" },
      { status: 400 },
    );
  }
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_TITLE" },
      { status: 400 },
    );
  }
  const project = await createProject({
    kind: body.kind,
    title,
    summary: body.summary,
  });
  return NextResponse.json(project, { status: 201 });
}
