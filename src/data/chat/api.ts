import type {
  AttachmentRef,
  ChatMessage,
  ChatSession,
  MentionRef,
  StagedIntent,
} from "@/services/stores";
import { request } from "@/services/third-party-facade/axios";

// HTTP-only client for the chat API. SSE is handled separately by a
// dedicated hook so the data layer here stays small and TanStack-friendly.

export const chatApi = {
  listSessions(planId: string): Promise<ChatSession[]> {
    return request<ChatSession[]>({
      method: "GET",
      url: "/chat/sessions",
      params: { planId },
    });
  },
  createSession(input: {
    planId: string;
    title?: string;
    mode?: "auto" | "approval";
    model?: "opus" | "sonnet" | "haiku";
  }): Promise<ChatSession> {
    return request<ChatSession>({
      method: "POST",
      url: "/chat/sessions",
      data: input,
    });
  },
  getSession(sessionId: string): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    attachments: AttachmentRef[];
    staged: StagedIntent[];
  }> {
    return request({
      method: "GET",
      url: `/chat/sessions/${sessionId}`,
    });
  },
  patchSession(
    sessionId: string,
    patch: {
      title?: string;
      mode?: "auto" | "approval";
      model?: "opus" | "sonnet" | "haiku";
    },
  ): Promise<ChatSession> {
    return request<ChatSession>({
      method: "PATCH",
      url: `/chat/sessions/${sessionId}`,
      data: patch,
    });
  },
  deleteSession(sessionId: string): Promise<{ ok: boolean }> {
    return request({
      method: "DELETE",
      url: `/chat/sessions/${sessionId}`,
    });
  },
  sendMessage(
    sessionId: string,
    input: {
      content: string;
      mentions: MentionRef[];
      attachmentIds: string[];
    },
  ): Promise<{
    userMessage: ChatMessage;
    runId: string;
    assistantMessageId: string;
  }> {
    return request({
      method: "POST",
      url: `/chat/sessions/${sessionId}/messages`,
      data: input,
    });
  },
  cancelRun(sessionId: string): Promise<{ ok: boolean; cancelled: boolean }> {
    return request({
      method: "POST",
      url: `/chat/sessions/${sessionId}/cancel`,
    });
  },
  uploadFile(sessionId: string, file: File): Promise<AttachmentRef> {
    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("file", file);
    // Let the browser set the multipart boundary by clearing the default
    // application/json header inherited from the axios client.
    return request<AttachmentRef>({
      method: "POST",
      url: "/chat/uploads",
      data: form,
      headers: { "Content-Type": undefined as unknown as string },
    });
  },
  applyStaged(stagedId: string): Promise<{ ok: boolean }> {
    return request({
      method: "POST",
      url: `/chat/staged/${stagedId}/apply`,
    });
  },
  rejectStaged(stagedId: string): Promise<{ ok: boolean }> {
    return request({
      method: "POST",
      url: `/chat/staged/${stagedId}/reject`,
    });
  },
};
