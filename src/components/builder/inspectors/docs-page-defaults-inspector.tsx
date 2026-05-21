"use client";

import { FileText } from "lucide-react";
import { SYSTEM_PAGE_DEFAULTS } from "@/builder/decider/page-settings";
import type { PageSettings } from "@/builder/types/entity";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { PageMarginBox } from "./page-margin-box";

/**
 * Docs 탭 유휴 상태(블록 미선택)에서 인스펙터 패널에 표시되는
 * 플랜 전역 페이지 기본값 폼.
 *
 * 디스패치: UPDATE_PLAN_PAGE_DEFAULTS { planId, patch }
 * - 빈 문자열 입력은 undefined와 동치로 처리해 시스템 기본값으로 fall through.
 */
export function DocsPageDefaultsInspector() {
  const dispatch = useBuilderDispatch();

  // PlanShell을 통해 현재 planId와 pageDefaults를 읽는다.
  const planId = useBuilderState((s) => {
    const ids = Object.keys(s.state.plans);
    return ids[0] ?? null;
  });
  const pageDefaults = useBuilderState((s) => {
    if (!planId) return undefined;
    return s.state.plans[planId]?.pageDefaults;
  });

  if (!planId) return null;

  /** 개별 필드 patch 디스패치 핼퍼 */
  function patch(p: Partial<PageSettings>) {
    dispatch({
      type: "UPDATE_PLAN_PAGE_DEFAULTS",
      planId: planId as string,
      patch: p,
    });
  }

  const pd = pageDefaults ?? {};

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-5">
      <div className="divide-y divide-hairline [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {/* 헤더 */}
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-caption">
              <FileText className="size-3" />
              <span>페이지 기본값</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            이 플랜의 모든 섹션에 적용되는 기본 페이지 설정입니다. 섹션
            인스펙터에서 섹션별로 재정의할 수 있습니다.
          </p>
        </header>

        {/* 여백 — A4 기준 4면 */}
        <section className="space-y-3">
          <h2 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
            여백 (mm) · A4
          </h2>
          <PageMarginBox
            top={pd.paddingTopMm}
            right={pd.paddingRightMm}
            bottom={pd.paddingBottomMm}
            left={pd.paddingLeftMm}
            defaults={{
              top: SYSTEM_PAGE_DEFAULTS.paddingTopMm,
              right: SYSTEM_PAGE_DEFAULTS.paddingRightMm,
              bottom: SYSTEM_PAGE_DEFAULTS.paddingBottomMm,
              left: SYSTEM_PAGE_DEFAULTS.paddingLeftMm,
            }}
            onChange={(side, value) => {
              if (side === "top") patch({ paddingTopMm: value });
              else if (side === "right") patch({ paddingRightMm: value });
              else if (side === "bottom") patch({ paddingBottomMm: value });
              else patch({ paddingLeftMm: value });
            }}
          />
        </section>

        {/* 머리말 / 꼬리말 */}
        <section className="space-y-3">
          <h2 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
            머리말 / 꼬리말
          </h2>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-caption text-muted-foreground">
                머리말
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="머리말 텍스트"
                value={pd.headerText ?? ""}
                onChange={(e) =>
                  patch({ headerText: e.target.value || undefined })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-caption text-muted-foreground">
                꼬리말
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="꼬리말 텍스트"
                value={pd.footerText ?? ""}
                onChange={(e) =>
                  patch({ footerText: e.target.value || undefined })
                }
              />
            </div>
          </div>
        </section>

        {/* 쪽수 */}
        <section className="space-y-3">
          <h2 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
            쪽 번호
          </h2>
          <div className="flex items-center justify-between">
            <Label className="text-xs">쪽 번호 표시</Label>
            <Switch
              checked={
                pd.showPageNumbers ?? SYSTEM_PAGE_DEFAULTS.showPageNumbers
              }
              onCheckedChange={(checked) => patch({ showPageNumbers: checked })}
            />
          </div>
        </section>

        {/* 워터마크 */}
        <section className="space-y-3">
          <h2 className="text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
            워터마크
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-caption text-muted-foreground">
                텍스트
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="예: CONFIDENTIAL"
                value={pd.watermarkText ?? ""}
                onChange={(e) =>
                  patch({ watermarkText: e.target.value || undefined })
                }
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-caption text-muted-foreground">
                  투명도
                </Label>
                <span className="text-caption tabular-nums text-muted-foreground">
                  {Math.round(
                    (pd.watermarkOpacity ??
                      SYSTEM_PAGE_DEFAULTS.watermarkOpacity) * 100,
                  )}
                  %
                </span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[
                  pd.watermarkOpacity ?? SYSTEM_PAGE_DEFAULTS.watermarkOpacity,
                ]}
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  if (typeof val === "number") patch({ watermarkOpacity: val });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-caption text-muted-foreground">
                  각도 (°)
                </Label>
                <span className="text-caption tabular-nums text-muted-foreground">
                  {pd.watermarkAngleDeg ??
                    SYSTEM_PAGE_DEFAULTS.watermarkAngleDeg}
                  °
                </span>
              </div>
              <Slider
                min={-180}
                max={180}
                step={1}
                value={[
                  pd.watermarkAngleDeg ??
                    SYSTEM_PAGE_DEFAULTS.watermarkAngleDeg,
                ]}
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  if (typeof val === "number")
                    patch({ watermarkAngleDeg: val });
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
