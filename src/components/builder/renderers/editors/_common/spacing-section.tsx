"use client";

import { Link, Link2Off } from "lucide-react";
import { useState } from "react";
import {
  migrateLegacySpacing,
  resolveSpacingPx,
  SPACING_PRESET_LABEL,
  SPACING_PRESETS,
  type SpacingField,
  type SpacingPreset,
  type SpacingValue,
  spacingDefaultsFor,
  spacingFromBlockData,
} from "@/builder/spacing";
import type { BlockKind } from "@/builder/types/entity";
import { EnumChips, type EnumChipsOption } from "@/components/builder/fields";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { NumberOrTokenField } from "./number-or-token-field";

const PRESET_OPTIONS: EnumChipsOption<SpacingPreset>[] = SPACING_PRESETS.map(
  (p) => ({ label: SPACING_PRESET_LABEL[p], value: p }),
);

type Props = {
  blockId: string;
  kind: BlockKind;
  data: Record<string, unknown>;
};

type PaddingSide =
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft";
type MarginSide = "marginTop" | "marginRight" | "marginBottom" | "marginLeft";

/**
 * Figma-style spacing inspector.
 *
 * Layout:
 *   ┌─ Preset row (padding) ────────────────────────┐
 *   │ EnumChips: none / S / M / L / XL              │
 *   ├─ Preset row (margin) ─────────────────────────┤
 *   │ EnumChips: none / S / M / L / XL              │
 *   ├─ Box UI ──────────────────────────────────────┤
 *   │  ┌────────────── MARGIN ──────────────────┐   │
 *   │  │  [top]                                 │   │
 *   │  │ [left]  ┌── PADDING ──┐  [right]       │   │
 *   │  │         │  [T] [🔗]  │                 │   │
 *   │  │         │[L] [·] [R] │                 │   │
 *   │  │         │    [B]     │                 │   │
 *   │  │         └────────────┘                 │   │
 *   │  │  [bottom]                              │   │
 *   │  └────────────────────────────────────────┘   │
 *   └───────────────────────────────────────────────┘
 *
 * Dispatches UPDATE_BLOCK with the merged next SpacingValue.
 * Uses migrateLegacySpacing so old `padding` shorthand data is transparently
 * expanded before any edit.
 */
