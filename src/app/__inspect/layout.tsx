import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InspectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <header className="mb-6 border-b pb-3">
        <a
          href="/__inspect"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← __inspect
        </a>
        <h1 className="mt-1 font-mono text-lg">Dev Inspector</h1>
        <p className="text-xs text-muted-foreground">
          Read-only. Local development only.
        </p>
      </header>
      {children}
    </div>
  );
}
