"use client";

// Root-level error boundary — replaces <html>/<body> when active.
// AppProviders are NOT available at this point; only globals.css is safe to import.
// Next.js 16: prop is `unstable_retry`, not `reset`.
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              오류가 발생했습니다.
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--muted-foreground)",
                margin: 0,
              }}
            >
              예기치 않은 오류로 페이지를 불러올 수 없습니다.
            </p>
            {error.digest && (
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                  margin: 0,
                }}
              >
                코드: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => unstable_retry()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "2rem",
                  padding: "0 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                다시 시도
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "2rem",
                  padding: "0 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "1px solid transparent",
                  borderRadius: "0.5rem",
                  background: "transparent",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                홈으로
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
