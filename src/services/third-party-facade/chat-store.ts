import { and, asc, desc, eq } from "drizzle-orm";
import {
  type ChatAttachmentRow,
  type ChatMessageRow,
  type ChatSessionRow,
  type ChatStagedIntentRow,
  chatAttachments,
  chatMessages,
  chatSessions,
  chatStagedIntents,
  db,
  plans,
} from "@/db";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ADHOC_TTL_MS = 24 * 60 * 60 * 1000;

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageStatus = "pending" | "streaming" | "complete" | "error";
export type SessionMode = "auto" | "approval";
export type ClaudeModel = "opus" | "sonnet" | "haiku";

export type MentionRef = {
  kind: "block" | "section" | "screen" | "plan" | "project";
  id: string;
  label: string;
};

export type AttachmentRef = {
  id: string;
  kind: ChatAttachmentRow["kind"];
  mimeType: string;
  originalName: string;
  sizeBytes: number;
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function nextExpiry(): Date {
  return new Date(Date.now() + TTL_MS);
}

function rowToSession(row: ChatSessionRow) {
  return {
    id: row.id,
    planId: row.planId,
    title: row.title,
    mode: row.mode,
    model: row.model,
    hidden: row.hidden,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

function rowToMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    content: row.content,
    mentions: JSON.parse(row.mentions) as MentionRef[],
    attachments: JSON.parse(row.attachments) as AttachmentRef[],
    runId: row.runId ?? null,
    status: row.status,
    createdAt: row.createdAt.getTime(),
  };
}

function rowToAttachment(row: ChatAttachmentRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: row.kind,
    mimeType: row.mimeType,
    originalName: row.originalName,
    storagePath: row.storagePath,
    sizeBytes: row.sizeBytes,
    // null when not yet promoted to the media library (PR-6).
    mediaId: row.mediaId ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

function rowToStaged(row: ChatStagedIntentRow) {
  return {
    id: row.id,
    messageId: row.messageId,
    sessionId: row.sessionId,
    entry: JSON.parse(row.entryJson) as unknown,
    status: row.status,
    createdAt: row.createdAt.getTime(),
  };
}

export type ChatSession = ReturnType<typeof rowToSession>;
export type ChatMessage = ReturnType<typeof rowToMessage>;
export type ChatAttachment = ReturnType<typeof rowToAttachment>;
export type ChatStagedIntent = ReturnType<typeof rowToStaged>;

// ─── Sessions ────────────────────────────────────────────────────────────

export function listSessionsForPlan(
  planId: string,
  opts: { includeHidden?: boolean } = {},
): ChatSession[] {
  const filter = opts.includeHidden
    ? eq(chatSessions.planId, planId)
    : and(eq(chatSessions.planId, planId), eq(chatSessions.hidden, false));
  const rows = db
    .select()
    .from(chatSessions)
    .where(filter)
    .orderBy(desc(chatSessions.updatedAt))
    .all();
  return rows.map(rowToSession);
}

export function createSession(opts: {
  planId: string;
  title?: string;
  mode?: SessionMode;
  model?: ClaudeModel;
}): ChatSession | null {
  const planRow = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, opts.planId))
    .get();
  if (!planRow) return null;
  const now = new Date();
  const id = newId("cs");
  db.insert(chatSessions)
    .values({
      id,
      planId: opts.planId,
      title: opts.title ?? "New chat",
      mode: opts.mode ?? "auto",
      model: opts.model ?? "sonnet",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + TTL_MS),
    })
    .run();
  const row = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .get();
  return row ? rowToSession(row) : null;
}

// Inline AI actions create one of these per invocation. Hidden from
// the chat sidebar, ttl is shorter so the sweep job clears them
// quickly, and mode is forced to approval so every result lands in
// the staging strip rather than auto-applying behind the user's back.
export function createAdhocSession(opts: {
  planId: string;
  label: string;
  model?: ClaudeModel;
}): ChatSession | null {
  const planRow = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, opts.planId))
    .get();
  if (!planRow) return null;
  const now = new Date();
  const id = newId("cs");
  db.insert(chatSessions)
    .values({
      id,
      planId: opts.planId,
      title: opts.label.slice(0, 80),
      mode: "approval",
      model: opts.model ?? "sonnet",
      hidden: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + ADHOC_TTL_MS),
    })
    .run();
  const row = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .get();
  return row ? rowToSession(row) : null;
}

export function getSession(sessionId: string): ChatSession | null {
  const row = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .get();
  return row ? rowToSession(row) : null;
}

export function updateSession(
  sessionId: string,
  patch: { title?: string; mode?: SessionMode; model?: ClaudeModel },
): ChatSession | null {
  const updates: Partial<ChatSessionRow> = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.mode !== undefined) updates.mode = patch.mode;
  if (patch.model !== undefined) updates.model = patch.model;
  db.update(chatSessions)
    .set(updates)
    .where(eq(chatSessions.id, sessionId))
    .run();
  return getSession(sessionId);
}

export function touchSession(sessionId: string): void {
  db.update(chatSessions)
    .set({ updatedAt: new Date(), expiresAt: nextExpiry() })
    .where(eq(chatSessions.id, sessionId))
    .run();
}

