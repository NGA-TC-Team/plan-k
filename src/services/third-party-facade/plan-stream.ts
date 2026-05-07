import { EventEmitter } from "node:events";
import type { IntentLogEntry } from "@/builder/types/intent";

// Single in-process EventEmitter that fans out persisted intents to any
// subscribers (typically /api/plans/[id]/stream SSE clients). One process
// per Next dev/start instance, so this is sufficient for the local-only
// model. Replace with a pubsub if the workspace ever runs multi-process.
type Listener = (entry: IntentLogEntry) => void;

class PlanStream {
  private emitter = new EventEmitter();

  constructor() {
    // Avoid the default 10-listener warning during dev hot-reload churn.
    this.emitter.setMaxListeners(0);
  }

  emit(entry: IntentLogEntry): void {
    this.emitter.emit(entry.planId, entry);
  }

  subscribe(planId: string, listener: Listener): () => void {
    this.emitter.on(planId, listener);
    return () => {
      this.emitter.off(planId, listener);
    };
  }
}

const globalKey = Symbol.for("plan-k.plan-stream");
const globalAny = globalThis as unknown as Record<symbol, PlanStream>;
if (!globalAny[globalKey]) {
  globalAny[globalKey] = new PlanStream();
}
export const planStream: PlanStream = globalAny[globalKey];
