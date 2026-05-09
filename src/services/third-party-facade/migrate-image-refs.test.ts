/**
 * Unit tests for migrate-image-refs.ts
 *
 * All HTTP calls are stubbed via a fake `fetch` injected through deps.
 * No server, no DB, no file-system side effects.
 */

import { describe, expect, it } from "bun:test";
import {
  type FetchFn,
  isHttpUrl,
  type MigrateImageRefsDeps,
  type MigrateOptions,
  migratePlanImageRefs,
  scanBlocksForHttpUrls,
} from "./migrate-image-refs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_OPTS: MigrateOptions = {
  dryRun: false,
  includeFavicon: false,
  concurrency: 4,
  sourceKeep: true,
};

function makeDeps(
  overrides: Partial<MigrateImageRefsDeps> & {
    fetch?: FetchFn;
  },
): MigrateImageRefsDeps {
  return {
    apiBase: "http://localhost:3000/api",
    fetch: overrides.fetch ?? (async () => new Response("{}", { status: 200 })),
    options: DEFAULT_OPTS,
    ...overrides,
  };
}

/** Minimal snapshot response body for a plan with one image block. */
function planWith(
  blockId: string,
  src: string,
  extra?: Record<string, unknown>,
): object {
  return {
    snapshot: {
      blocks: {
        [blockId]: {
          id: blockId,
          data: { src, ...extra },
        },
      },
    },
    tailEntries: [],
  };
}

/** Build a Response whose json() resolves to `body`. */
function jsonRes(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── isHttpUrl ────────────────────────────────────────────────────────────────

describe("isHttpUrl", () => {
  it("returns true for http URL", () => {
    expect(isHttpUrl("http://example.com/img.png")).toBe(true);
  });

  it("returns true for https URL", () => {
    expect(isHttpUrl("https://cdn.example.com/logo.png")).toBe(true);
  });

  it("returns false for media: ref", () => {
    expect(isHttpUrl("media:med_abc123")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHttpUrl("")).toBe(false);
  });

  it("returns false for non-string", () => {
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(42)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });

  it("returns false for relative path", () => {
    expect(isHttpUrl("/images/logo.png")).toBe(false);
  });
});

// ─── scanBlocksForHttpUrls ────────────────────────────────────────────────────

describe("scanBlocksForHttpUrls", () => {
  it("returns candidates for blocks with http src", () => {
    const blocks = {
      b1: { id: "b1", data: { src: "https://example.com/img.png" } },
      b2: { id: "b2", data: { src: "media:med_existing" } },
      b3: { id: "b3", data: { src: "" } },
    };
    const result = scanBlocksForHttpUrls(blocks, false);
    expect(result).toHaveLength(1);
    expect(result[0].blockId).toBe("b1");
    expect(result[0].key).toBe("src");
  });

  it("skips faviconUrl when includeFavicon=false", () => {
    const blocks = {
      b1: { id: "b1", data: { faviconUrl: "https://example.com/fav.ico" } },
    };
    expect(scanBlocksForHttpUrls(blocks, false)).toHaveLength(0);
  });

  it("includes faviconUrl when includeFavicon=true", () => {
    const blocks = {
      b1: { id: "b1", data: { faviconUrl: "https://example.com/fav.ico" } },
    };
    const result = scanBlocksForHttpUrls(blocks, true);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("faviconUrl");
  });

  it("returns empty for no http URLs", () => {
    const blocks = {
      b1: { id: "b1", data: { src: "media:med_xyz" } },
      b2: { id: "b2", data: {} },
    };
    expect(scanBlocksForHttpUrls(blocks, true)).toHaveLength(0);
  });
});

// ─── migratePlanImageRefs ─────────────────────────────────────────────────────

describe("migratePlanImageRefs — happy path", () => {
  it("calls from-url once, dispatches UPDATE_BLOCK once, returns migrated=1", async () => {
    const planId = "plan-abc";
    const blockId = "blk-1";
    const imageUrl = "https://example.com/photo.jpg";
    const newMediaId = "med_newid";

    const calls: { url: string; method: string; body?: unknown }[] = [];

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyText = typeof init?.body === "string" ? init.body : undefined;
      calls.push({
        url,
        method,
        body: bodyText ? JSON.parse(bodyText) : undefined,
      });

      if (method === "GET" && url.endsWith(`/plans/${planId}`)) {
        return jsonRes(planWith(blockId, imageUrl));
      }
      if (method === "POST" && url.endsWith("/media/from-url")) {
        return jsonRes({ media: { id: newMediaId } }, 201);
      }
      if (method === "POST" && url.endsWith("/intents")) {
        return jsonRes({ ok: true, serverVersion: 1 });
      }
      return jsonRes({ error: "unexpected" }, 500);
    };

    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch }),
    );

    expect(result.total).toBe(1);
    expect(result.migrated).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.dryRun).toBe(false);

    const migratedOutcome = result.outcomes[0];
    expect(migratedOutcome.status).toBe("migrated");
    if (migratedOutcome.status === "migrated") {
      expect(migratedOutcome.mediaId).toBe(newMediaId);
    }

    // Verify UPDATE_BLOCK intent was dispatched with correct patch
    const intentCall = calls.find(
      (c) => c.method === "POST" && String(c.url).endsWith("/intents"),
    );
    expect(intentCall).toBeDefined();
    const intentBody = intentCall?.body as {
      intent: { type: string; patch: { data: { src: string } } };
    };
    expect(intentBody.intent.type).toBe("UPDATE_BLOCK");
    expect(intentBody.intent.patch.data.src).toBe(`media:${newMediaId}`);
  });
});

