import Link from "next/link";

const DEMOS: { id: string; label: string; description: string }[] = [
  {
    id: "demo-web",
    label: "Web app demo",
    description: "Multi-screen web plan with browser frame + flow view.",
  },
  {
    id: "demo-mobile",
    label: "Mobile app demo",
    description: "Mobile plan with device frame + screen flow.",
  },
  {
    id: "demo-agent",
    label: "AI agent demo",
    description: "Agent plan with scenario sections + node graph.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">plan-k</h1>
        <p className="text-muted-foreground">
          A locally-built planning workspace for designing web, mobile, and AI
          agent apps with Claude Code.
        </p>
      </header>

      <section>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Open your projects →
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Open a demo plan
        </h2>
        <ul className="space-y-2">
          {DEMOS.map((demo) => (
            <li key={demo.id}>
              <Link
                href={`/plan/${demo.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="font-medium">{demo.label}</div>
                <div className="text-sm text-muted-foreground">
                  {demo.description}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  /plan/{demo.id}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
