// Local CLI: list orphan blocks/sections for a plan.
//
// Usage:
//   bun run plan:orphans <planId>

const API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

function bail(msg: string): never {
  console.error(`plan-orphans: ${msg}`);
  console.error("usage: bun run plan:orphans <planId>");
  process.exit(1);
}

async function main() {
  const planId = process.argv[2];
  if (!planId) bail("plan id is required");
  const url = `${API}/plans/${encodeURIComponent(planId)}/orphans`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    bail(
      `failed to reach ${API} — is the dev server running? (${err instanceof Error ? err.message : err})`,
    );
  }
  const json = (await res.json()) as {
    blocks?: { id: string; kind: string; missingParent: string }[];
    sections?: { id: string; kind: string; title: string }[];
    error?: string;
  };
  if (!res.ok) {
    console.error(`server returned ${res.status}:`, json);
    process.exit(1);
  }
  const blocks = json.blocks ?? [];
  const sections = json.sections ?? [];
  if (blocks.length + sections.length === 0) {
    console.log(`no orphans for plan=${planId}`);
    return;
  }
  if (blocks.length > 0) {
    console.log(`orphan blocks (${blocks.length}):`);
    for (const b of blocks) {
      console.log(`  ${b.id} [${b.kind}] missing parent=${b.missingParent}`);
    }
  }
  if (sections.length > 0) {
    console.log(`orphan sections (${sections.length}):`);
    for (const s of sections) {
      console.log(`  ${s.id} [${s.kind}] "${s.title}"`);
    }
  }
}

main();

export {};
