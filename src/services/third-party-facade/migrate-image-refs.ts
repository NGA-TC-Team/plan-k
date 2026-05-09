/**
 * migrate-image-refs.ts
 *
 * Pure-ish helper for scanning plan snapshots and converting raw http(s) URLs
 * stored in block.data (src / faviconUrl) into `media:<id>` refs by calling
 * the running dev-server's /api endpoints.
 *
 * Design decisions:
 *  - All external I/O (fetch, API base URL) is injected via `MigrateImageRefsDeps`
 *    so unit tests can supply a mock fetch without spinning up a server.
 *  - Key names (src, faviconUrl) are intentionally preserved — key unification
 *    (src → imageRef) is deferred to a separate phase per PR-7 Unit C spec.
 *  - No sentinel file / _app_meta table: idempotent by design (already-migrated
 *    `media:` values are skipped on the URL pattern check).
 *  - Intent dispatch goes via POST /api/intents which internally calls
 *    appendIntent → syncRefsForIntent → syncSearchForIntent → maybeCompact in
 *    one round-trip.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MigrateOptions = {
  dryRun: boolean;
  includeFavicon: boolean;
  concurrency: number;
  sourceKeep: boolean; // always true per spec; from-url route already stores it
};

export type CandidateRef = {
  blockId: string;
  key: string; // "src" | "faviconUrl"
  url: string;
};

export type MigrateOutcome =
  | {
      status: "migrated";
      blockId: string;
      key: string;
      url: string;
      mediaId: string;
    }
  | {
      status: "skipped_ssrf";
      blockId: string;
      key: string;
      url: string;
      reason: string;
    }
  | {
      status: "skipped_fetch";
      blockId: string;
      key: string;
      url: string;
      reason: string;
    }
  | {
      status: "skipped_format";
      blockId: string;
      key: string;
      url: string;
      reason: string;
    }
  | { status: "dry_run"; blockId: string; key: string; url: string };

export type MigrateResult = {
  planId: string;
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  outcomes: MigrateOutcome[];
};

// Block data shape — only the fields we need.
type BlockData = Record<string, unknown>;

type BlockLike = {
  id: string;
  data: BlockData;
};

// Shape returned by GET /api/plans/[id] — snapshot + tailEntries.
type PlanApiResponse = {
  snapshot: {
    blocks: Record<string, BlockLike>;
  };
  tailEntries: unknown[];
};

// Shape returned by POST /api/plans/[id]/media/from-url on success.
type FromUrlSuccess = {
  media: { id: string };
};

// Shape returned by POST /api/intents.
type IntentsApiResponse = {
  ok: boolean;
  reason?: string;
  serverVersion?: number;
};

// ─── Dependency injection contract ────────────────────────────────────────────

/**
 * Minimal fetch signature used by this module.
 * Narrower than `typeof globalThis.fetch` to allow plain async functions in
 * tests without needing to satisfy Bun's `preconnect` extension on the
 * global fetch type.
 */
export type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type MigrateImageRefsDeps = {
  /** API base URL, e.g. "http://localhost:3000/api" */
  apiBase: string;
  /** Fetch implementation — inject a mock in tests. */
  fetch: FetchFn;
  options: MigrateOptions;
};

// ─── URL pattern helpers ──────────────────────────────────────────────────────

const HTTP_URL_RE = /^https?:\/\//i;
const MEDIA_REF_RE = /^media:/;

/**
 * Return true when the value is a raw http(s) URL that needs migration.
 * Already-migrated `media:<id>` and blank values are excluded.
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (MEDIA_REF_RE.test(value)) return false;
  if (value.trim() === "") return false;
  return HTTP_URL_RE.test(value);
}

// ─── Block scanner ────────────────────────────────────────────────────────────

/**
 * Walk snapshot.blocks and collect every (blockId, key, url) triplet whose
 * value is a raw http(s) URL.
 *
 * Keys always checked: "src"
 * Keys checked when includeFavicon=true: "faviconUrl"
 */
