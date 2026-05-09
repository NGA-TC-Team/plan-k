// dev-only inspector — bypasses facade by design
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { InspectorTable } from "../_components/inspector-table";

function coerceParam(p: string | string[] | undefined): string | undefined {
  if (Array.isArray(p)) return p[0];
  return p;
}

function fmtDate(d: Date | number | null | undefined): string {
  if (d == null) return "—";
  return new Date(d).toLocaleString();
}

export default async function RefsInspectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const planId = coerceParam(sp.planId);

  let rows: (typeof schema.refs.$inferSelect)[] = [];
  let dbError: string | null = null;

  try {
    if (planId) {
      rows = await db
        .select()
        .from(schema.refs)
        .where(eq(schema.refs.planId, planId))
        .all();
    } else {
      rows = await db.select().from(schema.refs).all();
    }
  } catch (err) {
    console.error("[__inspect/refs] query failed:", err);
    dbError = String(err);
  }

  const tableRows = rows.map((r) => ({
    id: <span className="font-mono text-xs">{r.id}</span>,
    planId: <span className="font-mono text-xs">{r.planId}</span>,
    srcId: <span className="font-mono text-xs">{r.srcId}</span>,
    dstId: <span className="font-mono text-xs">{r.dstId}</span>,
    kind: r.kind,
    createdAt: fmtDate(r.createdAt),
  }));

  return (
    <div>
      <h2 className="mb-2 font-mono text-base font-semibold">
        refs{planId ? ` (planId=${planId})` : ""} ({rows.length})
      </h2>
      {planId ? (
        <a
          href="/__inspect/refs"
          className="mb-4 inline-block text-xs underline underline-offset-2 hover:text-muted-foreground"
        >
          ← all refs
        </a>
      ) : null}
      <div className="mt-3">
        {dbError ? (
          <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            DB error: {dbError}
          </p>
        ) : (
          <InspectorTable
            columns={["id", "planId", "srcId", "dstId", "kind", "createdAt"]}
            rows={tableRows}
          />
        )}
      </div>
    </div>
  );
}
