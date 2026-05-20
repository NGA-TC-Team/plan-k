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
        "rounded-md border border-dashed border-hairline-strong bg-surface-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WireBar({ className }: { className?: string }) {
  return <div className={cn("h-2 rounded-full bg-surface-3", className)} />;
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-caption font-medium uppercase tracking-eyebrow text-ink-subtle">
      {kind}
    </span>
  );
}
