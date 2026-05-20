"use client";

import { toast } from "sonner";

export type ExportKind = "pdf" | "png";

export type ExportPlanArgs = {
  planId: string;
  kind: ExportKind;
  sectionId?: string;
  versionId?: string;
  /** PDF/print cover page. Undefined → server default (true). */
  cover?: boolean;
  /** PDF/print table of contents. Undefined → server default (true). */
  toc?: boolean;
  /** PDF page numbers in footer. Undefined → server default (true). */
  pageNumbers?: boolean;
  /** Optional label prepended to the footer page-number line. */
  footerText?: string;
  /** PNG-only: viewport width in CSS pixels. */
  width?: number;
};

/**
 * Normalises fetch/HTTP errors into a short Korean message suitable for
 * display in a Sonner error toast. Must not expose stack traces or internal
 * paths to the user.
 */
function normalizeExportError(e: unknown): string {
  if (e instanceof ExportHttpError) {
    if (e.status === 404) return "플랜을 찾을 수 없습니다";
    if (e.status === 400) return "요청 정보가 부족합니다";
    if (e.status >= 500) return "서버 오류가 발생했습니다";
    return `요청이 실패했습니다 (${e.status})`;
  }
  if (e instanceof TypeError) {
    // fetch() throws TypeError on network failure (offline, DNS, CORS)
    return "네트워크 오류가 발생했습니다";
  }
  if (e instanceof Error) return e.message || "알 수 없는 오류";
  return "알 수 없는 오류";
}

class ExportHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ExportHttpError";
  }
}

/**
 * Fetches the export endpoint, streams the binary response into a Blob,
 * triggers a browser download, and cleans up the object URL.
 *
 * Throws ExportHttpError on non-2xx responses, TypeError on network failure.
 */
export async function exportPlanToFile(args: ExportPlanArgs): Promise<void> {
  const {
    planId,
    kind,
    sectionId,
    versionId,
    cover,
    toc,
    pageNumbers,
    footerText,
    width,
  } = args;

  const params = new URLSearchParams({ planId });
  if (sectionId !== undefined) params.set("sectionId", sectionId);
  if (versionId !== undefined) params.set("versionId", versionId);
  if (cover !== undefined) params.set("cover", String(cover));
  if (toc !== undefined) params.set("toc", String(toc));
  if (pageNumbers !== undefined) params.set("pageNumbers", String(pageNumbers));
  if (footerText !== undefined && footerText !== "")
    params.set("footerText", footerText);
  if (kind === "png" && width !== undefined) params.set("width", String(width));

  const response = await fetch(`/api/exports/${kind}?${params.toString()}`);

  if (!response.ok) {
    // Attempt to parse structured error from server; fall back to status text.
    let serverMessage: string = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === "string" && body.message) {
        serverMessage = body.message;
      }
    } catch {
      // Ignore parse failure — use status text
    }
    throw new ExportHttpError(response.status, serverMessage);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  // Derive filename from Content-Disposition if present, else build a fallback.
  let filename: string;
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(
    /filename\*?=(?:UTF-8''|"?)([^";]+)/i,
  );
  if (filenameMatch?.[1]) {
    filename = decodeURIComponent(filenameMatch[1].trim());
  } else {
    const suffix = sectionId ? `-${sectionId}` : "";
    filename = `plan-${planId}${suffix}.${kind}`;
  }

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Revoke regardless of whether the click succeeded.
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Wraps exportPlanToFile with a Sonner promise toast showing loading /
 * success / error states. Returns the same promise so callers can await if
 * needed.
 */
export function exportPlanWithToast(args: ExportPlanArgs): Promise<void> {
  const promise = exportPlanToFile(args);
  toast.promise(promise, {
    loading: "내보내는 중...",
    success: args.kind === "pdf" ? "PDF를 내보냈습니다" : "PNG를 내보냈습니다",
    error: (e: unknown) => `내보내기 실패: ${normalizeExportError(e)}`,
  });
  return promise;
}
