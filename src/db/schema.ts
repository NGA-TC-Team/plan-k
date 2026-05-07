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

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
export type IntentRow = typeof intents.$inferSelect;
export type NewIntentRow = typeof intents.$inferInsert;
