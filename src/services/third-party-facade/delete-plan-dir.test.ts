/**
 * deletePlanDir behavior — covers E7 PR-7 Unit A's filesystem expectations.
 *
 * The DB-side wiring (DELETE_PROJECT intent → plan-store.ts → deletePlanDir)
 * cannot run inside `bun test` because plan-store transitively imports
 * better-sqlite3 (a Node-only native addon). That integration is verified by
 * source inspection + manual smoke. Here we only pin the helper itself:
 * deleting an existing plan dir, missing-dir idempotency, nested files.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { deletePlanDir, LOCAL_MEDIA_ROOT } from "./media-store";

describe("deletePlanDir", () => {
  const planId = `test-plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const planDir = path.join(LOCAL_MEDIA_ROOT, planId);

  beforeEach(async () => {
    await rm(planDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(planDir, { recursive: true, force: true });
  });

  it("removes a plan directory containing files", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(path.join(planDir, "file.png"), Buffer.from([1, 2, 3]));
    await deletePlanDir(planId);
    expect(await dirExists(planDir)).toBe(false);
  });

  it("is idempotent when the directory does not exist", async () => {
    expect(await dirExists(planDir)).toBe(false);
    await expect(deletePlanDir(planId)).resolves.toBeUndefined();
  });

  it("removes nested files and subdirectories", async () => {
    const nested = path.join(planDir, "nested", "deeper");
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "a.bin"), Buffer.from([0]));
    await writeFile(path.join(planDir, "b.bin"), Buffer.from([0]));
    await deletePlanDir(planId);
    expect(await dirExists(planDir)).toBe(false);
  });
});

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// silence unused-import warnings — `os` is reserved for future MEDIA_ROOT
// override tests once media-store exposes a configurable root.
void os;
