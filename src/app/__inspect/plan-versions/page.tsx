// dev-only inspector — bypasses facade by design
import { db, schema } from "@/db/client";
import { InspectorTable } from "../_components/inspector-table";

function trunc(s: string | null | undefined, n: number): string {
  if (s == null) return "—";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function fmtDate(d: Date | number | null | undefined): string {
  if (d == null) return "—";
  return new Date(d).toLocaleString();
}

export default async function PlanVersionsInspectPage() {
  let rows: (typeof schema.planVersions.$inferSelect)[] = [];
  let dbError: string | null = null;

  try {
    rows = await db.select().from(schema.planVersions).all();
  } catch (err) {
    console.error("[__inspect/plan-versions] query failed:", err);
    dbError = String(err);
  }

  const tableRows = rows.map((v) => ({
    id: <span className="font-mono text-xs">{v.id}</span>,
    planId: <span className="font-mono text-xs">{v.planId}</span>,
    label: v.label,
    "note (80ch)": trunc(v.note, 80),
    serverSeqAtTag: String(v.serverSeqAtTag),
    "snapshot (200ch)": (
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {trunc(v.snapshot, 200)}
        </summary>
        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap max-w-[60ch]">
          {v.snapshot}
        </pre>
      </details>
    ),
    createdAt: fmtDate(v.createdAt),
  }));

  return (
    <div>
      <h2 className="mb-3 font-mono text-base font-semibold">
        plan_versions ({rows.length})
      </h2>
      {dbError ? (
        <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          DB error: {dbError}
        </p>
      ) : (
        <InspectorTable
          columns={[
            "id",
            "planId",
            "label",
            "note (80ch)",
            "serverSeqAtTag",
            "snapshot (200ch)",
            "createdAt",
          ]}
          rows={tableRows}
        />
      )}
    </div>
  );
}
