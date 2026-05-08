"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KEYMAP, KEYMAP_GROUP_LABEL, type ShortcutEntry } from "@/lib/keymap";
import { useUiStore } from "@/services/stores";

function groupBy<T, K extends string>(items: T[], by: (i: T) => K) {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const key = by(item);
    const list = out.get(key) ?? [];
    list.push(item);
    out.set(key, list);
  }
  return out;
}

export function KeymapSheet() {
  const open = useUiStore((s) => s.helpSheetOpen);
  const setOpen = useUiStore((s) => s.setHelpSheetOpen);

  const grouped = groupBy(KEYMAP, (e) => e.group);
  const groupOrder: ShortcutEntry["group"][] = [
    "global",
    "navigation",
    "edit",
    "selection",
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>단축키</SheetTitle>
          <SheetDescription>
            ? 키로 언제든 다시 열 수 있습니다.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
          {groupOrder.map((g) => {
            const entries = grouped.get(g);
            if (!entries || entries.length === 0) return null;
            return (
              <section key={g} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {KEYMAP_GROUP_LABEL[g]}
                </h3>
                <ul className="space-y-1.5">
                  {entries.map((entry) => (
                    <li
                      key={`${g}-${entry.keys.join("+")}-${entry.label}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm">{entry.label}</span>
                      <KbdGroup>
                        {entry.keys.map((k, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: keys are positional
                          <Kbd key={i}>{k}</Kbd>
                        ))}
                      </KbdGroup>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
