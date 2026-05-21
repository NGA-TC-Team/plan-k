import type { PageSettings, PlanShell, SectionEntity } from "../types/entity";

/**
 * 시스템 기본값.
 * 모든 키가 정의돼 있어야 resolvePageSettings의 반환이 완전한 PageSettings가 된다.
 */
export const SYSTEM_PAGE_DEFAULTS: Required<PageSettings> = {
  paddingTopMm: 20,
  paddingRightMm: 16,
  paddingBottomMm: 16,
  paddingLeftMm: 16,
  headerText: "",
  footerText: "",
  showPageNumbers: false,
  watermarkText: "",
  watermarkOpacity: 0.1,
  watermarkAngleDeg: -30,
};

/**
 * 세 층의 우선순위로 PageSettings를 머지한다.
 *
 * 우선순위 (높음 → 낮음):
 *   1. section.pageSettings
 *   2. plan.pageDefaults
 *   3. SYSTEM_PAGE_DEFAULTS
 *
 * 각 키에 대해 undefined가 아닌 첫 번째 값이 채택된다.
 * 반환값은 항상 모든 키가 채워진 완전한 PageSettings다.
 */
export function resolvePageSettings(
  plan: Pick<PlanShell, "pageDefaults">,
  section?: Pick<SectionEntity, "pageSettings"> | null,
): Required<PageSettings> {
  const sectionOverride = section?.pageSettings ?? {};
  const planDefaults = plan.pageDefaults ?? {};

  return {
    paddingTopMm:
      sectionOverride.paddingTopMm ??
      planDefaults.paddingTopMm ??
      SYSTEM_PAGE_DEFAULTS.paddingTopMm,
    paddingRightMm:
      sectionOverride.paddingRightMm ??
      planDefaults.paddingRightMm ??
      SYSTEM_PAGE_DEFAULTS.paddingRightMm,
    paddingBottomMm:
      sectionOverride.paddingBottomMm ??
      planDefaults.paddingBottomMm ??
      SYSTEM_PAGE_DEFAULTS.paddingBottomMm,
    paddingLeftMm:
      sectionOverride.paddingLeftMm ??
      planDefaults.paddingLeftMm ??
      SYSTEM_PAGE_DEFAULTS.paddingLeftMm,
    headerText:
      sectionOverride.headerText ??
      planDefaults.headerText ??
      SYSTEM_PAGE_DEFAULTS.headerText,
    footerText:
      sectionOverride.footerText ??
      planDefaults.footerText ??
      SYSTEM_PAGE_DEFAULTS.footerText,
    showPageNumbers:
      sectionOverride.showPageNumbers ??
      planDefaults.showPageNumbers ??
      SYSTEM_PAGE_DEFAULTS.showPageNumbers,
    watermarkText:
      sectionOverride.watermarkText ??
      planDefaults.watermarkText ??
      SYSTEM_PAGE_DEFAULTS.watermarkText,
    watermarkOpacity:
      sectionOverride.watermarkOpacity ??
      planDefaults.watermarkOpacity ??
      SYSTEM_PAGE_DEFAULTS.watermarkOpacity,
    watermarkAngleDeg:
      sectionOverride.watermarkAngleDeg ??
      planDefaults.watermarkAngleDeg ??
      SYSTEM_PAGE_DEFAULTS.watermarkAngleDeg,
  };
}
