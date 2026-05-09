"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useErrorsStore } from "@/services/stores/errors-store";

// ---------------------------------------------------------------------------
// ErrorListenersProvider
//
// Mounts window-level listeners for uncaught errors and unhandled promise
// rejections. Pushes structured records into useErrorsStore.
//
// Rendered once inside AppProviders (outside QueryProvider is fine — the
// store is Zustand, not TanStack Query).
// ---------------------------------------------------------------------------

type Props = { children: ReactNode };

export function ErrorListenersProvider({ children }: Props) {
  // Guard flag: prevent writing to the store after unmount.
  // Using a ref so it doesn't trigger re-renders.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function handleError(event: ErrorEvent) {
      if (!mountedRef.current) return;
      const message = event.message ?? String(event.error ?? "Unknown error");
      const detail =
        event.error instanceof Error
          ? (event.error.stack ?? message)
          : String(event.error ?? message);
      useErrorsStore.getState().push({
        severity: "error",
        source: "uncaught",
        message,
        detail,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!mountedRef.current) return;
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : String(reason ?? "Unhandled promise rejection");
      const detail =
        reason instanceof Error
          ? (reason.stack ?? message)
          : String(reason ?? message);
      useErrorsStore.getState().push({
        severity: "error",
        source: "uncaught",
        message,
        detail,
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return <>{children}</>;
}
