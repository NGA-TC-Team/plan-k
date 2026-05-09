"use client";

import { useEffect } from "react";
import { chatApi } from "@/data/chat/api";
import { useChatStream } from "@/data/chat/use-chat-stream";
import { useChatStore } from "@/services/stores";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";

// Tab body for the right panel's "Chat" tab. Mounts once and persists,
// even when the user toggles back to Properties — that keeps the SSE
// connection alive so background runs continue to stream.

const EMPTY_SESSIONS: never[] = [];

export function ChatPane() {
  const planId = useChatStore((s) => s.planId);
  const sessions = useChatStore((s) =>
    planId ? (s.sessionsByPlanId[planId] ?? EMPTY_SESSIONS) : EMPTY_SESSIONS,
  );
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const setSessions = useChatStore((s) => s.setSessions);
  const upsertSession = useChatStore((s) => s.upsertSession);
  const selectSession = useChatStore((s) => s.selectSession);

  // Load sessions for this plan on first mount / plan switch.
  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await chatApi.listSessions(planId);
        if (cancelled) return;
        setSessions(planId, list);
        if (list.length > 0 && !useChatStore.getState().currentSessionId) {
          selectSession(list[0].id);
        } else if (list.length === 0) {
          // First-time experience: auto-create a session so the user has
          // something to type into.
          const created = await chatApi.createSession({ planId });
          if (cancelled) return;
          upsertSession(created);
          selectSession(created.id);
        }
      } catch (err) {
        console.error("[chat] failed to load sessions", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, setSessions, upsertSession, selectSession]);

  useChatStream(currentSessionId);

  if (!planId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No plan loaded.
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Spinning up a session…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader />
      <ChatMessageList />
      <ChatComposer />
    </div>
  );
}
