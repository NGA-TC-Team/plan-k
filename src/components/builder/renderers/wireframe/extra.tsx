"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";
import { KindBadge, WireBar, WireBox } from "./primitives";

/**
 * Wireframe variants for app + mobile blocks. Stripped-down silhouettes —
 * structure first, content second. The detail renderer owns the realistic
 * preview; this one shows where the block sits on the page.
 */

export const PageHeaderWireframe: BlockRenderer = () => (
  <WireBox className="space-y-2 p-3">
    <KindBadge kind="page-header" />
    <WireBar className="w-1/2" />
    <WireBar className="w-1/3 opacity-60" />
  </WireBox>
);

export const SidebarWireframe: BlockRenderer = () => (
  <WireBox className="w-48 space-y-2 p-3">
    <KindBadge kind="sidebar" />
    {Array.from({ length: 4 }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: stable static skeleton.
      <WireBar key={i} className="w-full opacity-70" />
    ))}
  </WireBox>
);

export const FooterWireframe: BlockRenderer = () => (
  <WireBox className="space-y-2 p-3">
    <KindBadge kind="footer" />
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable.
        <div key={i} className="space-y-1">
          <WireBar className="w-2/3" />
          <WireBar className="w-1/2 opacity-60" />
          <WireBar className="w-1/2 opacity-60" />
        </div>
      ))}
    </div>
  </WireBox>
);

export const TabsWireframe: BlockRenderer = ({ vm }) => {
  const tabs = (vm.displayValue.tabs as { label: string; id: string }[]) ?? [];
  const count = Math.max(tabs.length, 2);
  return (
    <WireBox className="p-3">
      <KindBadge kind="tabs" />
      <div className="mt-2 flex gap-2 border-b">
        {Array.from({ length: count }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional preview.
          <div key={i} className="border-b-2 border-zinc-400 pb-1">
            <WireBar className="w-12" />
          </div>
        ))}
      </div>
    </WireBox>
  );
};

export const ModalWireframe: BlockRenderer = () => (
  <WireBox className="mx-auto max-w-md space-y-2 p-3">
    <KindBadge kind="modal" />
    <WireBar className="w-1/2" />
    <WireBar className="w-full opacity-60" />
    <WireBar className="w-3/4 opacity-60" />
    <div className="flex justify-end gap-2 pt-2">
      <WireBar className="h-6 w-16" />
      <WireBar className="h-6 w-16" />
    </div>
  </WireBox>
);

export const DividerWireframe: BlockRenderer = ({ vm }) => {
  const orientation =
    (vm.displayValue.orientation as string | undefined) ?? "horizontal";
  if (orientation === "vertical")
    return <span className="mx-2 inline-block h-6 w-px bg-zinc-400" />;
  return <hr className="my-2 border-zinc-400" />;
};

export const CtaSectionWireframe: BlockRenderer = () => (
  <WireBox className="space-y-2 p-3 text-center">
    <KindBadge kind="cta-section" />
    <WireBar className="mx-auto w-1/2" />
    <WireBar className="mx-auto w-1/3 opacity-60" />
    <WireBar className="mx-auto h-6 w-24" />
  </WireBox>
);

export const ImageWireframe: BlockRenderer = () => (
  <WireBox className="flex h-32 items-center justify-center p-3">
    <KindBadge kind="image" />
  </WireBox>
);

export const StatWireframe: BlockRenderer = () => (
  <WireBox className="space-y-1 p-3">
    <KindBadge kind="stat" />
    <WireBar className="w-1/3 opacity-60" />
    <WireBar className="h-6 w-1/2" />
  </WireBox>
);

export const AvatarWireframe: BlockRenderer = () => (
  <WireBox className="flex items-center gap-2 p-2">
    <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-600" />
    <div className="flex-1 space-y-1">
      <WireBar className="w-1/3" />
      <WireBar className="w-1/4 opacity-60" />
    </div>
  </WireBox>
);

export const BadgeWireframe: BlockRenderer = () => (
  <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium dark:bg-zinc-700">
    badge
  </span>
);

export const ButtonWireframe: BlockRenderer = ({ vm }) => {
  const label = (vm.displayValue.label as string) ?? "Button";
  return (
    <button
      type="button"
      className="rounded-md bg-zinc-300 px-3 py-1.5 text-xs dark:bg-zinc-600"
    >
      {label}
    </button>
  );
};

export const InputWireframe: BlockRenderer = ({ vm }) => {
  const label = (vm.displayValue.label as string) ?? "";
  return (
    <div className="space-y-1">
      {label ? <WireBar className="w-1/4" /> : null}
      <WireBox className="h-7" />
    </div>
  );
};

export const BannerWireframe: BlockRenderer = () => (
  <div className="flex items-center justify-between rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-700">
    <WireBar className="w-2/3 opacity-70" />
    <KindBadge kind="banner" />
  </div>
);

export const EmptyStateWireframe: BlockRenderer = () => (
  <WireBox className="flex flex-col items-center gap-2 border-dashed p-6">
    <KindBadge kind="empty-state" />
    <WireBar className="w-1/3" />
    <WireBar className="w-1/2 opacity-60" />
  </WireBox>
);

// ────── mobile

export const StatusBarWireframe: BlockRenderer = () => (
  <div className="flex items-center justify-between bg-zinc-200 px-2 py-1 text-[9px] dark:bg-zinc-700">
    <span>9:41</span>
    <KindBadge kind="status-bar" />
  </div>
);

export const BottomNavWireframe: BlockRenderer = ({ vm }) => {
  const items = (vm.displayValue.items as unknown[]) ?? [];
  const count = Math.max(items.length, 3);
  return (
    <div className="flex justify-around border-t bg-zinc-100 py-1 dark:bg-zinc-800">
      {Array.from({ length: count }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: positional skeleton.
          key={i}
          className="h-4 w-8 rounded bg-zinc-300 dark:bg-zinc-600"
        />
      ))}
    </div>
  );
};

export const ListRowWireframe: BlockRenderer = () => (
  <div className="flex items-center gap-2 border-b py-2">
    <div className="h-6 w-6 rounded bg-zinc-300 dark:bg-zinc-600" />
    <div className="flex-1 space-y-1">
      <WireBar className="w-1/3" />
      <WireBar className="w-1/2 opacity-60" />
    </div>
    <span className="text-zinc-400">›</span>
  </div>
);

export const FabWireframe: BlockRenderer = () => (
  <div className="relative h-20">
    <div
      className={cn(
        "absolute right-2 bottom-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-400 text-white shadow",
      )}
    >
      +
    </div>
  </div>
);

export const SheetWireframe: BlockRenderer = () => (
  <WireBox className="rounded-t-xl p-3">
    <div className="mx-auto mb-2 h-1 w-10 rounded bg-zinc-400" />
    <KindBadge kind="sheet" />
    <div className="mt-2 space-y-1">
      <WireBar className="w-1/2" />
      <WireBar className="w-3/4 opacity-60" />
    </div>
  </WireBox>
);
