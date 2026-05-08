"use client";

import {
  SPACING_PRESET_LABEL,
  SPACING_PRESETS,
  type SpacingPreset,
  type SpacingValue,
  spacingDefaultsFor,
  spacingFromBlockData,
} from "@/builder/spacing";
import type { BlockKind } from "@/builder/types/entity";
import {
  EnumChips,
  type EnumChipsOption,
  Field,
} from "@/components/builder/fields";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";

const PRESET_OPTIONS: EnumChipsOption<SpacingPreset>[] = SPACING_PRESETS.map(
  (p) => ({ label: SPACING_PRESET_LABEL[p], value: p }),
);

type Axis = "padding" | "marginTop" | "marginBottom";

type Props = {
  blockId: string;
  kind: BlockKind;
  data: Record<string, unknown>;
};

/**
 * Standalone spacing editor rendered inside the side panel — outside any react-
 * hook-form. Reads `data.spacing` directly and dispatches UPDATE_BLOCK on change.
 *
 * Lives next to (not inside) per-kind editors so all 23 app-context block kinds
 * pick it up via one render-site change.
 */
export function SpacingSection({ blockId, kind, data }: Props) {
  const dispatch = useBuilderDispatch();
  const defaults = spacingDefaultsFor(kind);
  const current: SpacingValue = spacingFromBlockData(data);

  function set(axis: Axis, value: SpacingPreset) {
    const next: SpacingValue = {
      ...(current ?? {}),
      [axis]: value,
    };
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch: { data: { ...data, spacing: next } },
    });
  }

  function reset() {
    const { spacing: _drop, ...rest } = data as { spacing?: unknown };
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: blockId,
      patch: { data: rest },
    });
  }

  const padding = current?.padding ?? defaults.padding;
  const marginTop = current?.marginTop ?? defaults.marginTop;
  const marginBottom = current?.marginBottom ?? defaults.marginBottom;
  const isOverridden = Boolean(
    current?.padding || current?.marginTop || current?.marginBottom,
  );

  return (
    <section className="space-y-2 rounded-md border border-hairline p-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Spacing
        </h3>
        {isOverridden ? (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Reset to default
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Defaults applied
          </span>
        )}
      </header>
      <Field
        label="Padding"
        hint={
          current?.padding
            ? undefined
            : `Default: ${SPACING_PRESET_LABEL[defaults.padding]}`
        }
      >
        <EnumChips
          value={padding}
          onChange={(v) => set("padding", v)}
          options={PRESET_OPTIONS}
        />
      </Field>
      <Field
        label="Margin top"
        hint={
          current?.marginTop
            ? undefined
            : `Default: ${SPACING_PRESET_LABEL[defaults.marginTop]}`
        }
      >
        <EnumChips
          value={marginTop}
          onChange={(v) => set("marginTop", v)}
          options={PRESET_OPTIONS}
        />
      </Field>
      <Field
        label="Margin bottom"
        hint={
          current?.marginBottom
            ? undefined
            : `Default: ${SPACING_PRESET_LABEL[defaults.marginBottom]}`
        }
      >
        <EnumChips
          value={marginBottom}
          onChange={(v) => set("marginBottom", v)}
          options={PRESET_OPTIONS}
        />
      </Field>
    </section>
  );
}
