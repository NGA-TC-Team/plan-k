import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// One row per project. v0 keeps a 1:1 project↔plan relationship — plan.id
// equals project.id — so navigating to /plan/[id] resolves both.
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["web", "mobile", "agent"] }).notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// One row per plan. `snapshot` holds the seed AppState as JSON; live state is
// reconstructed by hydrating snapshot + intents on the client.
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["web", "mobile", "agent"] }).notNull(),
  snapshot: text("snapshot").notNull(),
  // Highest `intents.serverSeq` already folded into `snapshot`. Hydration
  // fetches only entries with serverSeq > snapshotSeq. 0 means snapshot is
  // the seed and no compaction has run yet.
  snapshotSeq: integer("snapshot_seq").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// Append-only intent log per plan. `serverSeq` is monotonic per-plan for
// deterministic replay; `lamport` is the client-side clock from the entry.
export const intents = sqliteTable(
  "intents",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    serverSeq: integer("server_seq").notNull(),
    lamport: integer("lamport").notNull(),
    origin: text("origin").notNull(),
    kind: text("kind", { enum: ["primary", "inverse"] }).notNull(),
    parentEntryId: text("parent_entry_id"),
    intent: text("intent").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("intents_plan_seq_idx").on(t.planId, t.serverSeq),
    uniqueIndex("intents_plan_seq_uniq").on(t.planId, t.serverSeq),
  ],
);

// Mirror of `intents` for entries that have been folded into a plan's
// snapshot. Compaction copies rows here and deletes them from `intents`,
// so live hydration only scans the active tail. `archivedAt` records when
// the row left the active log; future prune jobs key off it.
export const intentsArchive = sqliteTable(
  "intents_archive",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    serverSeq: integer("server_seq").notNull(),
    lamport: integer("lamport").notNull(),
    origin: text("origin").notNull(),
    kind: text("kind", { enum: ["primary", "inverse"] }).notNull(),
    parentEntryId: text("parent_entry_id"),
    intent: text("intent").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("intents_archive_plan_seq_idx").on(t.planId, t.serverSeq)],
);

// Derived ref graph between entities. Source of truth is the intent log;
// rows here are recomputed from block.data text by the server-side
// syncRefsForIntent hook. `id` is `${srcId}::${kind}::${dstId}` so the
// same edge collapses to one row regardless of how many times text is
// resaved (idempotent upsert via INSERT OR IGNORE).
export const refs = sqliteTable(
  "refs",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    srcId: text("src_id").notNull(),
    dstId: text("dst_id").notNull(),
    kind: text("kind", {
      enum: ["mention", "embed", "depends-on", "trace"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("refs_plan_dst_idx").on(t.planId, t.dstId),
    index("refs_plan_src_idx").on(t.planId, t.srcId),
    uniqueIndex("refs_unique_idx").on(t.srcId, t.dstId, t.kind),
  ],
);

// ─── Chat ─────────────────────────────────────────────────────────────────
// One row per chat session. Sessions are scoped to a single plan so the
// Claude Code subprocess has a tight context window. `expiresAt` is a
// sliding 30d TTL refreshed on every new message; sweep job hard-deletes
// expired rows + on-disk uploads.
export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    mode: text("mode", { enum: ["auto", "approval"] })
      .notNull()
      .default("auto"),
    model: text("model", { enum: ["opus", "sonnet", "haiku"] })
      .notNull()
      .default("sonnet"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("chat_sessions_plan_idx").on(t.planId, t.updatedAt)],
);

// One row per turn in a chat session. assistant rows accumulate
// streamed deltas into `content`; tool rows record skill/tool calls so the
// UI timeline can show progress notes.
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system", "tool"],
    }).notNull(),
    content: text("content").notNull().default(""),
    mentions: text("mentions").notNull().default("[]"),
    attachments: text("attachments").notNull().default("[]"),
    runId: text("run_id"),
    status: text("status", {
      enum: ["pending", "streaming", "complete", "error"],
    })
      .notNull()
      .default("complete"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("chat_messages_session_idx").on(t.sessionId, t.createdAt)],
);

// One row per uploaded file attached to a chat session. Files live on disk
// at `storagePath`; the row owns their lifecycle so deleting a session
// cascades to file removal via the sweep job.
export const chatAttachments = sqliteTable(
  "chat_attachments",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["image", "doc", "video", "audio", "other"],
    }).notNull(),
    mimeType: text("mime_type").notNull(),
    originalName: text("original_name").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("chat_attachments_session_idx").on(t.sessionId)],
);

// In approval mode, the subprocess stages an IntentLogEntry instead of
// POSTing it. The user reviews + applies (forwards to /api/intents) or
// rejects (drops). `entryJson` holds the full IntentLogEntry payload.
export const chatStagedIntents = sqliteTable(
  "chat_staged_intents",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    entryJson: text("entry_json").notNull(),
    status: text("status", {
      enum: ["staged", "applied", "rejected"],
    })
      .notNull()
      .default("staged"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("chat_staged_session_idx").on(t.sessionId, t.status)],
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
export type IntentRow = typeof intents.$inferSelect;
export type NewIntentRow = typeof intents.$inferInsert;
export type IntentArchiveRow = typeof intentsArchive.$inferSelect;
export type NewIntentArchiveRow = typeof intentsArchive.$inferInsert;
export type RefRow = typeof refs.$inferSelect;
export type NewRefRow = typeof refs.$inferInsert;
export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type NewChatSessionRow = typeof chatSessions.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessageRow = typeof chatMessages.$inferInsert;
export type ChatAttachmentRow = typeof chatAttachments.$inferSelect;
export type NewChatAttachmentRow = typeof chatAttachments.$inferInsert;
export type ChatStagedIntentRow = typeof chatStagedIntents.$inferSelect;
export type NewChatStagedIntentRow = typeof chatStagedIntents.$inferInsert;
