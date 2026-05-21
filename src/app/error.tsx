"use client";

// Root segment error boundary. AppProviders are active here → shadcn Button available.
// Next.js 16: prop is `unstable_retry`, not `reset`.
// Note: Button is based on @base-ui/react/button — no asChild. Use <a> for link action.
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">
          오류가 발생했습니다.
        </h1>
        <p className="text-sm text-muted-foreground">
          예기치 않은 오류로 이 페이지를 표시할 수 없습니다.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            코드: {error.digest}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => unstable_retry()}>
            다시 시도
          </Button>
          <Button variant="ghost" size="sm">
            <Link href="/" className="flex items-center">
              홈으로
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
