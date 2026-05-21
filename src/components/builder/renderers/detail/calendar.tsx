"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// ---------------------------------------------------------------------------
// Helper: safe ISO date parsing. Returns null on invalid input instead of
// throwing, so garbage inspector values never crash the canvas.
// ---------------------------------------------------------------------------
function parseIso(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject wildly out-of-range dates (year < 1 or > 9999).
  const year = d.getFullYear();
  if (year < 1 || year > 9999) return null;
  return d;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarEvent {
  title: string;
  date: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Month view — 6-week grid
// ---------------------------------------------------------------------------

function MonthView({
  anchorDate,
  events,
  showWeekends,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  showWeekends: boolean;
}) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  // First day of month, first day of the 6-week grid (Sunday of that week).
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  // Build 42 cells (6 rows × 7 cols).
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  // Build event map keyed by ISO date string.
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const parsed = parseIso(ev.date);
    if (!parsed) continue;
    const key = parsed.toISOString().slice(0, 10);
    const existing = eventMap.get(key);
    if (existing) {
      existing.push(ev);
    } else {
      eventMap.set(key, [ev]);
    }
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthLabel = firstOfMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-1 text-[10px]">
      <div className="text-xs font-semibold">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-px">
        {DOW_LABELS.map((label, di) => {
          const isWeekend = di === 0 || di === 6;
          return (
            <div
              key={label}
              className={cn(
                "text-center font-medium text-[9px] text-muted-foreground pb-0.5",
                isWeekend && !showWeekends && "opacity-30",
              )}
            >
              {label}
            </div>
          );
        })}
        {cells.map((cell, i) => {
          const isCurrentMonth = cell.getMonth() === month;
          const dow = cell.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const dateStr = cell.toISOString().slice(0, 10);
          const isToday = dateStr === todayStr;
          const cellEvents = eventMap.get(dateStr) ?? [];

          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional cell
              key={i}
              className={cn(
                "relative min-h-[22px] rounded-sm p-0.5 text-center leading-none",
                !isCurrentMonth && "opacity-30",
                isWeekend && !showWeekends && "opacity-30",
                isToday &&
                  "bg-primary/10 font-semibold ring-1 ring-primary/40 rounded",
              )}
            >
              <span
                className={cn(
                  "text-[9px]",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {cell.getDate()}
              </span>
              {/* Event dots — max 3 shown, then "+N more" abbreviated */}
              {cellEvents.length > 0 && (
                <div className="mt-0.5 flex flex-wrap justify-center gap-px">
                  {cellEvents.slice(0, 2).map((ev, ei) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable event dot
                      key={ei}
                      className="block size-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          ev.color && ev.color.trim() !== ""
                            ? ev.color
                            : "var(--primary)",
                      }}
                    />
                  ))}
                  {cellEvents.length > 2 && (
                    <span className="text-[8px] text-muted-foreground leading-none">
                      +{cellEvents.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week view — simplified 7-column layout with time column
// ---------------------------------------------------------------------------

function WeekView({ anchorDate }: { anchorDate: Date }) {
  const dow = anchorDate.getDay();
  const startOfWeek = new Date(anchorDate);
  startOfWeek.setDate(anchorDate.getDate() - dow);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const monthYear = anchorDate.toLocaleString("default", {
    month: "short",
    year: "numeric",
  });
  return (
    <div className="space-y-1 text-[10px]">
      <div className="text-xs font-semibold">Week · {monthYear}</div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((d, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable positional cell
            key={i}
            className="rounded-sm bg-muted/30 p-1 text-center min-h-[40px]"
          >
            <div className="text-[9px] font-medium text-muted-foreground">
              {DOW_LABELS[d.getDay()]}
            </div>
            <div className="text-[9px]">{d.getDate()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day view — single column time slots
// ---------------------------------------------------------------------------

const HOUR_LABELS = ["9 AM", "12 PM", "3 PM", "6 PM"];

function DayView({ anchorDate }: { anchorDate: Date }) {
  const label = anchorDate.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="space-y-1 text-[10px]">
      <div className="text-xs font-semibold">{label}</div>
      <div className="space-y-0.5">
        {HOUR_LABELS.map((h) => (
          <div key={h} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-right text-[9px] text-muted-foreground">
              {h}
            </span>
            <div className="h-5 flex-1 rounded-sm bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const CalendarDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const view = typeof dv.view === "string" ? dv.view : "month";
  const showWeekends = dv.showWeekends !== false;

  // Parse anchor date — fall back to today on invalid ISO input.
  const anchorDate = parseIso(dv.date) ?? new Date();

  // Parse events, silently skip entries with invalid dates.
  const rawEvents = Array.isArray(dv.events)
    ? (dv.events as Array<Record<string, unknown>>)
    : [];
  const events: CalendarEvent[] = rawEvents.map((ev) => ({
    title: typeof ev.title === "string" ? ev.title : "",
    date: typeof ev.date === "string" ? ev.date : "",
    color: typeof ev.color === "string" ? ev.color : "",
  }));

  if (view === "week") return <WeekView anchorDate={anchorDate} />;
  if (view === "day") return <DayView anchorDate={anchorDate} />;
  return (
    <MonthView
      anchorDate={anchorDate}
      events={events}
      showWeekends={showWeekends}
    />
  );
};
