"use client";

import { BookOpen, RotateCcw, Tag } from "lucide-react";
import { SYSTEM_PAGE_DEFAULTS } from "@/builder/decider/page-settings";
import type { SectionInspectViewModel } from "@/builder/projection";
import type { PageSettings } from "@/builder/types/entity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import { PropertyTable } from "../property-list";
import { PropertyStatus } from "../property-status";
import { PageMarginBox } from "./page-margin-box";

type Props = {
  vm: SectionInspectViewModel;
};

export function SectionInspector({ vm }: Props) {
  const dispatch = useBuilderDispatch();

  function patchSection(p: Partial<PageSettings>) {
    dispatch({
      type: "UPDATE_SECTION_PAGE_SETTINGS",
      sectionId: vm.id,
      patch: p,
    });
  }

  function resetField(key: keyof PageSettings) {
    // undefined 값을 patch하면 해당 키가 제거되어 상위 층으로 fall through
    dispatch({
      type: "UPDATE_SECTION_PAGE_SETTINGS",
      sectionId: vm.id,
      patch: { [key]: undefined },
    });
  }

  const ps = vm.pageSettings ?? {};

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="divide-y divide-hairline [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-caption gap-1">
                <BookOpen className="size-3" />
                <span>Section</span>
              </Badge>
              <span className="text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
                {vm.sectionKind}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{vm.title}</p>
          </header>

          <section>
            <PropertyStatus entityId={vm.id} kindLabel="Section Status" />
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
              <Tag className="size-3" />
              <span>Meta</span>
            </h2>
            <PropertyTable
              rows={[
                {
                  label: "id",
                  value: (
                    <code className="font-mono text-caption">
                      {vm.id.slice(0, 8)}…
                    </code>
                  ),
                },
                {
                  label: "title",
                  value: <span className="text-caption">{vm.title}</span>,
                },
                {
                  label: "kind",
                  value: (
                    <code className="font-mono text-caption">
                      {vm.sectionKind}
                    </code>
                  ),
                },
              ]}
            />
          </section>

          {/* ── 섹션 페이지 설정 override ─────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
              <Tag className="size-3" />
              <span>페이지 설정 (이 섹션)</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              미입력 필드는 플랜 기본값 → 시스템 기본값 순으로 적용됩니다.{" "}
              <RotateCcw className="inline size-3" /> 버튼으로 플랜 기본값으로
              되돌립니다.
            </p>

            {/* 여백 — A4 기준 4면 (override) */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-muted-foreground">
                여백 (mm) · A4
              </p>
              <PageMarginBox
                top={ps.paddingTopMm}
                right={ps.paddingRightMm}
                bottom={ps.paddingBottomMm}
                left={ps.paddingLeftMm}
                defaults={{
                  top: SYSTEM_PAGE_DEFAULTS.paddingTopMm,
                  right: SYSTEM_PAGE_DEFAULTS.paddingRightMm,
                  bottom: SYSTEM_PAGE_DEFAULTS.paddingBottomMm,
                  left: SYSTEM_PAGE_DEFAULTS.paddingLeftMm,
                }}
                onChange={(side, value) => {
                  if (side === "top") patchSection({ paddingTopMm: value });
                  else if (side === "right")
                    patchSection({ paddingRightMm: value });
                  else if (side === "bottom")
                    patchSection({ paddingBottomMm: value });
                  else patchSection({ paddingLeftMm: value });
                }}
                onReset={(side) => {
                  if (side === "top") resetField("paddingTopMm");
                  else if (side === "right") resetField("paddingRightMm");
                  else if (side === "bottom") resetField("paddingBottomMm");
                  else resetField("paddingLeftMm");
                }}
              />
            </div>

            {/* 머리말 / 꼬리말 */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-muted-foreground">
                머리말 / 꼬리말
              </p>
              <ResetableTextField
                label="머리말"
                value={ps.headerText}
                placeholder="플랜 기본값 사용"
                onChange={(v) => patchSection({ headerText: v })}
                onReset={() => resetField("headerText")}
              />
              <ResetableTextField
                label="꼬리말"
                value={ps.footerText}
                placeholder="플랜 기본값 사용"
                onChange={(v) => patchSection({ footerText: v })}
                onReset={() => resetField("footerText")}
              />
            </div>

            {/* 쪽 번호 */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-muted-foreground">
                쪽 번호
              </p>
              <div className="flex items-center justify-between">
                <Label className="text-xs">쪽 번호 표시</Label>
                <div className="flex items-center gap-2">
                  {ps.showPageNumbers !== undefined && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-muted-foreground"
                      title="플랜 기본값으로 되돌리기"
                      onClick={() => resetField("showPageNumbers")}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  )}
                  <Switch
                    checked={
                      ps.showPageNumbers ?? SYSTEM_PAGE_DEFAULTS.showPageNumbers
                    }
                    onCheckedChange={(checked) =>
                      patchSection({ showPageNumbers: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 워터마크 */}
            <div className="space-y-2">
              <p className="text-caption font-medium text-muted-foreground">
                워터마크
              </p>
              <ResetableTextField
                label="텍스트"
                value={ps.watermarkText}
                placeholder="플랜 기본값 사용"
                onChange={(v) => patchSection({ watermarkText: v })}
                onReset={() => resetField("watermarkText")}
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-caption text-muted-foreground">
                    투명도
                  </Label>
                  <div className="flex items-center gap-2">
                    {ps.watermarkOpacity !== undefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-muted-foreground"
                        title="플랜 기본값으로 되돌리기"
                        onClick={() => resetField("watermarkOpacity")}
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    )}
                    <span className="text-caption tabular-nums text-muted-foreground">
                      {Math.round(
                        (ps.watermarkOpacity ??
                          SYSTEM_PAGE_DEFAULTS.watermarkOpacity) * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[
                    ps.watermarkOpacity ??
                      SYSTEM_PAGE_DEFAULTS.watermarkOpacity,
                  ]}
                  onValueChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v;
                    if (typeof val === "number")
                      patchSection({ watermarkOpacity: val });
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-caption text-muted-foreground">
                    각도 (°)
                  </Label>
                  <div className="flex items-center gap-2">
                    {ps.watermarkAngleDeg !== undefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-muted-foreground"
                        title="플랜 기본값으로 되돌리기"
                        onClick={() => resetField("watermarkAngleDeg")}
                      >
                        <RotateCcw className="size-3" />
                      </Button>
                    )}
                    <span className="text-caption tabular-nums text-muted-foreground">
                      {ps.watermarkAngleDeg ??
                        SYSTEM_PAGE_DEFAULTS.watermarkAngleDeg}
                      °
                    </span>
                  </div>
                </div>
                <Slider
                  min={-180}
                  max={180}
                  step={1}
                  value={[
                    ps.watermarkAngleDeg ??
                      SYSTEM_PAGE_DEFAULTS.watermarkAngleDeg,
                  ]}
                  onValueChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v;
                    if (typeof val === "number")
                      patchSection({ watermarkAngleDeg: val });
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── 내부 컴포넌트 ─────────────────────────────────────────────────────────────

type ResetableTextFieldProps = {
  label: string;
  value: string | undefined;
  placeholder: string;
  onChange: (v: string | undefined) => void;
  onReset: () => void;
};

function ResetableTextField({
  label,
  value,
  placeholder,
  onChange,
  onReset,
}: ResetableTextFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-caption text-muted-foreground">{label}</Label>
        {value !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 text-muted-foreground"
            title="플랜 기본값으로 되돌리기"
            onClick={onReset}
          >
            <RotateCcw className="size-3" />
          </Button>
        )}
      </div>
      <Input
        className="h-7 text-xs"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}
