"use client";

import { Eye, RotateCcw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";

type Props = {
  entityId: string;
};

/**
 * Inline viewMode override toggle for a section or screen header.
 *
 * Renders a two-button ToggleGroup (Detail / Wireframe) plus a small "Reset
 * to global" button that appears only when an override is active.
 *
 * When no override is set the ToggleGroup shows no active value (both buttons
 * appear unselected) to visually distinguish "inheriting global" from an
 * explicit local choice.
 */
export function ViewModeOverrideToggle({ entityId }: Props) {
  const dispatch = useBuilderDispatch();
  const override = useBuilderState(
    (s) => s.state.entityMeta[entityId]?.viewModeOverride,
  );

  function handleChange(values: string[]) {
    const next = values[0];
    if (next === "detail" || next === "wireframe") {
      dispatch({
        type: "UPDATE_ENTITY_META",
        entityId,
        patch: { viewModeOverride: next },
      });
    }
  }

  function handleReset() {
    dispatch({
      type: "UPDATE_ENTITY_META",
      entityId,
      patch: { viewModeOverride: null },
    });
  }

  return (
    <div className="flex items-center gap-1">
      <ToggleGroup
        value={override ? [override] : []}
        onValueChange={handleChange}
        size="sm"
        variant="outline"
        aria-label="Section view mode override"
      >
        <ToggleGroupItem value="detail" aria-label="Detail view">
          <Eye className="size-3" />
          <span className="sr-only">Detail</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="wireframe" aria-label="Wireframe view">
          <Wrench className="size-3" />
          <span className="sr-only">Wireframe</span>
        </ToggleGroupItem>
      </ToggleGroup>
      {override ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleReset}
          aria-label="Reset to global view mode"
        >
          <RotateCcw className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}
