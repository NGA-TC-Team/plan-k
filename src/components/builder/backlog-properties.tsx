"use client";

import {
  Calendar as CalendarIcon,
  Check,
  Hash,
  List,
  Pencil,
  SlidersHorizontal,
  Trash2,
  Type,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  PropertyEntry,
  PropertyType,
  SectionEntity,
} from "@/builder/types/entity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PropertyValueEditor } from "./property-value-editor";

const EMPTY_PROPERTIES: PropertyEntry[] = [];

type Props = {
  section: SectionEntity;
  onChange: (next: PropertyEntry[]) => void;
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: "텍스트",
  number: "숫자",
  date: "날짜",
  select: "선택",
};

export function BacklogProperties({ section, onChange }: Props) {
  const properties = section.properties ?? EMPTY_PROPERTIES;
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const updateEntry = (id: string, patch: Partial<PropertyEntry>) => {
    onChange(properties.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeEntry = (id: string) => {
    onChange(properties.filter((p) => p.id !== id));
  };

  const addEntry = () => {
    const newEntry: PropertyEntry = {
      id: crypto.randomUUID(),
      key: "새 속성",
      type: "text",
      value: "",
    };
    onChange([...properties, newEntry]);
    setRenamingId(newEntry.id);
  };

  return (
    <div data-backlog-properties="true" className="mt-3 mb-4">
      <div className="flex flex-col gap-0.5">
        {properties.map((entry) => (
          <PropertyRow
            key={entry.id}
            entry={entry}
            isRenaming={renamingId === entry.id}
            onStartRename={() => setRenamingId(entry.id)}
            onStopRename={() => setRenamingId(null)}
            onUpdate={(patch) => updateEntry(entry.id, patch)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}

        <button
          type="button"
          onClick={addEntry}
          className="mt-0.5 w-fit rounded px-1.5 py-1 text-xs text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
        >
          + 속성 추가
        </button>
      </div>

      <div className="mt-4 border-b border-border/60" />
    </div>
  );
}

type RowProps = {
  entry: PropertyEntry;
  isRenaming: boolean;
  onStartRename: () => void;
  onStopRename: () => void;
  onUpdate: (patch: Partial<PropertyEntry>) => void;
  onRemove: () => void;
};

function PropertyRow({
  entry,
  isRenaming,
  onStartRename,
  onStopRename,
  onUpdate,
  onRemove,
}: RowProps) {
  return (
    <div
      className="grid items-center gap-2"
      style={{ gridTemplateColumns: "180px 1fr" }}
    >
      {isRenaming ? (
        <RenameKeyInput
          initial={entry.key}
          onCommit={(next) => {
            onUpdate({ key: next });
            onStopRename();
          }}
          onCancel={onStopRename}
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-7 items-center gap-1.5 truncate rounded px-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:bg-accent focus:outline-none data-[popup-open]:bg-accent"
            aria-label={`${entry.key} 속성 메뉴`}
          >
            <TypeIcon type={entry.type} className="size-3.5 shrink-0" />
            <span className="truncate">{entry.key || "이름 없음"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={onStartRename}>
              <Pencil className="size-3.5" />
              이름 바꾸기
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SlidersHorizontal className="size-3.5" />
                속성 유형
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                {(
                  Object.entries(PROPERTY_TYPE_LABELS) as [
                    PropertyType,
                    string,
                  ][]
                ).map(([type, label]) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => {
                      if (type === entry.type) return;
                      onUpdate({ type, value: null });
                    }}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TypeIcon type={type} />
                        {label}
                      </span>
                      {entry.type === type ? (
                        <Check className="size-3.5 text-muted-foreground" />
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <Trash2 className="size-3.5" />
              속성 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <PropertyValueEditor entry={entry} onChange={onUpdate} />
    </div>
  );
}

function RenameKeyInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const trimmed = value.trim();
        if (!trimmed) {
          onCancel();
          return;
        }
        onCommit(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) {
            onCancel();
            return;
          }
          onCommit(trimmed);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      className="h-7 border-0 bg-accent px-1.5 text-sm shadow-none focus-visible:ring-1"
      placeholder="속성 이름"
    />
  );
}

const TYPE_ICONS: Record<
  PropertyType,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  text: Type,
  number: Hash,
  date: CalendarIcon,
  select: List,
};

function TypeIcon({
  type,
  className = "size-3.5 text-muted-foreground",
}: {
  type: PropertyType;
  className?: string;
}) {
  const Icon = TYPE_ICONS[type];
  return <Icon className={className} />;
}