export function scanBlocksForHttpUrls(
  blocks: Record<string, BlockLike>,
  includeFavicon: boolean,
): CandidateRef[] {
  const candidates: CandidateRef[] = [];
  for (const block of Object.values(blocks)) {
    const data = block.data;
    if (isHttpUrl(data.src)) {
      candidates.push({
        blockId: block.id,
        key: "src",
        url: data.src as string,
      });
    }
    if (includeFavicon && isHttpUrl(data.faviconUrl)) {
      candidates.push({
        blockId: block.id,
        key: "faviconUrl",
        url: data.faviconUrl as string,
      });
    }
  }
  return candidates;
}

// ─── Core migration logic ─────────────────────────────────────────────────────

/**
 * Migrate all http(s) image refs in a single plan's latest snapshot to
 * `media:<id>` refs by calling the dev-server API.
 *
 * Idempotent: already-migrated values (media:*) are skipped by scanBlocksForHttpUrls.
 *
 * Steps per candidate:
 *  1. POST /api/plans/{planId}/media/from-url  → get mediaId
 *  2. POST /api/intents with UPDATE_BLOCK patch → append to intent log
 *
 * On dry-run both steps are skipped.
 */
export async function migratePlanImageRefs(
  planId: string,
  deps: MigrateImageRefsDeps,
): Promise<MigrateResult> {
  const { apiBase, fetch: fetchImpl, options } = deps;
  const outcomes: MigrateOutcome[] = [];

  // ── 1. Load latest snapshot ─────────────────────────────────────────────────
  let planData: PlanApiResponse;
  try {
    const res = await fetchImpl(
      `${apiBase}/plans/${encodeURIComponent(planId)}`,
    );
    if (!res.ok) {
      throw new Error(`plan not found or server error (${res.status})`);
    }
    planData = (await res.json()) as PlanApiResponse;
  } catch (err) {
    throw new Error(
      `Failed to load plan ${planId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const blocks = planData.snapshot?.blocks ?? {};

  // ── 2. Collect candidates ───────────────────────────────────────────────────
  const candidates = scanBlocksForHttpUrls(blocks, options.includeFavicon);

  if (candidates.length === 0) {
    return {
      planId,
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      dryRun: options.dryRun,
      outcomes: [],
    };
  }

  // ── 3. dry-run shortcut ─────────────────────────────────────────────────────
  if (options.dryRun) {
    for (const c of candidates) {
      outcomes.push({
        status: "dry_run",
        blockId: c.blockId,
        key: c.key,
        url: c.url,
      });
    }
    return {
      planId,
      total: candidates.length,
      migrated: 0,
      failed: 0,
      skipped: candidates.length,
      dryRun: true,
      outcomes,
    };
  }

  // ── 4. Process in batches ───────────────────────────────────────────────────
  const batchSize = Math.max(1, options.concurrency);

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((c) => processCandidate(planId, c, blocks, apiBase, fetchImpl)),
    );
    for (const r of batchResults) {
      outcomes.push(r);
    }
  }

  // ── 5. Tally ────────────────────────────────────────────────────────────────
  let migrated = 0;
  let failed = 0;
  let skipped = 0;
  for (const o of outcomes) {
    if (o.status === "migrated") migrated++;
    else if (
      o.status === "skipped_ssrf" ||
      o.status === "skipped_fetch" ||
      o.status === "skipped_format"
    ) {
      // SSRF-blocked and format errors are "skipped" (not retried); fetch errors
      // also fall here — per spec §11 "skip + warning, other refs continue."
      failed++;
    } else {
      skipped++;
    }
  }

  return {
    planId,
    total: candidates.length,
    migrated,
    failed,
    skipped,
    dryRun: false,
    outcomes,
  };
}

// ─── Per-candidate processor ──────────────────────────────────────────────────

async function processCandidate(
  planId: string,
  candidate: CandidateRef,
  blocks: Record<string, BlockLike>,
  apiBase: string,
  fetchImpl: FetchFn,
): Promise<MigrateOutcome> {
  const { blockId, key, url } = candidate;

  // ── Step A: upload via from-url route ────────────────────────────────────────
  let mediaId: string;
  try {
    const fromUrlRes = await fetchImpl(
      `${apiBase}/plans/${encodeURIComponent(planId)}/media/from-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(35_000), // slightly above server's 30s timeout
      },
    );

    if (!fromUrlRes.ok) {
      const errJson = (await fromUrlRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const code = String(errJson.code ?? fromUrlRes.status);

      // SSRF / protocol / DNS blocked
      if (
        code === "FORBIDDEN_HOST" ||
        code === "UNSUPPORTED_PROTOCOL" ||
        code === "INVALID_URL" ||
        code === "DNS_FAILURE"
      ) {
        return {
          status: "skipped_ssrf",
          blockId,
          key,
          url,
          reason: String(errJson.error ?? code),
        };
      }

      // Unsupported mime / format
      if (code === "UNSUPPORTED_MIME") {
        return {
          status: "skipped_format",
          blockId,
          key,
          url,
          reason: String(errJson.error ?? code),
        };
      }

      // Everything else (timeout, bad gateway, too large…)
      return {
        status: "skipped_fetch",
        blockId,
        key,
        url,
        reason: `from-url HTTP ${fromUrlRes.status}: ${code}`,
      };
    }

    const fromUrlJson = (await fromUrlRes.json()) as FromUrlSuccess;
    mediaId = fromUrlJson.media.id;
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      status: "skipped_fetch",
      blockId,
      key,
      url,
      reason: isTimeout
        ? "fetch timed out"
        : err instanceof Error
          ? err.message
          : String(err),
    };
  }

  // ── Step B: dispatch UPDATE_BLOCK intent ─────────────────────────────────────
  const existingBlock = blocks[blockId];
  const existingData = existingBlock?.data ?? {};

  const updatedData: BlockData = {
    ...existingData,
    [key]: `media:${mediaId}`,
  };

  const intentEntry = buildUpdateBlockEntry(planId, blockId, updatedData);

  try {
    const intentRes = await fetchImpl(`${apiBase}/intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intentEntry),
    });

    const intentJson = (await intentRes.json()) as IntentsApiResponse;
    if (!intentRes.ok || !intentJson.ok) {
      // Warn but treat as failure; the media row was already created.
      console.warn(
        `[migrate-image-refs] intent dispatch failed for block=${blockId}: ${intentJson.reason ?? intentRes.status}`,
      );
      return {
        status: "skipped_fetch",
        blockId,
        key,
        url,
        reason: `intent dispatch failed: ${intentJson.reason ?? intentRes.status}`,
      };
    }
  } catch (err) {
    console.warn(
      `[migrate-image-refs] intent dispatch threw for block=${blockId}:`,
      err instanceof Error ? err.message : err,
    );
    return {
      status: "skipped_fetch",
      blockId,
      key,
      url,
      reason: `intent dispatch error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { status: "migrated", blockId, key, url, mediaId };
}

// ─── Intent entry builder ─────────────────────────────────────────────────────

function buildUpdateBlockEntry(
  planId: string,
  nodeId: string,
  data: BlockData,
): {
  id: string;
  planId: string;
  origin: string;
  lamport: number;
  intent: {
    type: "UPDATE_BLOCK";
    nodeId: string;
    patch: { data: BlockData };
  };
  createdAt: number;
  kind: "primary";
} {
  return {
    id: `migrate_${crypto.randomUUID().replace(/-/g, "")}`,
    planId,
    origin: "cli:migrate-image-refs",
    lamport: Date.now(),
    intent: {
      type: "UPDATE_BLOCK",
      nodeId,
      patch: { data },
    },
    createdAt: Date.now(),
    kind: "primary",
  };
}

// ─── Multi-plan runner ────────────────────────────────────────────────────────

export type MigrateAllResult = {
  plans: MigrateResult[];
  totalCandidates: number;
  totalMigrated: number;
  totalFailed: number;
  totalSkipped: number;
};

export async function migrateAllPlans(
  planIds: string[],
  deps: MigrateImageRefsDeps,
): Promise<MigrateAllResult> {
  const results: MigrateResult[] = [];

  for (const planId of planIds) {
    try {
      const r = await migratePlanImageRefs(planId, deps);
      results.push(r);
    } catch (err) {
      console.error(
        `[migrate-image-refs] plan=${planId} load failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    plans: results,
    totalCandidates: results.reduce((s, r) => s + r.total, 0),
    totalMigrated: results.reduce((s, r) => s + r.migrated, 0),
    totalFailed: results.reduce((s, r) => s + r.failed, 0),
    totalSkipped: results.reduce((s, r) => s + r.skipped, 0),
  };
}
