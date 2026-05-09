"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Client-side chat store. Holds the active session, message timeline,
// composer draft, pending mentions/attachments, and the run state that
// drives the canvas glow. SSE events flow in from /api/chat/sessions/.../stream
// and patch this store; user actions (send, upload, apply staged) post to
// the API and rely on the SSE channel for echo.

export type SidePanelTab = "properties" | "chat";

export type MentionKind = "block" | "section" | "screen" | "plan" | "project";

export type MentionRef = {
  kind: MentionKind;
  id: string;
  label: string;
};

export type AttachmentRef = {
  id: string;
  kind: "image" | "doc" | "video" | "audio" | "other";
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  // Set after the attachment is promoted to the media library (PR-6).
  mediaId: string | null;
};

export type ClaudeModel = "opus" | "sonnet" | "haiku";

export type ChatMessageStep =
  | { kind: "thinking"; text: string }
  | { kind: "tool_call"; callId: string; name: string; input: unknown }
  | {
      kind: "tool_result";
      callId: string;
      ok: boolean;
      summary: string;
    };

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  mentions: MentionRef[];
  attachments: AttachmentRef[];
  status: "pending" | "streaming" | "complete" | "error";
  createdAt: number;
  steps?: ChatMessageStep[];
};

export type ChatSession = {
  id: string;
  planId: string;
  title: string;
  mode: "auto" | "approval";
  model: ClaudeModel;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type StagedIntent = {
  id: string;
  messageId: string;
  sessionId: string;
  entry: unknown;
  status: "staged" | "applied" | "rejected";
  createdAt: number;
};

export type RunState = "idle" | "running" | "awaiting_approval";

type State = {
  tab: SidePanelTab;
  setTab: (t: SidePanelTab) => void;

  // current plan binding — the BuilderProvider sets this on mount
  planId: string | null;
  setPlanId: (id: string | null) => void;

  sessionsByPlanId: Record<string, ChatSession[]>;
  currentSessionId: string | null;
  messagesBySession: Record<string, ChatMessage[]>;
  stagedBySession: Record<string, StagedIntent[]>;

  composerText: string;
  pendingMentions: MentionRef[];
  pendingAttachments: AttachmentRef[];
  autoTagOnSelect: boolean;
  runState: RunState;

  // ─── setters ─────────────────────────────────────────────────────────
  setSessions: (planId: string, sessions: ChatSession[]) => void;
  upsertSession: (session: ChatSession) => void;
  removeSession: (sessionId: string) => void;
  selectSession: (sessionId: string | null) => void;

  setMessages: (sessionId: string, messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ) => void;
  appendAssistantDelta: (
    sessionId: string,
    messageId: string,
    delta: string,
  ) => void;
  appendThinkingDelta: (
    sessionId: string,
    messageId: string,
    delta: string,
  ) => void;
  appendToolCall: (
    sessionId: string,
    messageId: string,
    call: { callId: string; name: string; input: unknown },
  ) => void;
  appendToolResult: (
    sessionId: string,
    messageId: string,
    result: { callId: string; ok: boolean; summary: string },
  ) => void;

  setStaged: (sessionId: string, staged: StagedIntent[]) => void;
  upsertStaged: (sessionId: string, staged: StagedIntent) => void;
  resolveStaged: (
    sessionId: string,
    stagedId: string,
    status: "applied" | "rejected",
  ) => void;

  /**
   * After a successful promote, update the mediaId field of an attachment
   * inside any message that carries it. This avoids an SSE round-trip and
   * immediately reflects the "In library" state in the UI.
   */
  setAttachmentMediaId: (
    sessionId: string,
    attachmentId: string,
    mediaId: string,
  ) => void;

  setComposerText: (text: string) => void;
  addPendingMention: (m: MentionRef) => void;
  removePendingMention: (id: string) => void;
  clearPendingMentions: () => void;
  addPendingAttachment: (a: AttachmentRef) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  setAutoTagOnSelect: (v: boolean) => void;
  setRunState: (s: RunState) => void;
};

export const useChatStore = create<State>()(
  subscribeWithSelector((set) => ({
    tab: "properties",
    setTab: (tab) => set({ tab }),

    planId: null,
    setPlanId: (planId) => set({ planId }),

    sessionsByPlanId: {},
    currentSessionId: null,
    messagesBySession: {},
    stagedBySession: {},

    composerText: "",
    pendingMentions: [],
    pendingAttachments: [],
    autoTagOnSelect: true,
    runState: "idle",

    setSessions: (planId, sessions) =>
      set((s) => ({
        sessionsByPlanId: { ...s.sessionsByPlanId, [planId]: sessions },
      })),
    upsertSession: (session) =>
      set((s) => {
        const list = s.sessionsByPlanId[session.planId] ?? [];
        const next = [session, ...list.filter((x) => x.id !== session.id)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );
        return {
          sessionsByPlanId: { ...s.sessionsByPlanId, [session.planId]: next },
        };
      }),
    removeSession: (sessionId) =>
      set((s) => {
        const next: Record<string, ChatSession[]> = {};
        for (const [pid, list] of Object.entries(s.sessionsByPlanId)) {
          next[pid] = list.filter((x) => x.id !== sessionId);
        }
        const { [sessionId]: _drop, ...messagesBySession } =
          s.messagesBySession;
        const { [sessionId]: _drop2, ...stagedBySession } = s.stagedBySession;
        void _drop;
        void _drop2;
        return {
          sessionsByPlanId: next,
          messagesBySession,
          stagedBySession,
          currentSessionId:
            s.currentSessionId === sessionId ? null : s.currentSessionId,
        };
      }),
    selectSession: (sessionId) => set({ currentSessionId: sessionId }),

    setMessages: (sessionId, messages) =>
      set((s) => ({
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
      })),
    appendMessage: (message) =>
      set((s) => {
        const list = s.messagesBySession[message.sessionId] ?? [];
        if (list.some((m) => m.id === message.id)) return s;
        return {
          messagesBySession: {
            ...s.messagesBySession,
            [message.sessionId]: [...list, message],
          },
        };
      }),
    patchMessage: (sessionId, messageId, patch) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        return {
          messagesBySession: {
            ...s.messagesBySession,
            [sessionId]: list.map((m) =>
              m.id === messageId ? { ...m, ...patch } : m,
            ),
          },
        };
      }),
    appendAssistantDelta: (sessionId, messageId, delta) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        let found = false;
        const next = list.map((m) => {
          if (m.id !== messageId) return m;
          found = true;
          return {
            ...m,
            content: m.content + delta,
            status: "streaming" as const,
          };
        });
        if (!found) {
          next.push({
            id: messageId,
            sessionId,
            role: "assistant",
            content: delta,
            mentions: [],
            attachments: [],
            status: "streaming",
            createdAt: Date.now(),
          });
        }
        return {
          messagesBySession: { ...s.messagesBySession, [sessionId]: next },
        };
      }),

    appendThinkingDelta: (sessionId, messageId, delta) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        const next = list.map((m) => {
          if (m.id !== messageId) return m;
          const steps = m.steps ?? [];
          const last = steps[steps.length - 1];
          if (last && last.kind === "thinking") {
            return {
              ...m,
              steps: [
                ...steps.slice(0, -1),
                {
                  kind: "thinking" as const,
                  text: last.text + delta,
                },
              ],
            };
          }
          return {
            ...m,
            steps: [...steps, { kind: "thinking" as const, text: delta }],
          };
        });
        return {
          messagesBySession: { ...s.messagesBySession, [sessionId]: next },
        };
      }),

    appendToolCall: (sessionId, messageId, call) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        const next = list.map((m) => {
          if (m.id !== messageId) return m;
          const steps = m.steps ?? [];
          return {
            ...m,
            steps: [
              ...steps,
              {
                kind: "tool_call" as const,
                callId: call.callId,
                name: call.name,
                input: call.input,
              },
            ],
          };
        });
        return {
          messagesBySession: { ...s.messagesBySession, [sessionId]: next },
        };
      }),

    appendToolResult: (sessionId, messageId, result) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        const next = list.map((m) => {
          if (m.id !== messageId) return m;
          const steps = m.steps ?? [];
          return {
            ...m,
            steps: [
              ...steps,
              {
                kind: "tool_result" as const,
                callId: result.callId,
                ok: result.ok,
                summary: result.summary,
              },
            ],
          };
        });
        return {
          messagesBySession: { ...s.messagesBySession, [sessionId]: next },
        };
      }),

    setStaged: (sessionId, staged) =>
      set((s) => ({
        stagedBySession: { ...s.stagedBySession, [sessionId]: staged },
      })),
    upsertStaged: (sessionId, staged) =>
      set((s) => {
        const list = s.stagedBySession[sessionId] ?? [];
        const next = [...list.filter((x) => x.id !== staged.id), staged];
        return {
          stagedBySession: { ...s.stagedBySession, [sessionId]: next },
        };
      }),
    resolveStaged: (sessionId, stagedId, status) =>
      set((s) => {
        const list = s.stagedBySession[sessionId] ?? [];
        return {
          stagedBySession: {
            ...s.stagedBySession,
            [sessionId]: list.map((x) =>
              x.id === stagedId ? { ...x, status } : x,
            ),
          },
        };
      }),

    setAttachmentMediaId: (sessionId, attachmentId, mediaId) =>
      set((s) => {
        const list = s.messagesBySession[sessionId];
        if (!list) return s;
        return {
          messagesBySession: {
            ...s.messagesBySession,
            [sessionId]: list.map((msg) => ({
              ...msg,
              attachments: msg.attachments.map((a) =>
                a.id === attachmentId ? { ...a, mediaId } : a,
              ),
            })),
          },
        };
      }),

    setComposerText: (composerText) => set({ composerText }),
    addPendingMention: (m) =>
      set((s) =>
        s.pendingMentions.some((x) => x.id === m.id && x.kind === m.kind)
          ? s
          : { pendingMentions: [...s.pendingMentions, m] },
      ),
    removePendingMention: (id) =>
      set((s) => ({
        pendingMentions: s.pendingMentions.filter((m) => m.id !== id),
      })),
    clearPendingMentions: () => set({ pendingMentions: [] }),
    addPendingAttachment: (a) =>
      set((s) => ({ pendingAttachments: [...s.pendingAttachments, a] })),
    removePendingAttachment: (id) =>
      set((s) => ({
        pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id),
      })),
    clearPendingAttachments: () => set({ pendingAttachments: [] }),
    setAutoTagOnSelect: (autoTagOnSelect) => set({ autoTagOnSelect }),
    setRunState: (runState) => set({ runState }),
  })),
);
