"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
};

export function MobileFrame({
  title,
  className,
  innerClassName,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-[380px] max-w-full overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/85 bg-background shadow-lg",
        className,
      )}
      data-frame="mobile"
    >
      <div className="relative flex h-7 items-center justify-between bg-foreground/85 px-6 text-caption text-background">
        <span>9:41</span>
        <span
          aria-hidden
          className="absolute left-1/2 top-1 h-4 w-24 -translate-x-1/2 rounded-b-2xl bg-foreground/85"
        />
        <span className="flex items-center gap-1">
          <span className="inline-block size-1 rounded-full bg-background" />
          <span className="inline-block size-1 rounded-full bg-background" />
          <span className="inline-block size-1 rounded-full bg-background" />
          <span className="inline-block h-1.5 w-3 rounded-sm border border-background" />
        </span>
      </div>
      {title ? (
        <div className="border-b px-4 py-2 text-center text-xs font-medium">
          {title}
        </div>
      ) : null}
      <div className={cn("p-3", innerClassName)}>{children}</div>
      <div className="flex h-5 items-center justify-center bg-background">
        <span className="h-1 w-32 rounded-full bg-foreground/40" />
      </div>
    </div>
  );
}
