"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  PropertyColor,
  PropertyEntry,
  PropertySelectOption,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  entry: PropertyEntry;
  onChange: (next: PropertyEntry) => void;
};

/**
 * Renders a type-appropriate value editor for a single PropertyEntry.
 * - text   → plain Input
 * - number → Input[type=number]; empty string is stored as null
 * - date   → Popover + Calendar; value is ISO date string or null
 * - select → native <select> + inline option management
 */
export function PropertyValueEditor({ entry, onChange }: Props) {
  switch (entry.type) {
    case "text":
      return (
        <Input
          value={typeof entry.value === "string" ? entry.value : ""}
          onChange={(e) => onChange({ ...entry, value: e.target.value })}
          className="h-7 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          placeholder="값 입력"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          // Show empty string when value is null; otherwise show numeric value.
          value={entry.value === null ? "" : String(entry.value)}
          onChange={(e) => {
            const raw = e.target.value;
            // Empty string → null; otherwise parse as number.
            const next: number | null =
              raw === "" ? null : Number.parseFloat(raw);
            // Guard: NaN from malformed input defaults to null.
            onChange({ ...entry, value: Number.isNaN(next) ? null : next });
          }}
          className="h-7 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          placeholder="숫자 입력"
        />
      );

    case "date":
      return <DateValueEditor entry={entry} onChange={onChange} />;

    case "select":
      return <SelectValueEditor entry={entry} onChange={onChange} />;
  }
}

// ── Date sub-component ────────────────────────────────────────────────────────

function DateValueEditor({ entry, onChange }: Props) {
  const dateValue =
    typeof entry.value === "string" && entry.value
      ? new Date(entry.value)
      : undefined;

  const label = dateValue
    ? dateValue.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "날짜 선택";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 justify-start px-1 text-sm font-normal"
          >
            {label}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" side="bottom" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(day) => {
            // day is Date | undefined from react-day-picker's single mode.
            onChange({
              ...entry,
              value: day ? (day.toISOString().split("T")[0] ?? null) : null,
            });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Select sub-component ──────────────────────────────────────────────────────

const COLOR_CLASSES: Record<PropertyColor, string> = {
  default: "bg-muted text-foreground/80",
  gray: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200",
  red: "bg-red-200 text-red-900 dark:bg-red-950/60 dark:text-red-200",
  orange:
    "bg-orange-200 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200",
  yellow:
    "bg-yellow-200 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200",
  green: "bg-green-200 text-green-900 dark:bg-green-950/60 dark:text-green-200",
  blue: "bg-blue-200 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200",
  purple:
    "bg-purple-200 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200",
  pink: "bg-pink-200 text-pink-900 dark:bg-pink-950/60 dark:text-pink-200",
};

const COLOR_SWATCH: Record<PropertyColor, string> = {
  default: "bg-muted",
  gray: "bg-zinc-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
};

const COLOR_LABELS: Record<PropertyColor, string> = {
  default: "기본",
  gray: "회색",
  red: "빨강",
  orange: "주황",
  yellow: "노랑",
  green: "초록",
  blue: "파랑",
  purple: "보라",
  pink: "분홍",
};

const COLOR_ORDER: PropertyColor[] = [
  "default",
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];

function nextColor(options: PropertySelectOption[]): PropertyColor {
  // Cycle through palette skipping "default" for fresh options.
  const palette = COLOR_ORDER.filter((c) => c !== "default");
  const color = palette[options.length % palette.length];
  return color ?? "gray";
}

function normalizeOptions(raw: unknown): PropertySelectOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o): PropertySelectOption[] => {
    if (typeof o === "string") {
      return [{ id: o, name: o, color: "default" }];
    }
    if (o && typeof o === "object" && "name" in o) {
      const obj = o as Partial<PropertySelectOption>;
      return [
        {
          id: obj.id ?? crypto.randomUUID(),
          name: String(obj.name ?? ""),
          color: obj.color ?? "default",
        },
      ];
    }
    return [];
  });
}

function normalizeSelectedIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  if (typeof raw === "string" && raw !== "") return [raw];
  return [];
}

