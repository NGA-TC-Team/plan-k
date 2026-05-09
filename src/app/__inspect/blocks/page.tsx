// dev-only inspector — bypasses facade by design
// blocks are NOT a dedicated DB table — they live inside plans.snapshot as
// state.blocks (Record<string, BlockEntity>). This page parses the JSON.
import { eq } from "drizzle-orm";
import type { AppState } from "@/builder/types/state";
import { db, schema } from "@/db/client";
import { InspectorTable } from "../_components/inspector-table";

function trunc(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function coerceParam(p: string | string[] | undefined): string | undefined {
  if (Array.isArray(p)) return p[0];
  return p;
}

export default async function BlocksInspectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const planId = coerceParam(sp.planId);

  // No planId → show plans list with links
  if (!planId) {
    let planRows: (typeof schema.plans.$inferSelect)[] = [];
    let dbError: string | null = null;

    try {
      planRows = await db.select().from(schema.plans).all();
    } catch (err) {
      console.error("[__inspect/blocks] plans list query failed:", err);
      dbError = String(err);
    }

    return (
      <div>
        <h2 className="mb-3 font-mono text-base font-semibold">
          blocks — select a plan
        </h2>
        {dbError ? (
          <p className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            DB error: {dbError}
          </p>
        ) : (
          <InspectorTable
            columns={["planId", "snapshotSeq", "link"]}
            rows={planRows.map((p) => ({
              planId: <span className="font-mono text-xs">{p.id}</span>,
              snapshotSeq: String(p.snapshotSeq),
              link: (
                <a
                  href={`/__inspect/blocks?planId=${encodeURIComponent(p.id)}`}
                  className="text-xs underline underline-offset-2 hover:text-muted-foreground"
                >
                  view blocks →
                </a>
              ),
            }))}
          />
        )}
      </div>
    );
  }

  // planId provided → load snapshot and parse blocks
  let planRow: typeof schema.plans.$inferSelect | undefined;
  let dbError: string | null = null;

  try {
    const rows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .all();
    planRow = rows[0];
  } catch (err) {
    console.error("[__inspect/blocks] plan query failed:", err);
    dbError = String(err);
  }

  if (dbError) {
    return (
      <div className="rounded border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        <strong>DB error</strong> for planId={planId}: {dbError}
      </div>
    );
  }

  if (!planRow) {
    return (
      <p className="text-sm text-muted-foreground">
        No plan found with id: <code>{planId}</code>
      </p>
    );
  }

  let appState: AppState | null = null;
  let parseError: string | null = null;

  try {
    appState = JSON.parse(planRow.snapshot) as AppState;
  } catch (err) {
    console.error(
      "[__inspect/blocks] JSON.parse failed for planId:",
      planId,
      err,
    );
    parseError = String(err);
  }

  if (parseError) {
    return (
      <div className="rounded border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        <strong>JSON parse error</strong> for planId={planId}: {parseError}
      </div>
    );
  }

  const blocks = appState?.blocks ?? {};
  const blockEntries = Object.entries(blocks);

  const rows = blockEntries.map(([id, block]) => ({
    id: <span className="font-mono text-xs">{id}</span>,
    parentId: (
      <span className="font-mono text-xs text-muted-foreground">
        {block.parentId ?? "—"}
      </span>
    ),
    kind: block.kind,
    "data (120ch)": (
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {trunc(JSON.stringify(block.data), 120)}
        </summary>
        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap max-w-[60ch]">
          {JSON.stringify(block.data, null, 2)}
        </pre>
      </details>
    ),
  }));

  return (
    <div>
      <h2 className="mb-1 font-mono text-base font-semibold">
        blocks in plan <span className="text-muted-foreground">{planId}</span>
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Source: plans.snapshot → state.blocks ({blockEntries.length} entries)
      </p>
      <a
        href="/__inspect/blocks"
        className="mb-4 inline-block text-xs underline underline-offset-2 hover:text-muted-foreground"
      >
        ← all plans
      </a>
      <div className="mt-3">
        <InspectorTable
          columns={["id", "parentId", "kind", "data (120ch)"]}
          rows={rows}
        />
      </div>
    </div>
  );
}
