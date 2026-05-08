// Local CLI: recompute the refs index for a plan from its current
// snapshot. Use after manual DB edits, after restoring an old DB, or
// when a block manifest changes the way it stores text.
//
// Usage:
//   bun run plan:rebuild-refs <planId>

const API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

function bail(msg: string): never {
  console.error(`plan-rebuild-refs: ${msg}`);
  console.error("usage: bun run plan:rebuild-refs <planId>");
  process.exit(1);
}

async function main() {
  const planId = process.argv[2];
  if (!planId) bail("plan id is required");
  const url = `${API}/plans/${encodeURIComponent(planId)}/refs/rebuild`;

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
  console.log(
    `rebuilt plan=${json.planId} (blocks=${json.blocks}, edges=${json.edges})`,
  );
}

main();
