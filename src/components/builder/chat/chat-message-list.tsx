"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { chatApi } from "@/data/chat/api";
import { usePromoteAttachmentMutation } from "@/data/media";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import {
  type AttachmentRef,
  type ChatMessage,
  type StagedIntent,
  useChatStore,
} from "@/services/stores";
import { ChatMarkdown } from "./chat-markdown";
import { ChatMessageSteps } from "./chat-message-steps";

const EMPTY_MESSAGES: never[] = [];
const EMPTY_STAGED: never[] = [];
const BOTTOM_SLACK_PX = 32;

export function ChatMessageList() {
  const sessionId = useChatStore((s) => s.currentSessionId);
  const planId = useChatStore((s) => s.planId);
  const messages = useChatStore((s) =>
    sessionId
      ? (s.messagesBySession[sessionId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  );
  const stagedAll = useChatStore((s) =>
    sessionId ? (s.stagedBySession[sessionId] ?? EMPTY_STAGED) : EMPTY_STAGED,
  );
  const runState = useChatStore((s) => s.runState);

  const stagedByMessage = new Map<string, StagedIntent[]>();
  for (const st of stagedAll) {
    const list = stagedByMessage.get(st.messageId) ?? [];
    list.push(st);
    stagedByMessage.set(st.messageId, list);
  }

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 8,
    getItemKey: (i) => messages[i].id,
  });

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setUnreadCount(0);
    setIsAtBottom(true);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK_PX;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  };

  // 새 메시지 도착: 하단에 있으면 따라가기, 위에 있으면 unread 뱃지 증가
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on count change only
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else {
      setUnreadCount((c) => c + 1);
    }
  }, [messages.length]);

  // 스트리밍 콘텐츠가 늘어날 때: 하단에 있을 때만 따라가기
  // biome-ignore lint/correctness/useExhaustiveDependencies: track last content
  useEffect(() => {
    if (!scrollRef.current || !isAtBottom) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages[messages.length - 1]?.content]);

  if (!sessionId) return null;

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator =
    runState === "running" &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      lastMessage.role === "tool" ||
      // assistant message exists but is still empty (waiting for first delta)
      (lastMessage.role === "assistant" &&
        lastMessage.content.length === 0 &&
        !(lastMessage.steps && lastMessage.steps.length > 0)));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Start chatting. Claude can edit blocks, add sections, or export the
            plan. Tag with @ or click a block in the canvas.
          </div>
        ) : null}
        {/* Virtualized message list — absolute-positioned rows inside a sized container */}
        <div
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          className="relative w-full"
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const m = messages[vi.index];
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
                className="pb-4"
              >
                <MessageBubble
                  message={m}
                  staged={stagedByMessage.get(m.id) ?? []}
                  planId={planId}
                  sessionId={sessionId}
                />
              </div>
            );
          })}
        </div>
        {/* TypingIndicator stays outside the virtual container so it's always visible at the bottom */}
        {showTypingIndicator ? <TypingIndicator /> : null}
      </div>
      {!isAtBottom ? (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-caption text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ChevronDown className="size-3" />
          <span>
            {unreadCount > 0 ? `${unreadCount} new` : "Jump to bottom"}
          </span>
        </button>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="inline-flex w-fit items-center gap-1 self-start rounded-2xl rounded-bl-md bg-card px-3 py-2 shadow-sm">
      <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
    </div>
  );
}

