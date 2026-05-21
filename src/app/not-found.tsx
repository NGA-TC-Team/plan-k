// Global 404 — server component (no client state needed).
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">
          찾을 수 없는 페이지입니다.
        </h1>
        <p className="text-sm text-muted-foreground">
          요청하신 주소에 해당하는 페이지가 존재하지 않습니다.
        </p>
        <div className="flex gap-2">
          <Link
            href="/"
            className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
