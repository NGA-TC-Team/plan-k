"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

type Props = {
  from: Point;
  to: Point;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

const ARROW_ID = "builder-flow-edge-arrow";

export function FlowEdge({
  from,
  to,
  label,
  className,
  style,
  onClick,
}: Props) {
  const minX = Math.min(from.x, to.x) - 12;
  const minY = Math.min(from.y, to.y) - 12;
  const width = Math.abs(to.x - from.x) + 24;
  const height = Math.abs(to.y - from.y) + 24;

  const midX = (from.x + to.x) / 2;
  const dx = to.x - from.x;
  const curve = Math.max(40, Math.abs(dx) / 2);
  const path = `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${
    to.x - curve
  } ${to.y}, ${to.x} ${to.y}`;

  return (
    <svg
      role={onClick ? "button" : "img"}
      aria-label={label ?? "flow edge"}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "pointer-events-none absolute",
        onClick && "pointer-events-auto cursor-pointer",
        className,
      )}
      style={{
        left: minX,
        top: minY,
        width,
        height,
        ...style,
      }}
      viewBox={`${minX} ${minY} ${width} ${height}`}
    >
      <defs>
        <marker
          id={ARROW_ID}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="fill-foreground/60" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        className="stroke-foreground/60"
        strokeWidth={1.5}
        markerEnd={`url(#${ARROW_ID})`}
      />
      {label ? (
        <text
          x={midX}
          y={(from.y + to.y) / 2 - 6}
          textAnchor="middle"
          className="fill-foreground/70 text-[10px]"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
