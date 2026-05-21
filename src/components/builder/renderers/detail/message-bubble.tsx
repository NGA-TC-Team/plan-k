"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// ── type helpers ─────────────────────────────────────────────────────────────

function stringVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

// ── status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "sent") {
    return (
      <Check className="size-3 text-muted-foreground/60" aria-label="Sent" />
    );
  }
  if (status === "delivered") {
    return (
      <CheckCheck
        className="size-3 text-muted-foreground/60"
        aria-label="Delivered"
      />
    );
  }
  // read
  return <CheckCheck className="size-3 text-blue-500" aria-label="Read" />;
}

// ── avatar sub-component ─────────────────────────────────────────────────────

function Avatar({ sender, avatarUrl }: { sender: string; avatarUrl: string }) {
  const initial = sender.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl.trim().length > 0) {
    return (
      // alt is intentionally empty — decorative avatar; sender name is shown separately
      // biome-ignore lint/performance/noImgElement: no Next.js Image needed for mockup static asset
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        className="size-7 shrink-0 rounded-full object-cover"
        // Silently fall back to initial on broken URL
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground select-none"
      aria-hidden
    >
      {initial}
    </div>
  );
}

// ── bubble color logic ────────────────────────────────────────────────────────

function bubbleClasses(
  variant: "default" | "info" | "system",
  side: "left" | "right",
): string {
  if (variant === "info") {
    return "bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100";
  }
  if (variant === "system") {
    return "bg-muted text-muted-foreground text-center italic text-[11px]";
  }
  // default
  return side === "right"
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-foreground";
}

// ── main detail ───────────────────────────────────────────────────────────────

export const MessageBubbleDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;

  const sender = stringVal(dv.sender);
  const avatarUrl = stringVal(dv.avatar);
  const content = stringVal(dv.content);
  const timestamp = stringVal(dv.timestamp);
  const side = safeEnum(dv.side, ["left", "right"] as const, "left");
  const status = safeEnum(
    dv.status,
    ["sent", "delivered", "read"] as const,
    "sent",
  );
  const variant = safeEnum(
    dv.variant,
    ["default", "info", "system"] as const,
    "default",
  );

  // System variant renders centred regardless of `side`
  if (variant === "system") {
    return (
      <div className="flex justify-center px-2 py-1">
        <div className="max-w-[85%] rounded-lg bg-muted px-3 py-1.5 text-center">
          <p className="text-[11px] italic text-muted-foreground">
            {content || "System message"}
          </p>
          {timestamp ? (
            <p className="mt-0.5 text-[9px] text-muted-foreground/60">
              {timestamp}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const isRight = side === "right";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isRight ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar sender={sender} avatarUrl={avatarUrl} />

      <div
        className={cn(
          "flex max-w-[72%] flex-col gap-0.5",
          isRight ? "items-end" : "items-start",
        )}
      >
        {/* Sender name */}
        {sender ? (
          <p className="text-[10px] font-medium text-muted-foreground px-1">
            {sender}
          </p>
        ) : null}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2",
            isRight ? "rounded-br-sm" : "rounded-bl-sm",
            bubbleClasses(variant, side),
          )}
        >
          <p className="text-xs leading-snug whitespace-pre-wrap break-words">
            {content || (
              <span className="opacity-50 italic">empty message</span>
            )}
          </p>
        </div>

        {/* Timestamp + status */}
        {timestamp || status ? (
          <div
            className={cn(
              "flex items-center gap-1 px-1",
              isRight ? "flex-row-reverse" : "flex-row",
            )}
          >
            {timestamp ? (
              <span className="text-[9px] text-muted-foreground/60">
                {timestamp}
              </span>
            ) : null}
            {isRight ? <StatusIcon status={status} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
