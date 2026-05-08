// Local CLI: recompute the FTS5 search index. Pass a plan id to
// rebuild a single plan, or omit it to rebuild every plan in the DB.
//
// Usage:
//   bun run plan:rebuild-search [planId]

const API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

function bail(msg: string): never {
  console.error(`plan-rebuild-search: ${msg}`);
  console.error("usage: bun run plan:rebuild-search [planId]");
  process.exit(1);
}

async function main() {
  const planId = process.argv[2];
  const url = planId
    ? `${API}/plans/${encodeURIComponent(planId)}/search/rebuild`
    : `${API}/search/rebuild`;

  let res: Response;
  try {
    res = await fetch(url, { method: "POST" });
  } catch (err) {
    bail(
      `failed to reach ${API} — is the dev server running? (${err instanceof Error ? err.message : err})`,
    );
  }
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error(`server returned ${res.status}:`, json);
    process.exit(1);
  }
  if (planId) {
    console.log(`rebuilt plan=${json.planId} (rows=${json.rows})`);
  } else {
    const successes = (json.successes ?? []) as {
      planId: string;
      rows: number;
    }[];
    const failures = (json.failures ?? []) as {
      planId: string;
      reason: string;
    }[];
    const totalRows = successes.reduce((acc, s) => acc + s.rows, 0);
    console.log(
      `rebuilt ${successes.length} plans (rows=${totalRows}); skipped ${failures.length}`,
    );
    for (const f of failures) console.log(`  skip ${f.planId}: ${f.reason}`);
  }
}

main();
