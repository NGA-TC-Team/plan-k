import Link from "next/link";
import { RecentsList } from "@/components/home/recents-list";

const DEMOS: { id: string; label: string; description: string }[] = [
  {
    id: "demo-web",
    label: "Janggu (장구) — Web SaaS demo",
    description:
      "B2B 운영 대시보드 — 배민·쿠팡이츠·요기요 통합 콘솔. 4 screens + 200+ blocks of PRD, ADRs, schemas, KPIs.",
  },
  {
    id: "demo-mobile",
    label: "Jukku (죽구) — Mobile demo",
    description:
      "B2C 습관 트래커 — 친구 한 명과 21일 페어링. 5 screens with status-bar/list-row/fab/bottom-nav + full PM doc set.",
  },
  {
    id: "demo-agent",
    label: "Saetbyeol (샛별) — AI agent demo",
    description:
      "새벽배송 CS 인박스 트리아지 에이전트. 7-node scenario graph + tool spec + memory model + sample interactions.",
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
          Recently edited
        </h2>
        <RecentsList />
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
