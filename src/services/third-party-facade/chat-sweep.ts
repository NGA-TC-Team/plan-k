import { lt } from "drizzle-orm";
import { chatSessions, db } from "@/db";
import { deleteSessionDir } from "./chat-uploads";

// Hard-delete sessions whose TTL has elapsed. FK cascade clears messages,
// attachments, and staged intents in the same transaction; the on-disk
// upload directory is removed afterwards. Idempotent — safe to call on
// boot and on a recurring interval.

export async function cleanupExpiredChatSessions(): Promise<{
  removedSessions: number;
  removedDirs: number;
}> {
  const now = new Date();
  const expired = db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(lt(chatSessions.expiresAt, now))
    .all();
  if (expired.length === 0) return { removedSessions: 0, removedDirs: 0 };
  db.delete(chatSessions).where(lt(chatSessions.expiresAt, now)).run();
  let removedDirs = 0;
  for (const row of expired) {
    try {
      await deleteSessionDir(row.id);
      removedDirs += 1;
    } catch (err) {
      console.warn(`[chat-sweep] failed to remove dir for ${row.id}:`, err);
    }
  }
  return { removedSessions: expired.length, removedDirs };
}

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function startChatSweepTimer(): void {
  if (sweepTimer) return;
  void cleanupExpiredChatSessions().then((res) => {
    if (res.removedSessions > 0) {
      console.info(
        `[chat-sweep] removed ${res.removedSessions} expired sessions (${res.removedDirs} dirs)`,
      );
    }
  });
  sweepTimer = setInterval(() => {
    void cleanupExpiredChatSessions();
  }, SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();
}
