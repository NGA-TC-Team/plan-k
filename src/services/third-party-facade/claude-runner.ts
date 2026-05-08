import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import {
  type AttachmentRef,
  appendAssistantText,
  appendMessage,
  type ChatMessage,
  type MentionRef,
  patchMessage,
  touchSession,
} from "./chat-store";
import { type ChatStreamEvent, chatStream } from "./chat-stream";

// One subprocess per AI turn. The user explicitly wants `claude` CLI as the
// engine, so we spawn it in non-interactive print mode with stream-json
// output and parse events into ChatStreamEvent. CWD is the repo root so
// project skills (.claude/skills/plan-k-*) resolve.

export type RunRequest = {
  planId: string;
  sessionId: string;
  userMessage: string;
  mentions: MentionRef[];
  attachments: AttachmentRef[];
  mode: "auto" | "approval";
  model: "opus" | "sonnet" | "haiku";
  history: ChatMessage[];
};

export type RunHandle = {
  runId: string;
  assistantMessageId: string;
  cancel: () => void;
};

const ALLOWED_TOOLS_AUTO = [
  "Read",
  "Glob",
  "Grep",
  "Bash(curl:*)",
  "Bash(jq:*)",
  // skills are surfaced as tools too
  "Skill",
].join(",");

const ALLOWED_TOOLS_APPROVAL = [
  "Read",
  "Glob",
  "Grep",
  "Bash(curl:*)",
  "Bash(jq:*)",
  "Skill",
].join(",");

const activeRuns = new Map<string, ChildProcess>();

export function getActiveRunForSession(sessionId: string): ChildProcess | null {
  return activeRuns.get(sessionId) ?? null;
}

export function cancelActiveRun(sessionId: string): boolean {
  const proc = activeRuns.get(sessionId);
  if (!proc) return false;
  try {
    proc.kill();
  } catch {
    // already dead
  }
  activeRuns.delete(sessionId);
  return true;
}

function buildSystemPrompt(req: RunRequest): string {
  const mentionLines =
    req.mentions.length === 0
      ? "(none)"
      : req.mentions
          .map(
            (m) =>
              `- ${m.kind}:${m.id}  "${m.label}"  (resolve via plan-k-chat.resolve_mentions if you need full snapshot)`,
          )
          .join("\n");
  const attachmentLines =
    req.attachments.length === 0
      ? "(none)"
      : req.attachments
          .map(
            (a) =>
              `- ${a.kind}  ${a.mimeType}  ${a.originalName}  → /api/chat/uploads/${req.sessionId}/${a.id} (use Read tool with the absolute path printed via plan-k-chat.get_session)`,
          )
          .join("\n");

  const historyLines = req.history
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 600)}`)
    .join("\n");

  const baseUrl =
    process.env.PLAN_K_INTERNAL_BASE_URL ?? "http://localhost:3000";

  const modeBlock =
    req.mode === "approval"
      ? `## Mutation policy: APPROVAL
You are running in APPROVAL mode. **Never** POST IntentLogEntry to /api/intents directly.
Instead, for every mutation you would normally append, POST the same IntentLogEntry to:
  ${baseUrl}/api/chat/sessions/${req.sessionId}/staging?messageId=${"<runtime>"}
The endpoint stages it; the human will apply/reject in the UI. Use the messageId echoed at run start (printed below).`
      : `## Mutation policy: AUTO
