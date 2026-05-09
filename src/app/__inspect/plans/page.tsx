// dev-only inspector — bypasses facade by design
import { db, schema } from "@/db/client";
import { InspectorTable } from "../_components/inspector-table";

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function fmtDate(d: Date | number | null | undefined): string {
  if (d == null) return "—";
  return new Date(d).toLocaleString();
}

export default async function PlansInspectPage() {
  let projectRows: (typeof schema.projects.$inferSelect)[] = [];
  let planRows: (typeof schema.plans.$inferSelect)[] = [];
  let projectsError: string | null = null;
  let plansError: string | null = null;

  try {
    projectRows = await db.select().from(schema.projects).all();
  } catch (err) {
    console.error("[__inspect/plans] projects query failed:", err);
    projectsError = String(err);
  }

  try {
    planRows = await db.select().from(schema.plans).all();
  } catch (err) {
    console.error("[__inspect/plans] plans query failed:", err);
    plansError = String(err);
  }

  const projectTableRows = projectRows.map((p) => ({
    id: <span className="font-mono text-xs">{p.id}</span>,
    kind: p.kind,
    title: trunc(p.title, 60),
    summary: trunc(p.summary, 80),
    createdAt: fmtDate(p.createdAt),
    updatedAt: fmtDate(p.updatedAt),
  }));

  const planTableRows = planRows.map((p) => ({
    id: <span className="font-mono text-xs">{p.id}</span>,
    kind: p.kind,
    snapshotSeq: String(p.snapshotSeq),
    "snapshot (len)": String(p.snapshot.length),
    createdAt: fmtDate(p.createdAt),
    updatedAt: fmtDate(p.updatedAt),
  }));

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 font-mono text-base font-semibold">
          projects ({projectRows.length})
        </h2>
        {projectsError ? (
          <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            DB error: {projectsError}
          </p>
        ) : (
          <InspectorTable
            columns={[
              "id",
              "kind",
              "title",
              "summary",
              "createdAt",
              "updatedAt",
            ]}
            rows={projectTableRows}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-base font-semibold">
          plans ({planRows.length})
        </h2>
        {plansError ? (
          <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            DB error: {plansError}
          </p>
        ) : (
          <InspectorTable
            columns={[
              "id",
              "kind",
              "snapshotSeq",
              "snapshot (len)",
              "createdAt",
              "updatedAt",
            ]}
            rows={planTableRows}
          />
        )}
      </section>
    </div>
  );
}
