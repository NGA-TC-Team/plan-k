import { cn } from "@/lib/utils";

export function WireBox({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-zinc-300 bg-zinc-100/70 dark:border-zinc-600 dark:bg-zinc-800/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WireBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-2 rounded-full bg-zinc-300 dark:bg-zinc-600", className)}
    />
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-sm bg-zinc-200 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      {kind}
    </span>
  );
}
