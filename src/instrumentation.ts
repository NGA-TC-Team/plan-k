// Next.js calls register() once when the server boots. Use it to start
// background jobs that should outlive a single request — currently just
// the chat session TTL sweeper.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startChatSweepTimer } = await import(
    "@/services/third-party-facade/chat-sweep"
  );
  startChatSweepTimer();
}
