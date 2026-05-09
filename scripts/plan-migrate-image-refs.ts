// Local CLI: convert raw http(s) URLs in block.data.src (and optionally
// faviconUrl) to media:<id> refs by calling the running dev-server API.
//
// Usage:
//   bun run plan:migrate-image-refs --plan <planId> [options]
//   bun run plan:migrate-image-refs --all [options]
//
// Options:
//   --plan <id>         Process a single plan
//   --all               Process every plan listed under /api/projects
//   --dry-run           Print candidates without making any changes
//   --concurrency <n>   Parallel fetch limit (default: 4)
//   --include-favicon   Also migrate link-card faviconUrl fields (default: OFF)
//   --source-keep       (default ON) sourceUrl preserved in media row by from-url route
//
// Key names (src, faviconUrl) are not renamed in this migration — key
// unification (src → imageRef) is deferred to a separate phase.
//
// Sentinel / _app_meta: not used. Operation is idempotent — values already
// starting with "media:" are skipped by the scanner.
//
// Variable-name isolation: uses MIGRATE_API, migrateMain to avoid collision
// with other scripts that declare `const API` and `async function main` at
// module scope (pre-existing redeclare TS errors in tsc --noEmit).

const MIGRATE_API = process.env.PLAN_K_API_URL ?? "http://localhost:3000/api";

// Inlined here to avoid pulling @/services/* into the bun CLI runtime which
// would require the full Next.js / Drizzle setup. The helper is imported from
// the src tree — bun resolves @/* via tsconfig paths so this is fine as long
// as the dev server is not required.
import {
  type MigrateImageRefsDeps,
  type MigrateOptions,
  type MigrateOutcome,
  type MigrateResult,
  migrateAllPlans,
  migratePlanImageRefs,
} from "../src/services/third-party-facade/migrate-image-refs";

// ─── Arg parsing ──────────────────────────────────────────────────────────────

type ParsedArgs = {
  planId: string | null;
  all: boolean;
  dryRun: boolean;
  concurrency: number;
  includeFavicon: boolean;
  sourceKeep: boolean;
};

function migrateBail(msg: string): never {
  console.error(`plan-migrate-image-refs: ${msg}`);
  console.error(
    "usage: bun run plan:migrate-image-refs [--plan <id> | --all] [--dry-run] [--concurrency 4] [--include-favicon] [--source-keep]",
  );
  process.exit(1);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let planId: string | null = null;
  let all = false;
  let dryRun = false;
  let concurrency = 4;
  let includeFavicon = false;
  let sourceKeep = true; // always true per spec; the from-url route already stores sourceUrl

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--plan") {
      const v = args[++i];
      if (!v || v.startsWith("--"))
        migrateBail("--plan requires an id argument");
      planId = v;
    } else if (a === "--all") {
      all = true;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--concurrency") {
      const v = args[++i];
      const n = Number(v);
      if (!v || Number.isNaN(n) || n < 1)
        migrateBail("--concurrency requires a positive integer");
      concurrency = n;
    } else if (a === "--include-favicon") {
      includeFavicon = true;
    } else if (a === "--source-keep") {
      sourceKeep = true;
    } else {
      migrateBail(`unknown argument: ${a}`);
    }
  }

  if (!planId && !all) {
    migrateBail("one of --plan <id> or --all is required");
  }
  if (planId && all) {
    migrateBail("--plan and --all are mutually exclusive");
  }

  return { planId, all, dryRun, concurrency, includeFavicon, sourceKeep };
}

// ─── Project list helper ──────────────────────────────────────────────────────

type ProjectItem = { id: string; title?: string };

async function fetchAllPlanIds(): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${MIGRATE_API}/projects`);
  } catch (err) {
    migrateBail(
      `failed to reach ${MIGRATE_API} — is the dev server running? (${err instanceof Error ? err.message : err})`,
    );
  }
  if (!res.ok) {
    migrateBail(`/api/projects returned ${res.status}`);
  }
  const items = (await res.json()) as ProjectItem[];
  return items.map((p) => p.id);
}

// ─── Summary printer ──────────────────────────────────────────────────────────

function printPlanResult(r: MigrateResult): void {
  if (r.total === 0) {
    console.log(`  plan=${r.planId}: no candidates`);
    return;
  }
  if (r.dryRun) {
    console.log(`  plan=${r.planId}: ${r.total} candidate(s) found (dry-run)`);
    for (const o of r.outcomes) {
      console.log(`    [dry-run] block=${o.blockId} key=${o.key} url=${o.url}`);
    }
    return;
  }

  console.log(
    `  plan=${r.planId}: total=${r.total} migrated=${r.migrated} failed=${r.failed} skipped=${r.skipped}`,
  );

  for (const o of r.outcomes) {
    if (o.status === "migrated") {
      console.log(
        `    [ok]   block=${o.blockId} key=${o.key} → media:${o.mediaId}`,
      );
    } else {
      const reason =
        (o as Extract<MigrateOutcome, { reason: string }>).reason ?? "";
      console.log(
        `    [skip] block=${o.blockId} key=${o.key} url=${o.url} reason=${reason}`,
      );
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function migrateMain() {
  const parsed = parseArgs(process.argv);

  const options: MigrateOptions = {
    dryRun: parsed.dryRun,
    includeFavicon: parsed.includeFavicon,
    concurrency: parsed.concurrency,
    sourceKeep: parsed.sourceKeep,
  };

  const deps: MigrateImageRefsDeps = {
    apiBase: MIGRATE_API,
    fetch: globalThis.fetch,
    options,
  };

  if (parsed.dryRun) {
    console.log("[migrate-image-refs] dry-run mode — no changes will be made");
  }

  if (parsed.all) {
    console.log(
      `[migrate-image-refs] fetching all plans from ${MIGRATE_API}/projects …`,
    );
    let planIds: string[];
    try {
      planIds = await fetchAllPlanIds();
    } catch (err) {
      migrateBail(
        `failed to load plan list: ${err instanceof Error ? err.message : err}`,
      );
    }

    if (planIds.length === 0) {
      console.log("[migrate-image-refs] no plans found");
      return;
    }
    console.log(`[migrate-image-refs] processing ${planIds.length} plan(s) …`);

    const summary = await migrateAllPlans(planIds, deps);

    console.log(
      "\n─── Summary ───────────────────────────────────────────────",
    );
    for (const r of summary.plans) {
      printPlanResult(r);
    }
    console.log("───────────────────────────────────────────────────────────");
    console.log(
      `total: candidates=${summary.totalCandidates} migrated=${summary.totalMigrated} failed=${summary.totalFailed} skipped=${summary.totalSkipped}`,
    );

    if (summary.totalFailed > 0) {
      process.exit(1);
    }
    return;
  }

  // Single plan mode
  const planId = parsed.planId as string;
  console.log(`[migrate-image-refs] processing plan=${planId} …`);

  let result: MigrateResult;
  try {
    result = await migratePlanImageRefs(planId, deps);
  } catch (err) {
    migrateBail(
      `failed to migrate plan ${planId}: ${err instanceof Error ? err.message : err}`,
    );
  }

  printPlanResult(result);
  console.log(
    `\ndone: total=${result.total} migrated=${result.migrated} failed=${result.failed} skipped=${result.skipped}`,
  );

  if (result.failed > 0) {
    process.exit(1);
  }
}

migrateMain();