function SelectValueEditor({ entry, onChange }: Props) {
  const options = useMemo(
    () => normalizeOptions(entry.options),
    [entry.options],
  );
  const selectedIds = useMemo(
    () => normalizeSelectedIds(entry.value),
    [entry.value],
  );
  const [query, setQuery] = useState("");

  const selectedOptions = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is PropertySelectOption => Boolean(o));

  const filtered = query.trim()
    ? options.filter((o) =>
        o.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  const hasExactMatch = options.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const writeOptions = (nextOptions: PropertySelectOption[]) =>
    onChange({ ...entry, options: nextOptions });
  const writeSelected = (nextIds: string[]) =>
    onChange({ ...entry, value: nextIds });

  const toggleSelected = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    writeSelected(next);
  };

  const createOption = () => {
    const trimmed = query.trim();
    if (!trimmed || hasExactMatch) return;
    const newOption: PropertySelectOption = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: nextColor(options),
    };
    onChange({
      ...entry,
      options: [...options, newOption],
      value: [...selectedIds, newOption.id],
    });
    setQuery("");
  };

  const setOptionColor = (optionId: string, color: PropertyColor) => {
    writeOptions(options.map((o) => (o.id === optionId ? { ...o, color } : o)));
  };

  const removeOption = (optionId: string) => {
    onChange({
      ...entry,
      options: options.filter((o) => o.id !== optionId),
      value: selectedIds.filter((id) => id !== optionId),
    });
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded px-1 text-left text-sm transition-colors hover:bg-accent"
          >
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground/60">비어 있음</span>
            ) : (
              <span className="flex flex-wrap items-center gap-1">
                {selectedOptions.map((opt) => (
                  <SelectBadge key={opt.id} option={opt} />
                ))}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent className="w-64 p-2" side="bottom" align="start">
        <div className="flex flex-col gap-2">
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 rounded border border-border/60 px-1.5 py-1">
              {selectedOptions.map((opt) => (
                <span
                  key={opt.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                    COLOR_CLASSES[opt.color],
                  )}
                >
                  {opt.name}
                  <button
                    type="button"
                    onClick={() => toggleSelected(opt.id)}
                    aria-label={`${opt.name} 선택 해제`}
                    className="rounded-sm opacity-60 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!hasExactMatch && query.trim()) {
                  createOption();
                }
              }
            }}
            placeholder="옵션 검색 또는 생성"
            className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />

          <div className="flex flex-col gap-0.5">
            <div className="px-1 text-caption font-medium text-muted-foreground/60 uppercase tracking-eyebrow">
              {query.trim() && !hasExactMatch ? "옵션 생성" : "옵션 선택"}
            </div>

            {query.trim() && !hasExactMatch ? (
              <button
                type="button"
                onClick={createOption}
                className="flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm hover:bg-accent"
              >
                <span className="text-muted-foreground">+</span>
                <span className="truncate">"{query.trim()}" 생성</span>
              </button>
            ) : null}

            {filtered.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className="flex items-center gap-1 rounded px-0.5 py-0.5 hover:bg-accent/60"
                >
                  <button
                    type="button"
                    onClick={() => toggleSelected(opt.id)}
                    className="flex flex-1 items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-sm"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-xs",
                        COLOR_CLASSES[opt.color],
                      )}
                    >
                      {opt.name}
                    </span>
                    {isSelected ? (
                      <Check className="size-3.5 text-muted-foreground" />
                    ) : null}
                  </button>
                  <ColorPicker
                    color={opt.color}
                    onSelect={(c) => setOptionColor(opt.id, c)}
                    onDelete={() => removeOption(opt.id)}
                  />
                </div>
              );
            })}

            {options.length === 0 && !query.trim() ? (
              <div className="px-1.5 py-1 text-xs text-muted-foreground/60">
                옵션 없음. 위 입력에 이름을 적고 Enter.
              </div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectBadge({ option }: { option: PropertySelectOption }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        COLOR_CLASSES[option.color],
      )}
    >
      {option.name}
    </span>
  );
}

function ColorPicker({
  color,
  onSelect,
  onDelete,
}: {
  color: PropertyColor;
  onSelect: (c: PropertyColor) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-accent"
        aria-label="색상 변경"
      >
        <span
          className={cn(
            "size-3 rounded-sm border border-border/60",
            COLOR_SWATCH[color],
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <div className="px-2 py-1 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground/60">
          색상
        </div>
        {COLOR_ORDER.map((c) => (
          <DropdownMenuItem key={c} onClick={() => onSelect(c)}>
            <span
              className={cn(
                "size-3 rounded-sm border border-border/60",
                COLOR_SWATCH[c],
              )}
            />
            <span className="flex-1">{COLOR_LABELS[c]}</span>
            {c === color ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <X className="size-3.5" />
          옵션 삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