export function deleteSession(sessionId: string): { attachments: string[] } {
  const atts = db
    .select()
    .from(chatAttachments)
    .where(eq(chatAttachments.sessionId, sessionId))
    .all();
  db.delete(chatSessions).where(eq(chatSessions.id, sessionId)).run();
  return { attachments: atts.map((a) => a.storagePath) };
}

// ─── Messages ────────────────────────────────────────────────────────────

export function listMessages(sessionId: string): ChatMessage[] {
  const rows = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
    .all();
  return rows.map(rowToMessage);
}

export function appendMessage(opts: {
  sessionId: string;
  role: MessageRole;
  content: string;
  mentions?: MentionRef[];
  attachments?: AttachmentRef[];
  runId?: string;
  status?: MessageStatus;
}): ChatMessage {
  const id = newId(opts.role === "user" ? "um" : "am");
  db.insert(chatMessages)
    .values({
      id,
      sessionId: opts.sessionId,
      role: opts.role,
      content: opts.content,
      mentions: JSON.stringify(opts.mentions ?? []),
      attachments: JSON.stringify(opts.attachments ?? []),
      runId: opts.runId ?? null,
      status: opts.status ?? "complete",
    })
    .run();
  touchSession(opts.sessionId);
  const row = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .get();
  if (!row) throw new Error("appendMessage: row missing after insert");
  return rowToMessage(row);
}

export function patchMessage(
  messageId: string,
  patch: { content?: string; status?: MessageStatus },
): ChatMessage | null {
  const updates: Partial<ChatMessageRow> = {};
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.status !== undefined) updates.status = patch.status;
  if (Object.keys(updates).length === 0) return null;
  db.update(chatMessages)
    .set(updates)
    .where(eq(chatMessages.id, messageId))
    .run();
  const row = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .get();
  return row ? rowToMessage(row) : null;
}

export function appendAssistantText(messageId: string, delta: string): void {
  const row = db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .get();
  if (!row) return;
  db.update(chatMessages)
    .set({ content: row.content + delta, status: "streaming" })
    .where(eq(chatMessages.id, messageId))
    .run();
}

// ─── Attachments ─────────────────────────────────────────────────────────

export function recordAttachment(opts: {
  sessionId: string;
  kind: ChatAttachmentRow["kind"];
  mimeType: string;
  originalName: string;
  storagePath: string;
  sizeBytes: number;
}): ChatAttachment {
  const id = newId("ca");
  db.insert(chatAttachments)
    .values({ id, ...opts })
    .run();
  touchSession(opts.sessionId);
  const row = db
    .select()
    .from(chatAttachments)
    .where(eq(chatAttachments.id, id))
    .get();
  if (!row) throw new Error("recordAttachment: row missing after insert");
  return rowToAttachment(row);
}

export function listAttachments(sessionId: string): ChatAttachment[] {
  return db
    .select()
    .from(chatAttachments)
    .where(eq(chatAttachments.sessionId, sessionId))
    .all()
    .map(rowToAttachment);
}

export function getAttachment(id: string): ChatAttachment | null {
  const row = db
    .select()
    .from(chatAttachments)
    .where(eq(chatAttachments.id, id))
    .get();
  return row ? rowToAttachment(row) : null;
}

/**
 * Back-pointer update: set mediaId on a chat attachment after promotion (PR-6).
 * Passing null clears the back-pointer (used to recover from a race condition
 * where media was deleted before the back-pointer was written).
 */
export function setAttachmentMediaId(
  id: string,
  mediaId: string | null,
): ChatAttachment | null {
  db.update(chatAttachments)
    .set({ mediaId })
    .where(eq(chatAttachments.id, id))
    .run();
  return getAttachment(id);
}

// ─── Staged intents ─────────────────────────────────────────────────────

export function stageIntent(opts: {
  sessionId: string;
  messageId: string;
  entry: unknown;
}): ChatStagedIntent {
  const id = newId("st");
  db.insert(chatStagedIntents)
    .values({
      id,
      sessionId: opts.sessionId,
      messageId: opts.messageId,
      entryJson: JSON.stringify(opts.entry),
    })
    .run();
  const row = db
    .select()
    .from(chatStagedIntents)
    .where(eq(chatStagedIntents.id, id))
    .get();
  if (!row) throw new Error("stageIntent: row missing after insert");
  return rowToStaged(row);
}

export function listStaged(
  sessionId: string,
  status?: "staged" | "applied" | "rejected",
): ChatStagedIntent[] {
  const where = status
    ? and(
        eq(chatStagedIntents.sessionId, sessionId),
        eq(chatStagedIntents.status, status),
      )
    : eq(chatStagedIntents.sessionId, sessionId);
  return db
    .select()
    .from(chatStagedIntents)
    .where(where)
    .orderBy(asc(chatStagedIntents.createdAt))
    .all()
    .map(rowToStaged);
}

export function getStaged(id: string): ChatStagedIntent | null {
  const row = db
    .select()
    .from(chatStagedIntents)
    .where(eq(chatStagedIntents.id, id))
    .get();
  return row ? rowToStaged(row) : null;
}

export function markStaged(
  id: string,
  status: "applied" | "rejected",
): ChatStagedIntent | null {
  db.update(chatStagedIntents)
    .set({ status })
    .where(eq(chatStagedIntents.id, id))
    .run();
  return getStaged(id);
}
