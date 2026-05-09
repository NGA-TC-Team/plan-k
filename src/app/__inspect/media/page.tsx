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

export default async function MediaInspectPage() {
  let rows: (typeof schema.media.$inferSelect)[] = [];
  let dbError: string | null = null;

  try {
    rows = await db.select().from(schema.media).all();
  } catch (err) {
    console.error("[__inspect/media] query failed:", err);
    dbError = String(err);
  }

  const tableRows = rows.map((m) => ({
    id: <span className="font-mono text-xs">{m.id}</span>,
    planId: <span className="font-mono text-xs">{m.planId}</span>,
    kind: m.kind,
    mimeType: m.mimeType,
    originalName: trunc(m.originalName, 40),
    storagePath: trunc(m.storagePath, 40),
    sizeBytes: m.sizeBytes.toLocaleString(),
    sourceUrl: m.sourceUrl ? (
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {trunc(m.sourceUrl, 40)}
        </summary>
        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap max-w-[50ch]">
          {m.sourceUrl}
        </pre>
      </details>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
    createdAt: fmtDate(m.createdAt),
  }));

  return (
    <div>
      <h2 className="mb-3 font-mono text-base font-semibold">
        media ({rows.length})
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
            "kind",
            "mimeType",
            "originalName",
            "storagePath",
            "sizeBytes",
            "sourceUrl",
            "createdAt",
          ]}
          rows={tableRows}
        />
      )}
    </div>
  );
}
