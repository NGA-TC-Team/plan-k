// dev-only inspector — bypasses facade by design
// Pure server component: no "use client" needed. Uses plain HTML <table>
// because shadcn/ui Table is "use client" and cannot be imported here.
import type { ReactNode } from "react";

export type InspectorTableProps = {
  columns: string[];
  rows: Array<Record<string, ReactNode>>;
};

// Stable row key: join the first 3 column string values with a separator so
// each row gets a reasonably unique key without relying on array index.
function rowKey(
  row: Record<string, ReactNode>,
  columns: string[],
  i: number,
): string {
  const parts = columns.slice(0, 3).map((col) => {
    const v = row[col];
    return typeof v === "string" || typeof v === "number"
      ? String(v)
      : String(i);
  });
  return `row-${i}-${parts.join("|")}`;
}

export function InspectorTable({ columns, rows }: InspectorTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground italic">(no rows)</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b">
            {columns.map((col) => (
              <th
                key={col}
                className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, columns, i)}
              className="border-b transition-colors hover:bg-muted/50"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="p-2 align-middle max-w-[40ch] overflow-hidden text-ellipsis"
                >
                  {row[col] ?? <span className="text-muted-foreground">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
