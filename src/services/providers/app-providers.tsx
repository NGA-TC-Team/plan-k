"use client";

import type { ReactNode } from "react";
import { GlobalOverlays } from "@/components/global-overlays";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorListenersProvider } from "./error-listeners-provider";
import { QueryProvider } from "./query-provider";
import { ThemeSync } from "./theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ErrorListenersProvider>
        <TooltipProvider>
          <ThemeSync />
          {children}
          <GlobalOverlays />
          <Toaster />
        </TooltipProvider>
      </ErrorListenersProvider>
    </QueryProvider>
  );
}
