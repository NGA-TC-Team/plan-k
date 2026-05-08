"use client";

import { useEffect } from "react";
import { useChatStore } from "@/services/stores";
import { chatApi } from "./api";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

// Subscribe to /api/chat/sessions/[id]/stream while a session is active.
// Patches the chat-store from server events so the UI mirrors the runner
// without polling. Builder canvas updates flow through the orthogonal
// /api/plans/[id]/stream channel — this hook only owns chat timeline state.

export function useChatStream(sessionId: string | null) {
  const appendAssistantDelta = useChatStore((s) => s.appendAssistantDelta);
  const appendThinkingDelta = useChatStore((s) => s.appendThinkingDelta);
  const appendToolCall = useChatStore((s) => s.appendToolCall);
  const appendToolResult = useChatStore((s) => s.appendToolResult);
  const patchMessage = useChatStore((s) => s.patchMessage);
  const setRunState = useChatStore((s) => s.setRunState);
  const upsertStaged = useChatStore((s) => s.upsertStaged);
  const resolveStaged = useChatStore((s) => s.resolveStaged);
  const setMessages = useChatStore((s) => s.setMessages);
  const setStaged = useChatStore((s) => s.setStaged);

  useEffect(() => {
    if (!sessionId) {
      setRunState("idle");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await chatApi.getSession(sessionId);
        if (cancelled) return;
        setMessages(sessionId, snapshot.messages);
        setStaged(sessionId, snapshot.staged);
      } catch {
        // first-load failure is non-fatal; SSE will still attach
      }
    })();

    const url = `${baseURL}/chat/sessions/${sessionId}/stream`;
    const es = new EventSource(url);

    const onDelta = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId: string;
        text: string;
      };
      appendAssistantDelta(sessionId, data.messageId, data.text);
    };
    const onThinking = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId: string;
        text: string;
      };
      appendThinkingDelta(sessionId, data.messageId, data.text);
    };
    const onToolCall = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId: string;
        callId: string;
        name: string;
        input: unknown;
      };
      appendToolCall(sessionId, data.messageId, {
        callId: data.callId,
        name: data.name,
        input: data.input,
      });
    };
    const onToolResult = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId: string;
        callId: string;
        ok: boolean;
        summary: string;
      };
      appendToolResult(sessionId, data.messageId, {
        callId: data.callId,
        ok: data.ok,
        summary: data.summary,
      });
    };
    const onComplete = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { messageId: string };
      patchMessage(sessionId, data.messageId, { status: "complete" });
    };
    const onRunState = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        state: "running" | "awaiting_approval" | "idle";
      };
      setRunState(data.state);
    };
    const onStaged = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId: string;
        stagedId: string;
        entry: unknown;
      };
      upsertStaged(sessionId, {
        id: data.stagedId,
        messageId: data.messageId,
        sessionId,
        entry: data.entry,
        status: "staged",
        createdAt: Date.now(),
      });
    };
    const onStagedResolved = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        stagedId: string;
        status: "applied" | "rejected";
      };
      resolveStaged(sessionId, data.stagedId, data.status);
    };
    const onError = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        messageId?: string;
        message: string;
      };
      if (data.messageId) {
        patchMessage(sessionId, data.messageId, { status: "error" });
      }
      setRunState("idle");
    };

    es.addEventListener("assistant_delta", onDelta);
    es.addEventListener("thinking_delta", onThinking);
    es.addEventListener("tool_call", onToolCall);
    es.addEventListener("tool_result", onToolResult);
    es.addEventListener("assistant_complete", onComplete);
    es.addEventListener("run_state", onRunState);
    es.addEventListener("staged_intent", onStaged);
    es.addEventListener("staged_resolved", onStagedResolved);
    es.addEventListener("error", onError as EventListener);

    return () => {
      cancelled = true;
      es.close();
      setRunState("idle");
    };
  }, [
    sessionId,
    appendAssistantDelta,
    appendThinkingDelta,
    appendToolCall,
    appendToolResult,
    patchMessage,
    setRunState,
    upsertStaged,
    resolveStaged,
    setMessages,
    setStaged,
  ]);
}
