import { EventEmitter } from "node:events";

// Per-chat-session pubsub. Events are streamed to /api/chat/sessions/[id]/stream
// SSE clients and to the runner's lifetime hook so multiple browser tabs viewing
// the same session see identical timelines. One process per Next instance, so
// in-process EventEmitter is enough — same shape as plan-stream.

export type ChatStreamEvent =
  | { kind: "ready"; sessionId: string }
  | { kind: "user_message"; messageId: string }
  | {
      kind: "assistant_started";
      messageId: string;
      runId: string;
    }
  | {
      kind: "assistant_delta";
      messageId: string;
      text: string;
    }
  | {
      kind: "thinking_delta";
      messageId: string;
      text: string;
    }
  | {
      kind: "assistant_complete";
      messageId: string;
    }
  | {
      kind: "tool_call";
      messageId: string;
      callId: string;
      name: string;
      input: unknown;
    }
  | {
      kind: "tool_result";
      messageId: string;
      callId: string;
      ok: boolean;
      summary: string;
    }
  | {
      kind: "intent_emitted";
      messageId: string;
      entryId: string;
      planId: string;
    }
  | {
      kind: "staged_intent";
      messageId: string;
      stagedId: string;
      entry: unknown;
    }
  | {
      kind: "staged_resolved";
      stagedId: string;
      status: "applied" | "rejected";
    }
  | {
      kind: "run_state";
      messageId: string;
      state: "running" | "awaiting_approval" | "idle";
    }
  | {
      kind: "error";
      messageId?: string;
      message: string;
    };

type Listener = (event: ChatStreamEvent) => void;

class ChatStream {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  emit(sessionId: string, event: ChatStreamEvent): void {
    this.emitter.emit(sessionId, event);
  }

  subscribe(sessionId: string, listener: Listener): () => void {
    this.emitter.on(sessionId, listener);
    return () => {
      this.emitter.off(sessionId, listener);
    };
  }
}

const globalKey = Symbol.for("plan-k.chat-stream");
const globalAny = globalThis as unknown as Record<symbol, ChatStream>;
if (!globalAny[globalKey]) {
  globalAny[globalKey] = new ChatStream();
}
export const chatStream: ChatStream = globalAny[globalKey];
