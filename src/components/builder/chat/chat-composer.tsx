"use client";

import { Paperclip, Send, X } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatApi } from "@/data/chat/api";
import { cn } from "@/lib/utils";
import { type ClaudeModel, useChatStore } from "@/services/stores";

const EMPTY_SESSIONS: never[] = [];

export function ChatComposer() {
  const sessionId = useChatStore((s) => s.currentSessionId);
  const planId = useChatStore((s) => s.planId);
  const sessions = useChatStore((s) =>
    planId ? (s.sessionsByPlanId[planId] ?? EMPTY_SESSIONS) : EMPTY_SESSIONS,
  );
  const upsertSession = useChatStore((s) => s.upsertSession);
  const composerText = useChatStore((s) => s.composerText);
  const setComposerText = useChatStore((s) => s.setComposerText);
  const pendingMentions = useChatStore((s) => s.pendingMentions);
  const removeMention = useChatStore((s) => s.removePendingMention);
  const clearMentions = useChatStore((s) => s.clearPendingMentions);
  const pendingAttachments = useChatStore((s) => s.pendingAttachments);
  const addAttachment = useChatStore((s) => s.addPendingAttachment);
  const removeAttachment = useChatStore((s) => s.removePendingAttachment);
  const clearAttachments = useChatStore((s) => s.clearPendingAttachments);
  const autoTagOnSelect = useChatStore((s) => s.autoTagOnSelect);
  const setAutoTagOnSelect = useChatStore((s) => s.setAutoTagOnSelect);
  const runState = useChatStore((s) => s.runState);
  const appendMessage = useChatStore((s) => s.appendMessage);

  const currentSession = sessions.find((x) => x.id === sessionId);
  const currentModel: ClaudeModel = currentSession?.model ?? "sonnet";

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const send = async () => {
    if (!sessionId) return;
    const content = composerText.trim();
    if (!content) return;
    if (runState !== "idle") {
      toast.message("Please wait. Assistant is still working.");
      return;
    }
    try {
      const result = await chatApi.sendMessage(sessionId, {
        content,
        mentions: pendingMentions,
        attachmentIds: pendingAttachments.map((a) => a.id),
      });
      appendMessage(result.userMessage);
      setComposerText("");
      clearMentions();
      clearAttachments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    }
  };

  const cancel = async () => {
    if (!sessionId) return;
    await chatApi.cancelRun(sessionId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 전송, Shift+Enter 줄바꿈, IME 조합 중에는 무시 (한글 입력 보호)
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault();
      void send();
      return;
    }
    if (
      e.key === "Backspace" &&
      composerText.length === 0 &&
      pendingMentions.length > 0
    ) {
      removeMention(pendingMentions[pendingMentions.length - 1].id);
    }
  };

  const handleModelChange = async (model: ClaudeModel) => {
    if (!currentSession) return;
    try {
      const updated = await chatApi.patchSession(currentSession.id, { model });
      upsertSession(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to change model");
    }
  };

  const onFileSelect = async (file: File) => {
    if (!sessionId) return;
    setUploading(true);
    try {
      const att = await chatApi.uploadFile(sessionId, file);
      addAttachment(att);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="shrink-0 border-t bg-background p-3">
      {pendingMentions.length > 0 ? (
        <div className="mb-1 flex flex-wrap gap-1">
          {pendingMentions.map((m) => (
            <span
              key={`${m.kind}:${m.id}`}
              className="inline-flex items-center gap-1 rounded-sm bg-primary/15 px-1.5 py-0.5 text-caption font-medium text-primary"
            >
              @{m.label}
              <button
                type="button"
                aria-label={`Remove mention ${m.label}`}
                onClick={() => removeMention(m.id)}
                className="opacity-60 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {pendingAttachments.length > 0 ? (
        <div className="mb-1 flex flex-wrap gap-1">
          {pendingAttachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-caption text-muted-foreground"
            >
              📎 {a.originalName}
              <button
                type="button"
                aria-label={`Remove attachment ${a.originalName}`}
                onClick={() => removeAttachment(a.id)}
                className="opacity-60 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "rounded-md border bg-background focus-within:border-ring",
          runState !== "idle" && "ring-1 ring-primary/40",
        )}
      >
        <Textarea
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            runState === "idle"
              ? "Ask Claude… (Enter to send · Shift+Enter for newline)"
              : runState === "awaiting_approval"
                ? "Awaiting your approval on staged changes…"
                : "Assistant is working…"
          }
          rows={3}
          className="min-h-0 resize-none border-0 bg-transparent text-xs focus-visible:ring-0 focus-visible:outline-0"
        />
        <div className="flex items-center justify-between gap-1 px-1.5 py-1">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFileSelect(f);
                e.currentTarget.value = "";
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              disabled={uploading || !sessionId}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="size-3.5" />
            </Button>
            <label className="flex cursor-pointer items-center gap-1 text-caption text-muted-foreground">
              <input
                type="checkbox"
                checked={autoTagOnSelect}
                onChange={(e) => setAutoTagOnSelect(e.target.checked)}
                className="size-3"
              />
              auto-tag
            </label>
            <select
              aria-label="Claude model"
              value={currentModel}
              onChange={(e) =>
                void handleModelChange(e.target.value as ClaudeModel)
              }
              disabled={!currentSession || runState !== "idle"}
              className="rounded-md border bg-background px-1.5 py-0.5 text-caption font-medium text-foreground disabled:opacity-60"
              title="Claude model"
            >
              <option value="opus">Opus</option>
              <option value="sonnet">Sonnet</option>
              <option value="haiku">Haiku</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            {runState !== "idle" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-caption"
                onClick={() => void cancel()}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              size="sm"
              className="h-6 gap-1 px-2 text-caption"
              onClick={() => void send()}
              disabled={!composerText.trim() || runState !== "idle"}
            >
              <Send className="size-3" />
              Send
              <kbd className="ml-1 rounded-sm bg-primary-foreground/20 px-1 text-caption">
                ↵
              </kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
