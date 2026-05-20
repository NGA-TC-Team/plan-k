"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  url?: string;
  title?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

export function BrowserFrame({
  url,
  title,
  className,
  innerClassName,
  children,
}: Props) {
  const displayUrl = url ?? "about:blank";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-hairline bg-background",
        className,
      )}
      data-frame="browser"
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex shrink-0 gap-1.5">
          <span className="size-3 rounded-full bg-muted-foreground/30" />
          <span className="size-3 rounded-full bg-muted-foreground/30" />
          <span className="size-3 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="mx-2 flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          <span className="size-3 shrink-0 rounded-full border" />
          <span className="truncate">{displayUrl}</span>
        </div>
        {title ? (
          <span className="shrink-0 truncate text-xs text-muted-foreground">
            {title}
          </span>
        ) : null}
      </div>
      <div className={cn("p-4", innerClassName)}>{children}</div>
    </div>
  );
}
