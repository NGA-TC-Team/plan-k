"use client";

import type { BlockRenderer } from "../types";

export const HeroDetail: BlockRenderer = ({ vm }) => {
  const title = (vm.displayValue.title as string) ?? "";
  const subtitle = (vm.displayValue.subtitle as string) ?? "";
  const cta = (vm.displayValue.cta as string) ?? "";
  return (
    <div className="rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 p-8 text-center dark:from-zinc-800 dark:to-zinc-900">
      <h2 className="text-3xl font-bold">
        {title.length > 0 ? (
          title
        ) : (
          <span className="italic text-muted-foreground">Hero title</span>
        )}
      </h2>
      {subtitle.length > 0 ? (
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">{subtitle}</p>
      ) : null}
      {cta.length > 0 ? (
        <button
          type="button"
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-zinc-900"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
};
