// ─── mediaRefToUrl ─────────────────────────────────────────────────────────
//
// Pure mapping from a block imageRef value to a URL that browsers/Puppeteer
// can fetch. Exported separately so server-side callers (e.g. the print route
// in a later PR) can use it without a React context.
//
// Protocol:
//   "media:<id>"  → /api/media/<id>/raw    (plan-scoped stored media)
//   any other ref → returned as-is          (backwards compat with raw URLs)
//   falsy / ""    → undefined               (no image)
//
// The "media:" prefix is the canonical ref format introduced in E7.
// Forward-compat: if new prefixes are added in later PRs, extend here only.

const MEDIA_PREFIX = "media:" as const;

/**
 * Convert a block imageRef string to a fetchable URL.
 *
 * - `media:<id>` → `/api/media/<id>/raw`
 * - `https://...` or any other non-empty string → returned unchanged
 * - Falsy or empty → `undefined`
 * - `media:` with an empty id segment → `undefined` (guards against
 *   malformed refs that would produce `/api/media//raw`)
 */
export function mediaRefToUrl(ref: string | undefined): string | undefined {
  if (!ref) return undefined;

  if (ref.startsWith(MEDIA_PREFIX)) {
    const id = ref.slice(MEDIA_PREFIX.length);
    // Guard: reject malformed refs where the id segment is empty.
    if (!id) return undefined;
    return `/api/media/${id}/raw`;
  }

  return ref;
}

/**
 * React hook wrapper around `mediaRefToUrl`.
 *
 * This hook has no internal state — it is a stable pure mapping and does not
 * subscribe to any store. The React Compiler will inline it if not needed at
 * runtime. Do NOT add useMemo/useCallback here.
 */
export function useMediaUrl(ref: string | undefined): string | undefined {
  return mediaRefToUrl(ref);
}
