"use client";

import { EntityStatusChip } from "./status-chip";

type Props = {
  entityId: string;
  /** 헤더에 표시할 entity kind 라벨. 없으면 "Status"만 표시. */
  kindLabel?: string;
};

export function PropertyStatus({ entityId, kindLabel }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {kindLabel ?? "Status"}
      </div>
      <EntityStatusChip entityId={entityId} variant="pill" />
    </div>
  );
}
