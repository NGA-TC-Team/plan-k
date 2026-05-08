"use client";

import type { ReactNode } from "react";
import { GlobalOverlays } from "@/components/global-overlays";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "./query-provider";
import { ThemeSync } from "./theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider>
        <ThemeSync />
        {children}
        <GlobalOverlays />
        <Toaster />
      </TooltipProvider>
    </QueryProvider>
  );
}
