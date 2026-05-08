// Lightweight relative time formatter for chat timestamps.
// Returns Korean labels — matches the rest of the UI.

const RTF = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatRelativeTime(
  timestamp: number,
  now = Date.now(),
): string {
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  if (abs < 30_000) return "방금";
  for (const { unit, ms } of UNITS) {
    if (abs >= ms) {
      return RTF.format(Math.round(diff / ms), unit);
    }
  }
  return RTF.format(Math.round(diff / 1000), "second");
}

export function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
