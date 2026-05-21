import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const ProjectKindSchema = z.enum(["web", "mobile", "agent"]);
export const ChatModeSchema = z.enum(["auto", "approval"]);
export const ClaudeModelSchema = z.enum(["opus", "sonnet", "haiku"]);

// ─── IntentLogEntry (loose shape — reducer owns the strict constraints) ───────

/**
 * Intent body is validated only at the envelope level; the `intent` object
 * itself is passed through untouched. The downstream reducer (appendIntent)
 * performs the authoritative deep validation.
 */
export const IntentLogEntrySchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  origin: z.string().min(1),
  lamport: z.number().int().nonnegative(),
  intent: z.object({ type: z.string().min(1) }).passthrough(),
  createdAt: z.number().int(),
  parentEntryId: z.string().min(1).optional(),
  kind: z.enum(["primary", "inverse"]),
});

// ─── Primitive helpers ────────────────────────────────────────────────────────

/** Non-empty string after trimming. Rejects blank / whitespace-only values. */
export const NonEmptyIdSchema = z.string().trim().min(1);

/** 0 or positive integer. Coerces string → number (useful for query params). */
export const NonNegIntSchema = z.coerce.number().int().nonnegative();

/**
 * Query-string boolean: "true" → true, "false" → false, absent → undefined.
 * Use z.coerce.boolean() only works for "true"/"1" etc.; this variant is
 * explicit and survives both truthy strings.
 */
export const BoolStringSchema = z
  .union([z.literal("true"), z.literal("false")])
  .transform((v) => v === "true")
  .optional();
