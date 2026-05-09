"use client";

import { toast } from "sonner";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ErrorSeverity = "info" | "warn" | "error";

export type ErrorSource =
  | "reducer"
  | "network"
  | "store"
  | "uncaught"
  | "manual";

export type AppError = {
  id: string;
  at: number;
  severity: ErrorSeverity;
  source: ErrorSource;
  message: string;
  /** Stack trace / raw payload — for the future drawer (PR-B) */
  detail?: string;
  context?: Record<string, unknown>;
};

type ErrorsState = {
  buffer: AppError[];
  push: (e: Omit<AppError, "id" | "at">) => void;
  clear: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUFFER_MAX = 20;
const DEDUPE_WINDOW_MS = 1000;

// ---------------------------------------------------------------------------
// ID generation — crypto.randomUUID() with a fallback for environments that
// don't expose the Web Crypto API (e.g. very old Node versions in CI).
// ---------------------------------------------------------------------------
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random base36 suffix
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Toast helper — isolated so tests can stub; guarded against Sonner not being
// mounted yet (SSR / test environments).
// ---------------------------------------------------------------------------
export function fireToast(severity: ErrorSeverity, message: string): void {
  try {
    if (severity === "error") {
      toast.error(message);
    } else if (severity === "warn") {
      toast.warning(message);
    } else {
      toast.message(message);
    }
  } catch {
    // Toast call failed (Sonner not mounted). Record was already pushed —
    // swallow silently so push() always completes.
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useErrorsStore = create<ErrorsState>()((set, get) => ({
  buffer: [],

  push(e) {
    const now = Date.now();
    const id = generateId();

    const { buffer } = get();
    const head = buffer[0];

    // Build the new record.
    const record: AppError = {
      id,
      at: now,
      severity: e.severity,
      source: e.source,
      message: e.message,
      ...(e.detail !== undefined ? { detail: e.detail } : {}),
      ...(e.context !== undefined ? { context: e.context } : {}),
    };

    // Dedupe gate: same message within DEDUPE_WINDOW_MS → skip toast but
    // still add the record to the buffer.
    const isDuplicate =
      head !== undefined &&
      head.message === e.message &&
      now - head.at < DEDUPE_WINDOW_MS;

    // Single setState call — no read-then-write race because Zustand's
    // set() is synchronous and we read get() once at the top of push().
    set({ buffer: [record, ...buffer].slice(0, BUFFER_MAX) });

    if (!isDuplicate) {
      fireToast(e.severity, e.message);
    }
  },

  clear() {
    set({ buffer: [] });
  },
}));
