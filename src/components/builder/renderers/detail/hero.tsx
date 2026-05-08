"use client";

import type { BlockRenderer } from "../types";

export const HeroDetail: BlockRenderer = ({ vm }) => {
  const title = (vm.displayValue.title as string) ?? "";
  const subtitle = (vm.displayValue.subtitle as string) ?? "";
  const cta = (vm.displayValue.cta as string) ?? "";
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-8 text-center">
      <h2 className="text-3xl font-semibold tracking-display-lg text-ink">
        {title.length > 0 ? (
          title
        ) : (
          <span className="italic text-ink-tertiary">Hero title</span>
        )}
      </h2>
      {subtitle.length > 0 ? (
        <p className="mt-2 text-ink-muted">{subtitle}</p>
      ) : null}
      {cta.length > 0 ? (
        <button
          type="button"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-on-primary hover:bg-primary-hover"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
};