function MessageBubble({
  message,
  staged,
  planId,
  sessionId,
}: {
  message: ChatMessage;
  staged: StagedIntent[];
  planId: string | null;
  sessionId: string | null;
}) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isAssistant = message.role === "assistant";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const setComposerText = useChatStore((s) => s.setComposerText);
  const composerText = useChatStore((s) => s.composerText);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleResend = () => {
    if (composerText.trim().length > 0) return;
    setComposerText(message.content);
  };

  const bubbleStyles = cn(
    "max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm",
    isUser &&
      "rounded-br-md border border-primary/30 bg-primary/15 text-foreground",
    isAssistant && "rounded-bl-md border border-border bg-card text-foreground",
    isTool &&
      "rounded-bl-md border border-dashed border-border/60 bg-muted/40 text-muted-foreground italic",
  );

  return (
    <div
      className={cn(
        "group/msg flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div className={bubbleStyles}>
        {isAssistant && message.steps && message.steps.length > 0 ? (
          <ChatMessageSteps steps={message.steps} streaming={isStreaming} />
        ) : null}
        {message.mentions.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {message.mentions.map((m) => (
              <span
                key={`${m.kind}:${m.id}`}
                className="rounded-md bg-primary/20 px-2 py-0.5 text-caption font-medium text-primary"
              >
                @{m.label}
              </span>
            ))}
          </div>
        ) : null}
        {isTool ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div className="break-words">
            <ChatMarkdown content={message.content} />
            {isStreaming ? (
              <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-middle" />
            ) : null}
          </div>
        )}
        {message.attachments.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.attachments.map((a) => (
              <AttachmentBadge
                key={a.id}
                attachment={a}
                planId={planId}
                sessionId={sessionId ?? message.sessionId}
              />
            ))}
          </div>
        ) : null}
        {staged.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {staged.map((st) => (
              <StagedDiffCard key={st.id} staged={st} />
            ))}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 px-1 text-caption text-muted-foreground opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/msg:opacity-100",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy message"
          title="Copy"
          className="inline-flex size-5 items-center justify-center rounded border bg-background hover:text-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
        {isError && isUser ? (
          <button
            type="button"
            onClick={handleResend}
            aria-label="Resend message"
            title="Resend (loads into composer)"
            className="inline-flex size-5 items-center justify-center rounded border bg-background hover:text-foreground"
          >
            <RefreshCw className="size-3" />
          </button>
        ) : null}
        <span
          className="whitespace-nowrap font-medium"
          title={formatAbsoluteTime(message.createdAt)}
        >
          {formatRelativeTime(message.createdAt)}
        </span>
        {isError ? <span className="text-destructive">· error</span> : null}
      </div>
    </div>
  );
}

function StagedDiffCard({ staged }: { staged: StagedIntent }) {
  const resolveStaged = useChatStore((s) => s.resolveStaged);

  const handleApply = async () => {
    await chatApi.applyStaged(staged.id);
    resolveStaged(staged.sessionId, staged.id, "applied");
  };
  const handleReject = async () => {
    await chatApi.rejectStaged(staged.id);
    resolveStaged(staged.sessionId, staged.id, "rejected");
  };

  const summary = summarizeEntry(staged.entry);

  return (
    <div className="rounded-md border bg-background p-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
          {staged.status === "staged" ? "Staged change" : staged.status}
        </span>
      </div>
      <pre className="mb-1.5 max-h-24 overflow-auto rounded-sm bg-muted/40 p-1 text-caption text-muted-foreground">
        {summary}
      </pre>
      {staged.status === "staged" ? (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-6 px-2 text-caption"
            onClick={handleApply}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-caption"
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

// ─── Attachment badge with "Use in plan" promote action ──────────────────────

// Human-readable messages for promote error codes.
const PROMOTE_ERROR_MESSAGES: Record<string, string> = {
  ATTACHMENT_NOT_FOUND: "첨부 파일을 찾을 수 없습니다.",
  SESSION_NOT_FOUND: "채팅 세션을 찾을 수 없습니다.",
  ATTACHMENT_FILE_MISSING: "첨부 파일이 디스크에서 없어졌습니다.",
  STORAGE_ERROR: "미디어 라이브러리에 저장하는 데 실패했습니다.",
  BAD_REQUEST: "잘못된 요청입니다.",
};

function AttachmentBadge({
  attachment,
  planId,
  sessionId,
}: {
  attachment: AttachmentRef;
  planId: string | null;
  sessionId: string;
}) {
  const promote = usePromoteAttachmentMutation(planId ?? "", sessionId);

  const handlePromote = () => {
    if (!planId) return;
    promote.mutate(attachment.id, {
      onError: (err) => {
        // Try to extract a structured error code from the response.
        const code =
          (err as { response?: { data?: { code?: string } } })?.response?.data
            ?.code ?? "";
        const message =
          PROMOTE_ERROR_MESSAGES[code] ??
          "미디어 라이브러리에 추가하는 데 실패했습니다.";
        toast.error(message);
      },
    });
  };

  const isPromoted = attachment.mediaId != null;
  const isPending = promote.isPending;

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-caption text-muted-foreground">
      <span className="max-w-[120px] truncate">
        📎 {attachment.originalName}
      </span>
      {isPromoted ? (
        <span className="flex items-center gap-0.5 text-caption text-muted-foreground/70">
          <Check className="size-2.5" />
          In library
        </span>
      ) : planId ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handlePromote}
          aria-label={`Use ${attachment.originalName} in plan`}
          title="Use in plan"
          className="flex items-center gap-0.5 rounded px-1 py-0.5 text-caption text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {isPending ? (
            <span className="size-2.5 animate-spin rounded-full border border-primary border-t-transparent" />
          ) : (
            <BookmarkPlus className="size-2.5" />
          )}
          Use in plan
        </button>
      ) : null}
    </div>
  );
}
