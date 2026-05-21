"use client";

import { Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// ── type helpers ─────────────────────────────────────────────────────────────

function stringVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface Suggestion {
  label: string;
}

function safeRole(v: unknown): "user" | "assistant" | "system" {
  if (v === "user" || v === "assistant" || v === "system") return v;
  return "user";
}

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      role: safeRole(item.role),
      content: stringVal(item.content),
      timestamp: stringVal(item.timestamp),
    }));
}

function parseSuggestions(raw: unknown): Suggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({ label: stringVal(item.label) }))
    .filter((s) => s.label.length > 0);
}

// ── sub-components ────────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] space-y-0.5">
        <div className="rounded-2xl rounded-br-sm bg-primary px-3 py-2">
          <p className="text-xs text-primary-foreground leading-snug">
            {msg.content || <span className="opacity-50 italic">empty</span>}
          </p>
        </div>
        {msg.timestamp ? (
          <p className="text-right text-[9px] text-muted-foreground pr-1">
            {msg.timestamp}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AssistantBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex items-end gap-1.5">
      {/* bot avatar */}
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="size-3 text-muted-foreground" aria-hidden />
      </div>
      <div className="max-w-[75%] space-y-0.5">
        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
          <p className="text-xs leading-snug">
            {msg.content || <span className="opacity-50 italic">empty</span>}
          </p>
        </div>
        {msg.timestamp ? (
          <p className="text-[9px] text-muted-foreground pl-1">
            {msg.timestamp}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-center">
      <p className="text-[10px] italic text-muted-foreground/70 text-center max-w-[80%]">
        {msg.content || "System message"}
        {msg.timestamp ? (
          <span className="ml-1 not-italic opacity-60">{msg.timestamp}</span>
        ) : null}
      </p>
    </div>
  );
}

// ── main detail ───────────────────────────────────────────────────────────────

export const AiChatDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const title = stringVal(dv.title);
  const placeholder = stringVal(dv.placeholder) || "Type a message…";
  const modelLabel = stringVal(dv.modelLabel);
  const messages = parseMessages(dv.messages);
  const suggestions = parseSuggestions(dv.suggestions);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background overflow-hidden text-sm">
      {/* Header — only shown when title or modelLabel is set */}
      {title || modelLabel ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 bg-muted/40">
          {title ? (
            <span className="text-xs font-semibold truncate">{title}</span>
          ) : (
            <span />
          )}
          {modelLabel ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {modelLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Message list */}
      <div className="flex flex-col gap-2.5 p-3 min-h-[80px]">
        {messages.length === 0 ? (
          <p className="text-center text-xs italic text-muted-foreground/60 py-4">
            대화를 시작하세요
          </p>
        ) : (
          messages.map((msg, i) => {
            if (msg.role === "system") {
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key for mockup
              return <SystemMessage key={i} msg={msg} />;
            }
            if (msg.role === "assistant") {
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key for mockup
              return <AssistantBubble key={i} msg={msg} />;
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key for mockup
            return <UserBubble key={i} msg={msg} />;
          })
        )}
      </div>

      {/* Suggestions row — shown above input when present */}
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-3 pb-1.5">
          {suggestions.map((s, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key for mockup
              key={i}
              className={cn(
                "rounded-full border border-border px-2 py-0.5 text-[10px]",
                "bg-background hover:bg-muted cursor-default transition-colors",
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      ) : null}

      {/* Fake input row */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 bg-muted/20">
        <div className="flex-1 rounded-full border border-border bg-background px-3 py-1.5">
          <p className="text-[11px] text-muted-foreground/60 select-none">
            {placeholder}
          </p>
        </div>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Send className="size-3.5 text-primary" aria-hidden />
        </div>
      </div>
    </div>
  );
};