POST IntentLogEntry to ${baseUrl}/api/intents as the skills describe — changes apply immediately and stream to the canvas.`;

  return [
    "You are the in-app assistant for plan-k, a local-only planning workspace.",
    `Working directory: ${process.cwd()}`,
    `Active plan: ${req.planId}`,
    `Active chat session: ${req.sessionId}`,
    "",
    "## Available skills",
    "- plan-k-plan       — read the current snapshot of a plan",
    "- plan-k-section    — insert/update/move/delete sections",
    "- plan-k-block      — insert/update/move/delete blocks (docs/app/agent)",
    "- plan-k-project    — create/delete projects",
    "- plan-k-search     — keyword search across plans",
    "- plan-k-export     — export plan to PDF/PNG",
    "- plan-k-chat       — resolve @mentions, stage intents, log progress notes",
    "",
    "Always call plan-k-plan before any mutation skill so lamport is fresh.",
    "",
    modeBlock,
    "",
    "## Tagged context (from user mentions and current selection)",
    mentionLines,
    "",
    "## Attachments",
    attachmentLines,
    "",
    "## Recent transcript",
    historyLines || "(empty)",
    "",
    "## Current user message",
    req.userMessage,
    "",
    "Respond concisely. When you finish work, summarize what changed in 1–3 lines.",
  ].join("\n");
}

// Parse one stream-json line emitted by `claude --output-format stream-json`.
// The CLI emits objects with shape:
//   {"type":"system",...}
//   {"type":"assistant","message":{"content":[{"type":"text","text":"..."}, {"type":"tool_use", ...}]}}
//   {"type":"user","message":{"content":[{"type":"tool_result", ...}]}}
//   {"type":"result","subtype":"success","result":"...",...}
type ParsedEvent =
  | { kind: "text_delta"; text: string }
  | { kind: "thinking_delta"; text: string }
  | { kind: "tool_use"; id: string; name: string; input: unknown }
  | {
      kind: "tool_result";
      tool_use_id: string;
      ok: boolean;
      content: string;
    }
  | { kind: "final_text"; text: string }
  | { kind: "error"; message: string }
  | null;

function parseLine(line: string): ParsedEvent[] {
  if (!line.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [];
  }
  const events: ParsedEvent[] = [];
  const obj = parsed as { type?: string; [k: string]: unknown };
  if (obj.type === "assistant") {
    const message = obj.message as
      | { content?: Array<{ type?: string; [k: string]: unknown }> }
      | undefined;
    for (const part of message?.content ?? []) {
      if (part.type === "text" && typeof part.text === "string") {
        events.push({ kind: "text_delta", text: part.text });
      } else if (
        part.type === "thinking" &&
        typeof part.thinking === "string"
      ) {
        events.push({ kind: "thinking_delta", text: part.thinking });
      } else if (part.type === "tool_use") {
        events.push({
          kind: "tool_use",
          id: String(part.id ?? ""),
          name: String(part.name ?? ""),
          input: part.input ?? {},
        });
      }
    }
  } else if (obj.type === "user") {
    const message = obj.message as
      | { content?: Array<{ type?: string; [k: string]: unknown }> }
      | undefined;
    for (const part of message?.content ?? []) {
      if (part.type === "tool_result") {
        const content = Array.isArray(part.content)
          ? part.content
              .map((c) =>
                typeof c === "object" && c && "text" in c
                  ? String((c as { text: unknown }).text)
                  : "",
              )
              .join("")
          : String(part.content ?? "");
        events.push({
          kind: "tool_result",
          tool_use_id: String(part.tool_use_id ?? ""),
          ok: !part.is_error,
          content: content.slice(0, 500),
        });
      }
    }
  } else if (obj.type === "result") {
    if (typeof obj.result === "string") {
      events.push({ kind: "final_text", text: obj.result });
    }
    if (obj.is_error) {
      events.push({
        kind: "error",
        message: typeof obj.error === "string" ? obj.error : "claude error",
      });
    }
  }
  return events;
}

export async function startChatRun(req: RunRequest): Promise<RunHandle> {
  const runId = `run_${crypto.randomUUID().replace(/-/g, "")}`;

  // Persist the placeholder assistant message so deltas have a row to write.
  const assistantMessage = appendMessage({
    sessionId: req.sessionId,
    role: "assistant",
    content: "",
    runId,
    status: "pending",
  });

  const emit = (event: ChatStreamEvent) =>
    chatStream.emit(req.sessionId, event);

  emit({
    kind: "assistant_started",
    messageId: assistantMessage.id,
    runId,
  });
  emit({
    kind: "run_state",
    messageId: assistantMessage.id,
    state: req.mode === "approval" ? "awaiting_approval" : "running",
  });

  const prompt = buildSystemPrompt(req).replace(
    "<runtime>",
    assistantMessage.id,
  );

  const allowedTools =
    req.mode === "approval" ? ALLOWED_TOOLS_APPROVAL : ALLOWED_TOOLS_AUTO;

  const env = {
    ...process.env,
    PLAN_K_RUN_ID: runId,
    PLAN_K_SESSION_ID: req.sessionId,
    PLAN_K_PLAN_ID: req.planId,
    PLAN_K_MESSAGE_ID: assistantMessage.id,
    PLAN_K_APPROVAL_MODE: req.mode === "approval" ? "1" : "0",
    PLAN_K_INTERNAL_BASE_URL:
      process.env.PLAN_K_INTERNAL_BASE_URL ?? "http://localhost:3000",
  };

  const claudeBin = process.env.CLAUDE_CLI_BIN ?? "claude";

  const proc = spawn(
    claudeBin,
    [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--allowedTools",
      allowedTools,
      "--model",
      req.model,
    ],
    {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  activeRuns.set(req.sessionId, proc);

  // Read stdout line-by-line.
  let buffer = "";
  let accumulated = "";
  proc.stdout?.setEncoding("utf8");
  proc.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    let nl = buffer.indexOf("\n");
    while (nl !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      for (const ev of parseLine(line)) {
        if (!ev) continue;
        if (ev.kind === "text_delta") {
          accumulated += ev.text;
          appendAssistantText(assistantMessage.id, ev.text);
          emit({
            kind: "assistant_delta",
            messageId: assistantMessage.id,
            text: ev.text,
          });
        } else if (ev.kind === "thinking_delta") {
          emit({
            kind: "thinking_delta",
            messageId: assistantMessage.id,
            text: ev.text,
          });
        } else if (ev.kind === "tool_use") {
          emit({
            kind: "tool_call",
            messageId: assistantMessage.id,
            callId: ev.id,
            name: ev.name,
            input: ev.input,
          });
        } else if (ev.kind === "tool_result") {
          emit({
            kind: "tool_result",
            messageId: assistantMessage.id,
            callId: ev.tool_use_id,
            ok: ev.ok,
            summary: ev.content,
          });
        } else if (ev.kind === "final_text") {
          if (!accumulated && ev.text) {
            accumulated = ev.text;
            appendAssistantText(assistantMessage.id, ev.text);
            emit({
              kind: "assistant_delta",
              messageId: assistantMessage.id,
              text: ev.text,
            });
          }
        } else if (ev.kind === "error") {
          emit({
            kind: "error",
            messageId: assistantMessage.id,
            message: ev.message,
          });
        }
      }
      nl = buffer.indexOf("\n");
    }
  });

  const finish = () => {
    activeRuns.delete(req.sessionId);
    patchMessage(assistantMessage.id, {
      status: accumulated ? "complete" : "error",
    });
    touchSession(req.sessionId);
    emit({ kind: "assistant_complete", messageId: assistantMessage.id });
    emit({
      kind: "run_state",
      messageId: assistantMessage.id,
      state: "idle",
    });
  };
  proc.on("close", finish);
  proc.on("error", (err) => {
    emit({
      kind: "error",
      messageId: assistantMessage.id,
      message: err instanceof Error ? err.message : String(err),
    });
    finish();
  });

  proc.stderr?.setEncoding("utf8");
  proc.stderr?.on("data", (text: string) => {
    if (text.trim()) console.error(`[claude-runner ${runId}]`, text.trim());
  });

  return {
    runId,
    assistantMessageId: assistantMessage.id,
    cancel: () => cancelActiveRun(req.sessionId),
  };
}

// Resolve absolute storage path for an attachment id — used by plan-k-chat
// skill (`get_session`) so Claude's Read tool can open uploaded files.
export function attachmentAbsolutePath(
  sessionId: string,
  attachmentStoredName: string,
): string {
  return path.join(
    process.cwd(),
    "local-uploads",
    sessionId,
    attachmentStoredName,
  );
}