describe("migratePlanImageRefs — already migrated (noop)", () => {
  it("skips block whose src is already media:", async () => {
    const planId = "plan-alreadymig";
    const blockId = "blk-skip";

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET" && url.endsWith(`/plans/${planId}`)) {
        return jsonRes({
          snapshot: {
            blocks: {
              [blockId]: { id: blockId, data: { src: "media:med_existing" } },
            },
          },
          tailEntries: [],
        });
      }
      // Should never be called
      return jsonRes({ error: "unexpected" }, 500);
    };

    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch }),
    );
    expect(result.total).toBe(0);
    expect(result.migrated).toBe(0);
  });
});

describe("migratePlanImageRefs — SSRF blocked URL", () => {
  it("returns skipped_ssrf, continues without throwing", async () => {
    const planId = "plan-ssrf";
    const blockId = "blk-ssrf";
    const privateUrl = "http://192.168.1.1/image.png";

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET") {
        return jsonRes(planWith(blockId, privateUrl));
      }
      if (method === "POST" && url.endsWith("/media/from-url")) {
        return jsonRes(
          { error: "Blocked host: 192.168.1.1", code: "FORBIDDEN_HOST" },
          400,
        );
      }
      return jsonRes({ error: "unexpected" }, 500);
    };

    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch }),
    );
    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.migrated).toBe(0);
    expect(result.outcomes[0].status).toBe("skipped_ssrf");
  });
});

describe("migratePlanImageRefs — fetch timeout", () => {
  it("returns skipped_fetch on timeout, other refs continue", async () => {
    const planId = "plan-timeout";
    const blockIdTimeout = "blk-timeout";
    const blockIdOk = "blk-ok";
    const urlTimeout = "https://slow.example.com/img.png";
    const urlOk = "https://fast.example.com/img.png";
    const newMediaId = "med_fast";

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "GET") {
        return jsonRes({
          snapshot: {
            blocks: {
              [blockIdTimeout]: {
                id: blockIdTimeout,
                data: { src: urlTimeout },
              },
              [blockIdOk]: { id: blockIdOk, data: { src: urlOk } },
            },
          },
          tailEntries: [],
        });
      }

      if (method === "POST" && url.endsWith("/media/from-url")) {
        // Determine which URL is being processed from the request body
        const body =
          typeof init?.body === "string" ? JSON.parse(init.body) : {};
        if (body.url === urlTimeout) {
          // Simulate timeout
          const err = Object.assign(new Error("The operation was aborted"), {
            name: "TimeoutError",
          });
          throw err;
        }
        return jsonRes({ media: { id: newMediaId } }, 201);
      }
      if (method === "POST" && url.endsWith("/intents")) {
        return jsonRes({ ok: true, serverVersion: 1 });
      }
      return jsonRes({ error: "unexpected" }, 500);
    };

    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch }),
    );
    expect(result.total).toBe(2);
    expect(result.migrated).toBe(1);
    expect(result.failed).toBe(1);

    const timeoutOutcome = result.outcomes.find(
      (o) => o.blockId === blockIdTimeout,
    );
    expect(timeoutOutcome?.status).toBe("skipped_fetch");
    if (timeoutOutcome?.status === "skipped_fetch") {
      expect(timeoutOutcome.reason).toContain("timed out");
    }

    const okOutcome = result.outcomes.find((o) => o.blockId === blockIdOk);
    expect(okOutcome?.status).toBe("migrated");
  });
});

describe("migratePlanImageRefs — dry-run", () => {
  it("does not call from-url or intents; returns outcomes with dry_run status", async () => {
    const planId = "plan-dryrun";
    const blockId = "blk-dry";
    const imageUrl = "https://example.com/img.png";

    let fromUrlCalled = false;
    let intentsCalled = false;

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET") {
        return jsonRes(planWith(blockId, imageUrl));
      }
      if (method === "POST" && url.endsWith("/media/from-url")) {
        fromUrlCalled = true;
      }
      if (method === "POST" && url.endsWith("/intents")) {
        intentsCalled = true;
      }
      return jsonRes({ error: "unexpected" }, 500);
    };

    const opts: MigrateOptions = { ...DEFAULT_OPTS, dryRun: true };
    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch, options: opts }),
    );

    expect(result.dryRun).toBe(true);
    expect(fromUrlCalled).toBe(false);
    expect(intentsCalled).toBe(false);
    expect(result.total).toBe(1);
    expect(result.outcomes[0].status).toBe("dry_run");
  });
});

describe("migratePlanImageRefs — concurrency batching", () => {
  it("processes 5 URLs with concurrency=4 (two batches)", async () => {
    const planId = "plan-batch";
    const blocks: Record<string, { id: string; data: { src: string } }> = {};
    for (let i = 0; i < 5; i++) {
      blocks[`blk-${i}`] = {
        id: `blk-${i}`,
        data: { src: `https://example.com/img-${i}.png` },
      };
    }

    let fromUrlCallCount = 0;

    const mockFetch: FetchFn = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method === "GET") {
        return jsonRes({ snapshot: { blocks }, tailEntries: [] });
      }
      if (method === "POST" && url.endsWith("/media/from-url")) {
        fromUrlCallCount++;
        return jsonRes({ media: { id: `med_${fromUrlCallCount}` } }, 201);
      }
      if (method === "POST" && url.endsWith("/intents")) {
        return jsonRes({ ok: true, serverVersion: 1 });
      }
      return jsonRes({ error: "unexpected" }, 500);
    };

    const opts: MigrateOptions = { ...DEFAULT_OPTS, concurrency: 4 };
    const result = await migratePlanImageRefs(
      planId,
      makeDeps({ fetch: mockFetch, options: opts }),
    );

    expect(result.total).toBe(5);
    expect(result.migrated).toBe(5);
    expect(fromUrlCallCount).toBe(5);
  });
});
