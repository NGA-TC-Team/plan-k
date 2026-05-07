import type { IntentLogEntry } from "@/builder/types/intent";
import { planStream } from "@/services/third-party-facade/plan-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await ctx.params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Initial comment + ready event flushes headers and lets the client
      // know the channel is open before any intent arrives.
      controller.enqueue(encoder.encode(": ok\n\n"));
      send("ready", { planId });

      const unsubscribe = planStream.subscribe(
        planId,
        (entry: IntentLogEntry) => {
          send("intent", entry);
        },
      );

      // Lightweight keepalive so intermediaries / browsers do not close
      // an idle connection. SSE comments are ignored by EventSource.
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25_000);

      const onAbort = () => {
        clearInterval(keepalive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort, { once: true });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
