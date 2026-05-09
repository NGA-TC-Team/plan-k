import type { PrintOptions } from "@/services/stores/print-options.store";

/**
 * Build URLSearchParams for an export request (PDF or PNG).
 *
 * Used by both the TopBar ExportMenu (current plan) and VersionsListItem
 * (version-scoped export). The `extra` bag accepts additional params such as
 * `versionId`.
 */
export function buildExportParams(
  planId: string,
  opts: PrintOptions,
  extra?: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams({
    planId,
    cover: String(opts.cover),
    toc: String(opts.toc),
    pageNumbers: String(opts.pageNumbers),
  });
  if (opts.footerText) params.set("footerText", opts.footerText);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  return params;
}
