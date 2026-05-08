// Local CLI: load a JSON file produced by `plan:export` into the running
// dev server. Talks to /api/plans/import — the server-side route handles
// schema migration, project meta seeding, and FK-safe inserts.
//
// Usage:
//   bun run plan:import <file> [--as <newId>] [--overwrite]
//
// --as remaps the planId on import so the same dump can be loaded into a
// fresh slot. --overwrite replaces the row at the target id.

const API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

function parseArgs(argv: string[]): {
  file: string;
  asId?: string;
  overwrite: boolean;
} {
  const args = argv.slice(2);
  let file: string | null = null;
  let asId: string | undefined;
  let overwrite = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--as") asId = args[++i];
    else if (a === "--overwrite") overwrite = true;
    else if (!a.startsWith("--") && !file) file = a;
    else bail(`unknown argument: ${a}`);
  }
  if (!file) bail("input file is required");
  return { file: file as string, asId, overwrite };
}

function bail(msg: string): never {
  console.error(`plan-import: ${msg}`);
  console.error(
    "usage: bun run plan:import <file> [--as <newId>] [--overwrite]",
  );
  process.exit(1);
}

async function main() {
  const { file, asId, overwrite } = parseArgs(process.argv);
  const body = await Bun.file(file).text();
  const params = new URLSearchParams();
  if (asId) params.set("as", asId);
  if (overwrite) params.set("overwrite", "1");
  const url = `${API}/plans/import${params.size ? `?${params}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
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
  console.log(
    `imported plan=${json.planId} (intents=${json.importedIntents}, archived=${json.importedArchived})`,
  );
}

main();
