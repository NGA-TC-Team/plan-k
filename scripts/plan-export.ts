// Local CLI: dump a plan (snapshot + active intents + archived intents)
// to a JSON file. Talks to the running Next.js dev server via /api/plans/
// [id]/raw so we don't need to pull better-sqlite3 into the bun runtime.
//
// Usage:
//   bun run plan:export <planId> [--out path.json]
//
// Requires `bun run dev` (or another process) to be serving on
// PLAN_K_API_URL (default http://localhost:3000/api).

const API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

function parseArgs(argv: string[]): { planId: string; out?: string } {
  const args = argv.slice(2);
  let planId: string | null = null;
  let out: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out") {
      out = args[++i];
    } else if (!a.startsWith("--") && !planId) {
      planId = a;
    } else {
      bail(`unknown argument: ${a}`);
    }
  }
  if (!planId) bail("plan id is required");
  return { planId: planId as string, out };
}

function bail(msg: string): never {
  console.error(`plan-export: ${msg}`);
  console.error("usage: bun run plan:export <planId> [--out path.json]");
  process.exit(1);
}

async function main() {
  const { planId, out } = parseArgs(process.argv);
  const url = `${API}/plans/${encodeURIComponent(planId)}/raw`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    bail(
      `failed to reach ${API} — is the dev server running? (${err instanceof Error ? err.message : err})`,
    );
  }
  if (res.status === 404) bail(`plan ${planId} not found`);
  if (!res.ok) bail(`server returned ${res.status}: ${await res.text()}`);

  const body = await res.text();
  const target = out ?? `${planId}-export.json`;
  await Bun.write(target, body);
  const parsed = JSON.parse(body) as {
    intents?: unknown[];
    archived?: unknown[];
  };
  console.log(
    `wrote ${target} (intents=${parsed.intents?.length ?? 0}, archived=${parsed.archived?.length ?? 0})`,
  );
}

main();

export {};