export function SpacingSection({ blockId, kind, data }: Props) {
  const dispatch = useBuilderDispatch();
  const defaults = spacingDefaultsFor(kind);
  const raw: SpacingValue = spacingFromBlockData(data);
  const current: SpacingValue = migrateLegacySpacing(raw);

  // Locked state: one side change propagates to all 4 sides of the same axis.
  const [paddingLocked, setPaddingLocked] = useState(false);
  const [marginLocked, setMarginLocked] = useState(false);

  const defaultPxP = resolveSpacingPx(defaults.padding) ?? 0;
  const defaultPxMT = resolveSpacingPx(defaults.marginTop) ?? 0;
  const defaultPxMB = resolveSpacingPx(defaults.marginBottom) ?? 0;

  // ── Derived display values ────────────────────────────────────────────────
  const pt = current?.paddingTop;
  const pr = current?.paddingRight;
  const pb = current?.paddingBottom;
  const pl = current?.paddingLeft;
  const mt = current?.marginTop;
  const mr = current?.marginRight;
  const mb = current?.marginBottom;
  const ml = current?.marginLeft;

  const isOverridden = Boolean(current && Object.keys(current).length > 0);

  // ── Commit helpers ────────────────────────────────────────────────────────
  function commitSpacing(next: SpacingValue) {
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch: { data: { ...data, spacing: next } },
    });
  }

  function setPaddingSide(side: PaddingSide, value: SpacingField | undefined) {
    const base: NonNullable<SpacingValue> = { ...(current ?? {}) };
    if (paddingLocked) {
      // Propagate to all 4 padding sides
      if (value === undefined) {
        delete base.paddingTop;
        delete base.paddingRight;
        delete base.paddingBottom;
        delete base.paddingLeft;
      } else {
        base.paddingTop = value;
        base.paddingRight = value;
        base.paddingBottom = value;
        base.paddingLeft = value;
      }
    } else {
      if (value === undefined) {
        delete base[side];
      } else {
        base[side] = value;
      }
    }
    // Drop legacy padding key if present
    delete (base as Record<string, unknown>).padding;
    commitSpacing(Object.keys(base).length === 0 ? undefined : base);
  }

  function setMarginSide(side: MarginSide, value: SpacingField | undefined) {
    const base: NonNullable<SpacingValue> = { ...(current ?? {}) };
    if (marginLocked) {
      if (value === undefined) {
        delete base.marginTop;
        delete base.marginRight;
        delete base.marginBottom;
        delete base.marginLeft;
      } else {
        base.marginTop = value;
        base.marginRight = value;
        base.marginBottom = value;
        base.marginLeft = value;
      }
    } else {
      if (value === undefined) {
        delete base[side];
      } else {
        base[side] = value;
      }
    }
    delete (base as Record<string, unknown>).padding;
    commitSpacing(Object.keys(base).length === 0 ? undefined : base);
  }

  /** Apply a preset to all 4 padding sides at once (top preset row). */
  function applyPaddingPreset(preset: SpacingPreset) {
    const base: NonNullable<SpacingValue> = { ...(current ?? {}) };
    base.paddingTop = preset;
    base.paddingRight = preset;
    base.paddingBottom = preset;
    base.paddingLeft = preset;
    delete (base as Record<string, unknown>).padding;
    commitSpacing(base);
  }

  /** Apply a preset to marginTop + marginBottom at once (top preset row). */
  function applyMarginPreset(preset: SpacingPreset) {
    const base: NonNullable<SpacingValue> = { ...(current ?? {}) };
    base.marginTop = preset;
    base.marginBottom = preset;
    commitSpacing(base);
  }

  function reset() {
    const { spacing: _drop, ...rest } = data as { spacing?: unknown };
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch: { data: rest },
    });
  }

  // ── Derived "representative" preset for the top EnumChips row ────────────
  // Show the chip as selected only if all 4 padding sides have the same token.
  const paddingPresetIfUniform =
    pt !== undefined &&
    pt === pr &&
    pr === pb &&
    pb === pl &&
    typeof pt === "string"
      ? (pt as SpacingPreset)
      : undefined;

  const marginPresetIfUniform =
    mt !== undefined &&
    mt === mb &&
    typeof mt === "string" &&
    mr === undefined &&
    ml === undefined
      ? (mt as SpacingPreset)
      : undefined;

  return (
    <section className="space-y-2 rounded-md border border-hairline p-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h3 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
          Spacing
        </h3>
        {isOverridden ? (
          <button
            type="button"
            onClick={reset}
            className="text-caption text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        ) : (
          <span className="text-caption text-muted-foreground">
            Defaults applied
          </span>
        )}
      </header>

      {/* Preset quick-apply rows */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] text-muted-foreground">
            Padding
          </span>
          <EnumChips<SpacingPreset>
            value={paddingPresetIfUniform ?? ("" as SpacingPreset)}
            onChange={applyPaddingPreset}
            options={PRESET_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] text-muted-foreground">
            Margin
          </span>
          <EnumChips<SpacingPreset>
            value={marginPresetIfUniform ?? ("" as SpacingPreset)}
            onChange={applyMarginPreset}
            options={PRESET_OPTIONS}
          />
        </div>
      </div>

      {/* Figma-style box UI */}
      <div className="relative rounded-sm border border-hairline bg-muted/30 p-2">
        {/* MARGIN label */}
        <span className="absolute left-1.5 top-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 select-none">
          M
        </span>

        {/* Margin top */}
        <div className="flex justify-center pb-1">
          <div className="w-12">
            <NumberOrTokenField
              label="Margin top"
              value={mt}
              placeholderPx={defaultPxMT}
              onChange={(v) => setMarginSide("marginTop", v)}
            />
          </div>
        </div>

        {/* Middle row: margin left | padding box | margin right */}
        <div className="flex items-stretch gap-1">
          {/* Margin left */}
          <div className="flex w-10 items-center">
            <NumberOrTokenField
              label="Margin left"
              value={ml}
              placeholderPx={0}
              onChange={(v) => setMarginSide("marginLeft", v)}
            />
          </div>

          {/* Inner padding box */}
          <div className="relative flex-1 rounded-sm border border-hairline bg-background/70 p-1.5">
            {/* PADDING label */}
            <span className="absolute left-1 top-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 select-none">
              P
            </span>

            {/* Padding top */}
            <div className="flex justify-center pb-1 pt-2">
              <div className="w-12">
                <NumberOrTokenField
                  label="Padding top"
                  value={pt}
                  placeholderPx={defaultPxP}
                  onChange={(v) => setPaddingSide("paddingTop", v)}
                />
              </div>
            </div>

            {/* Padding middle row: left | lock | right */}
            <div className="flex items-center gap-1">
              <div className="w-10 flex-1">
                <NumberOrTokenField
                  label="Padding left"
                  value={pl}
                  placeholderPx={defaultPxP}
                  onChange={(v) => setPaddingSide("paddingLeft", v)}
                />
              </div>

              {/* Padding lock toggle */}
              <button
                type="button"
                aria-label={
                  paddingLocked ? "Unlock padding sides" : "Lock padding sides"
                }
                aria-pressed={paddingLocked}
                onClick={() => setPaddingLocked((v) => !v)}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-sm",
                  "border border-input transition-colors",
                  paddingLocked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {paddingLocked ? (
                  <Link className="size-3" />
                ) : (
                  <Link2Off className="size-3" />
                )}
              </button>

              <div className="w-10 flex-1">
                <NumberOrTokenField
                  label="Padding right"
                  value={pr}
                  placeholderPx={defaultPxP}
                  onChange={(v) => setPaddingSide("paddingRight", v)}
                />
              </div>
            </div>

            {/* Padding bottom */}
            <div className="flex justify-center pt-1">
              <div className="w-12">
                <NumberOrTokenField
                  label="Padding bottom"
                  value={pb}
                  placeholderPx={defaultPxP}
                  onChange={(v) => setPaddingSide("paddingBottom", v)}
                />
              </div>
            </div>
          </div>

          {/* Margin right */}
          <div className="flex w-10 items-center">
            <NumberOrTokenField
              label="Margin right"
              value={mr}
              placeholderPx={0}
              onChange={(v) => setMarginSide("marginRight", v)}
            />
          </div>
        </div>

        {/* Margin bottom */}
        <div className="flex justify-center pt-1">
          <div className="w-12">
            {/* Margin lock toggle — positioned between top input and bottom input */}
            <div className="mb-0.5 flex justify-center">
              <button
                type="button"
                aria-label={
                  marginLocked ? "Unlock margin sides" : "Lock margin sides"
                }
                aria-pressed={marginLocked}
                onClick={() => setMarginLocked((v) => !v)}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-sm",
                  "border border-input transition-colors",
                  marginLocked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent",
                )}
              >
                {marginLocked ? (
                  <Link className="size-2.5" />
                ) : (
                  <Link2Off className="size-2.5" />
                )}
              </button>
            </div>
            <NumberOrTokenField
              label="Margin bottom"
              value={mb}
              placeholderPx={defaultPxMB}
              onChange={(v) => setMarginSide("marginBottom", v)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
