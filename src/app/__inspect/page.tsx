// dev-only inspector — bypasses facade by design
import { count } from "drizzle-orm";
import { db, schema } from "@/db/client";

// Sub-pages available for dedicated views.
const SUB_PAGES: Record<string, string> = {
  projects: "/__inspect/plans",
  plans: "/__inspect/plans",
  intents: "—",
  intentsArchive: "/__inspect/intents-archive",
  refs: "/__inspect/refs",
  media: "/__inspect/media",
  planVersions: "/__inspect/plan-versions",
  chatSessions: "—",
  chatMessages: "—",
  chatAttachments: "—",
  chatStagedIntents: "—",
  blocks: "/__inspect/blocks",
};

type TableEntry = {
  name: string;
  displayName: string;
  rowCount: number | "n/a";
  link: string;
};

async function safeCount(
  table: Parameters<typeof db.select>[0] extends undefined
    ? never
    : // biome-ignore lint/suspicious/noExplicitAny: generic table type
      any,
): Promise<number | "n/a"> {
  try {
    const [result] = await db.select({ value: count() }).from(table);
    return result?.value ?? 0;
  } catch (err) {
    console.error("[__inspect] count failed for table:", err);
    return "n/a";
  }
}

export default async function InspectIndexPage() {
  const entries: TableEntry[] = await Promise.all([
    safeCount(schema.projects).then((n) => ({
      name: "projects",
      displayName: "projects",
      rowCount: n,
      link: SUB_PAGES.projects,
    })),
    safeCount(schema.plans).then((n) => ({
      name: "plans",
      displayName: "plans",
      rowCount: n,
      link: SUB_PAGES.plans,
    })),
    safeCount(schema.intents).then((n) => ({
      name: "intents",
      displayName: "intents",
      rowCount: n,
      link: SUB_PAGES.intents,
    })),
    safeCount(schema.intentsArchive).then((n) => ({
      name: "intentsArchive",
      displayName: "intents_archive",
      rowCount: n,
      link: SUB_PAGES.intentsArchive,
    })),
    safeCount(schema.refs).then((n) => ({
      name: "refs",
      displayName: "refs",
      rowCount: n,
      link: SUB_PAGES.refs,
    })),
    safeCount(schema.media).then((n) => ({
      name: "media",
      displayName: "media",
      rowCount: n,
      link: SUB_PAGES.media,
    })),
    safeCount(schema.planVersions).then((n) => ({
      name: "planVersions",
      displayName: "plan_versions",
      rowCount: n,
      link: SUB_PAGES.planVersions,
    })),
    safeCount(schema.chatSessions).then((n) => ({
      name: "chatSessions",
      displayName: "chat_sessions",
      rowCount: n,
      link: SUB_PAGES.chatSessions,
    })),
    safeCount(schema.chatMessages).then((n) => ({
      name: "chatMessages",
      displayName: "chat_messages",
      rowCount: n,
      link: SUB_PAGES.chatMessages,
    })),
    safeCount(schema.chatAttachments).then((n) => ({
      name: "chatAttachments",
      displayName: "chat_attachments",
      rowCount: n,
      link: SUB_PAGES.chatAttachments,
    })),
    safeCount(schema.chatStagedIntents).then((n) => ({
      name: "chatStagedIntents",
      displayName: "chat_staged_intents",
      rowCount: n,
      link: SUB_PAGES.chatStagedIntents,
    })),
    // blocks: derived from plans.snapshot — not a real table
    Promise.resolve({
      name: "blocks",
      displayName: "blocks (in plans.snapshot)",
      rowCount: "n/a" as const,
      link: SUB_PAGES.blocks,
    }),
  ]);

  return (
    <div>
      <h2 className="mb-4 font-mono text-base font-semibold">Tables</h2>
      <div className="w-full overflow-x-auto rounded-md border">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b">
              <th className="h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground">
                Table
              </th>
              <th className="h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground">
                Rows
              </th>
              <th className="h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground">
                Link
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {entries.map((entry) => (
              <tr
                key={entry.name}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="p-3 align-middle font-mono text-xs">
                  {entry.displayName}
                </td>
                <td className="p-3 align-middle tabular-nums">
                  {entry.rowCount}
                </td>
                <td className="p-3 align-middle">
                  {entry.link !== "—" ? (
                    <a
                      href={entry.link}
                      className="text-xs underline underline-offset-2 hover:text-muted-foreground"
                    >
                      view →
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        * blocks is stored inside plans.snapshot (state.blocks) — no dedicated
        table.
      </p>
    </div>
  );
}
