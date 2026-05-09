// dev-only inspector — bypasses facade by design
import { eq } from "drizzle-orm";
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

function coerceParam(p: string | string[] | undefined): string | undefined {
  if (Array.isArray(p)) return p[0];
  return p;
}

export default async function IntentsArchiveInspectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const planId = coerceParam(sp.planId);

  let rows: (typeof schema.intentsArchive.$inferSelect)[] = [];
  let dbError: string | null = null;

  try {
    if (planId) {
      rows = await db
        .select()
        .from(schema.intentsArchive)
        .where(eq(schema.intentsArchive.planId, planId))
        .all();
    } else {
      rows = await db.select().from(schema.intentsArchive).all();
    }
  } catch (err) {
    console.error("[__inspect/intents-archive] query failed:", err);
    dbError = String(err);
  }

  const tableRows = rows.map((r) => ({
    id: <span className="font-mono text-xs">{r.id}</span>,
    planId: <span className="font-mono text-xs">{r.planId}</span>,
    serverSeq: String(r.serverSeq),
    lamport: String(r.lamport),
    origin: r.origin,
    kind: r.kind,
    parentEntryId: r.parentEntryId ? (
      <span className="font-mono text-xs">{r.parentEntryId}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
    "intent (200ch)": (
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {trunc(r.intent, 200)}
        </summary>
        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap max-w-[60ch]">
          {r.intent}
        </pre>
      </details>
    ),
    createdAt: fmtDate(r.createdAt),
    archivedAt: fmtDate(r.archivedAt),
  }));

  return (
    <div>
      <h2 className="mb-2 font-mono text-base font-semibold">
        intents_archive{planId ? ` (planId=${planId})` : ""} ({rows.length})
      </h2>
      {planId ? (
        <a
          href="/__inspect/intents-archive"
          className="mb-4 inline-block text-xs underline underline-offset-2 hover:text-muted-foreground"
        >
          ← all archive rows
        </a>
      ) : null}
      <div className="mt-3">
        {dbError ? (
          <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            DB error: {dbError}
          </p>
        ) : (
          <InspectorTable
            columns={[
              "id",
              "planId",
              "serverSeq",
              "lamport",
              "origin",
              "kind",
              "parentEntryId",
              "intent (200ch)",
              "createdAt",
              "archivedAt",
            ]}
            rows={tableRows}
          />
        )}
      </div>
    </div>
  );
}
