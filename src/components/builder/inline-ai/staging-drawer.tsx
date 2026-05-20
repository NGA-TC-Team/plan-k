"use client";

import { useQueries } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { chatApi } from "@/data/chat/api";
import { useInlineAiStore } from "@/services/stores";

// Floating bottom drawer that surfaces staged intents from inline AI
// runs. We poll each tracked session's staged list while the drawer
// is open; SSE wiring is overkill for this short-lived flow.
export function InlineAiDrawer() {
  const open = useInlineAiStore((s) => s.open);
  const setOpen = useInlineAiStore((s) => s.setOpen);
  const sessionIds = useInlineAiStore((s) => s.sessionIds);
  const removeSession = useInlineAiStore((s) => s.removeSession);

  const sessionQueries = useQueries({
    queries: sessionIds.map((id) => ({
      queryKey: ["inline-ai", "session", id],
      queryFn: () => chatApi.getSession(id),
      enabled: open,
      refetchInterval: open ? 1_000 : false,
    })),
  });

  const sessions = sessionQueries
    .map((q, i) => ({ id: sessionIds[i], data: q.data, loading: q.isLoading }))
    .filter((s) => s.id !== undefined);

  const totalStaged = sessions.reduce(
    (acc, s) =>
      acc + (s.data?.staged.filter((x) => x.status === "staged").length ?? 0),
    0,
  );
  const anyRunning = sessions.some((s) => {
    const last = s.data?.messages.at(-1);
    return last?.status === "streaming" || last?.status === "pending";
  });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[60vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <span>Inline AI</span>
            {anyRunning ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {totalStaged} staged · {sessions.length} sessions
            </span>
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active inline AI runs.
            </p>
          ) : (
            sessions.map((s) => (
              <SessionGroup
                key={s.id}
                sessionId={s.id}
                title={s.data?.session.title ?? "…"}
                staged={s.data?.staged ?? []}
                onClose={() => removeSession(s.id)}
              />
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SessionGroup({
  sessionId,
  title,
  staged,
  onClose,
}: {
  sessionId: string;
  title: string;
  staged: { id: string; status: string; entry: unknown }[];
  onClose: () => void;
}) {
  const open = staged.filter((s) => s.status === "staged");
  return (
    <section className="mb-4 rounded-md border bg-muted/30">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span className="flex-1 truncate text-xs font-medium">{title}</span>
        <span className="text-caption text-muted-foreground">
          {open.length}/{staged.length} pending
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss session"
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </header>
      <div className="space-y-2 p-2">
        {staged.length === 0 ? (
          <p className="px-2 py-3 text-center text-caption text-muted-foreground">
            Waiting for the model…
          </p>
        ) : (
          staged.map((st) => (
            <StagedDiffRow
              key={st.id}
              stagedId={st.id}
              sessionId={sessionId}
              status={st.status}
              entry={st.entry}
            />
          ))
        )}
      </div>
    </section>
  );
}

function StagedDiffRow({
  stagedId,
  status,
  entry,
}: {
  stagedId: string;
  sessionId: string;
  status: string;
  entry: unknown;
}) {
  const summary = summarizeEntry(entry);
  const handleApply = async () => {
    try {
      await chatApi.applyStaged(stagedId);
      toast.success("Applied");
    } catch (err) {
      toast.error(`Apply failed: ${err instanceof Error ? err.message : err}`);
    }
  };
  const handleReject = async () => {
    try {
      await chatApi.rejectStaged(stagedId);
      toast.message("Rejected");
    } catch (err) {
      toast.error(`Reject failed: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div className="rounded-md border bg-background p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
          {status}
        </span>
      </div>
      <pre className="mb-2 max-h-32 overflow-auto rounded-sm bg-muted/40 p-1.5 text-caption text-muted-foreground">
        {summary}
      </pre>
      {status === "staged" ? (
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 px-2" onClick={handleApply}>
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function summarizeEntry(entry: unknown): string {
  if (!entry || typeof entry !== "object") return JSON.stringify(entry);
  const e = entry as { intent?: { type?: string; nodeId?: string } };
  return `${e.intent?.type ?? "intent"} ${e.intent?.nodeId ?? ""}\n${JSON.stringify(
    entry,
    null,
    2,
  ).slice(0, 600)}`;
}
