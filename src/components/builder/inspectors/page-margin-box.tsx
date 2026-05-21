"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

type Defaults = Record<Side, number>;

type Props = {
  top: number | undefined;
  right: number | undefined;
  bottom: number | undefined;
  left: number | undefined;
  defaults: Defaults;
  onChange: (side: Side, value: number | undefined) => void;
  /** 섹션 override 인스펙터에서만 사용. 미지정이면 reset 버튼 미표시. */
  onReset?: (side: Side) => void;
};

/**
 * A4 용지 형태의 여백 시각화. 4면 input이 종이 가장자리에 배치된다.
 *
 * - aspect-[210/297] 비율을 유지해 A4 portrait을 표현.
 * - input은 placeholder로 시스템/플랜 기본값을 옅게 보여주고, 사용자가
 *   값을 입력하면 patch. 빈 문자열은 undefined patch로 상속 복원.
 */
export function PageMarginBox({
  top,
  right,
  bottom,
  left,
  defaults,
  onChange,
  onReset,
}: Props) {
  return (
    <div className="flex justify-center py-2">
      <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] items-center gap-2">
        {/* row 1: blank | top | blank */}
        <div />
        <SideField
          side="top"
          value={top}
          fallback={defaults.top}
          onChange={onChange}
          onReset={onReset}
        />
        <div />

        {/* row 2: left | A4 paper | right */}
        <SideField
          side="left"
          value={left}
          fallback={defaults.left}
          onChange={onChange}
          onReset={onReset}
        />
        <A4Paper
          top={top ?? defaults.top}
          right={right ?? defaults.right}
          bottom={bottom ?? defaults.bottom}
          left={left ?? defaults.left}
        />
        <SideField
          side="right"
          value={right}
          fallback={defaults.right}
          onChange={onChange}
          onReset={onReset}
        />

        {/* row 3: blank | bottom | blank */}
        <div />
        <SideField
          side="bottom"
          value={bottom}
          fallback={defaults.bottom}
          onChange={onChange}
          onReset={onReset}
        />
        <div />
      </div>
    </div>
  );
}

/**
 * A4 비율 그림. 안쪽 점선 사각형이 콘텐츠 영역(여백을 제외한 면)을
 * 비율에 맞춰 표시한다. A4 = 210 × 297mm 기준.
 */
function A4Paper({
  top,
  right,
  bottom,
  left,
}: {
  top: number;
  right: number;
  bottom: number;
  left: number;
}) {
  // mm 비율을 % 로 변환. 음수/과대 입력은 clamp.
  const topPct = clampPct((top / 297) * 100);
  const bottomPct = clampPct((bottom / 297) * 100);
  const leftPct = clampPct((left / 210) * 100);
  const rightPct = clampPct((right / 210) * 100);

  return (
    <div className="relative h-[150px] w-[106px] rounded-sm border border-border bg-card shadow-sm">
      <div
        aria-hidden
        className="absolute border border-dashed border-muted-foreground/40"
        style={{
          top: `${topPct}%`,
          right: `${rightPct}%`,
          bottom: `${bottomPct}%`,
          left: `${leftPct}%`,
        }}
      />
    </div>
  );
}

function clampPct(v: number) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 45) return 45; // 여백 시각화는 한쪽이 종이의 45%를 넘으면 가독성이 떨어져 clamp
  return v;
}

const SIDE_LABEL: Record<Side, string> = {
  top: "위",
  right: "오른쪽",
  bottom: "아래",
  left: "왼쪽",
};

function SideField({
  side,
  value,
  fallback,
  onChange,
  onReset,
}: {
  side: Side;
  value: number | undefined;
  fallback: number;
  onChange: (side: Side, value: number | undefined) => void;
  onReset?: (side: Side) => void;
}) {
  const isVertical = side === "top" || side === "bottom";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5",
        isVertical ? "w-[106px]" : "w-14",
      )}
    >
      <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground">
        {SIDE_LABEL[side]}
      </span>
      <div className="flex w-full items-center gap-1">
        <Input
          type="number"
          inputMode="numeric"
          className="h-7 px-1.5 text-center text-xs tabular-nums"
          min={0}
          max={200}
          step={1}
          placeholder={String(fallback)}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(side, undefined);
              return;
            }
            const n = Number(raw);
            if (!Number.isNaN(n) && n >= 0 && n <= 200) {
              onChange(side, n);
            }
          }}
        />
        {onReset && value !== undefined ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 shrink-0 p-0 text-muted-foreground"
            title="기본값으로 되돌리기"
            onClick={() => onReset(side)}
          >
            <RotateCcw className="size-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
