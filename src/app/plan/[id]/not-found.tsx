// Plan-specific 404 — server component.
import Link from "next/link";

export default function PlanNotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">
          이 plan을 찾을 수 없습니다.
        </h1>
        <p className="text-sm text-muted-foreground">
          삭제되었거나 존재하지 않는 plan입니다.
        </p>
        <div className="flex gap-2">
          <Link
            href="/projects"
            className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted transition-colors"
          >
            프로젝트 목록
          </Link>
          <Link
            href="/"
            className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-transparent px-2.5 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
