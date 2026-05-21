import { describe, expect, it } from "bun:test";
import { resolvePageSettings, SYSTEM_PAGE_DEFAULTS } from "./page-settings";

const EMPTY_PLAN = { pageDefaults: undefined };
const EMPTY_SECTION = { pageSettings: undefined };

describe("resolvePageSettings", () => {
  it("빈 입력 → 시스템 기본값 반환", () => {
    const result = resolvePageSettings(EMPTY_PLAN);
    expect(result).toEqual(SYSTEM_PAGE_DEFAULTS);
  });

  it("섹션 없이 플랜 기본값만 있으면 플랜값 반영", () => {
    const result = resolvePageSettings({
      pageDefaults: { paddingTopMm: 30, showPageNumbers: true },
    });
    expect(result.paddingTopMm).toBe(30);
    expect(result.showPageNumbers).toBe(true);
    // 플랜에 없는 키는 시스템 기본값
    expect(result.paddingRightMm).toBe(SYSTEM_PAGE_DEFAULTS.paddingRightMm);
  });

  it("섹션 override가 플랜 기본값보다 우선", () => {
    const result = resolvePageSettings(
      { pageDefaults: { paddingTopMm: 30 } },
      { pageSettings: { paddingTopMm: 50 } },
    );
    expect(result.paddingTopMm).toBe(50);
  });

  it("섹션 override에 없는 키는 플랜 기본값으로 fall through", () => {
    const result = resolvePageSettings(
      { pageDefaults: { paddingTopMm: 30, footerText: "confidential" } },
      { pageSettings: { paddingTopMm: 50 } },
    );
    // paddingTopMm은 섹션 값
    expect(result.paddingTopMm).toBe(50);
    // footerText는 플랜 기본값
    expect(result.footerText).toBe("confidential");
    // paddingRightMm은 시스템 기본값
    expect(result.paddingRightMm).toBe(SYSTEM_PAGE_DEFAULTS.paddingRightMm);
  });

  it("undefined 키는 다음 층으로 fall through (모든 키 체인)", () => {
    const result = resolvePageSettings(
      { pageDefaults: { watermarkText: "DRAFT", watermarkOpacity: 0.5 } },
      { pageSettings: { watermarkText: undefined } },
    );
    // 섹션에 undefined → 플랜 기본값으로 fall through
    expect(result.watermarkText).toBe("DRAFT");
    expect(result.watermarkOpacity).toBe(0.5);
  });

  it("반환값은 항상 모든 키가 채워진 완전한 PageSettings", () => {
    const result = resolvePageSettings(EMPTY_PLAN, EMPTY_SECTION);
    const requiredKeys: (keyof typeof SYSTEM_PAGE_DEFAULTS)[] = [
      "paddingTopMm",
      "paddingRightMm",
      "paddingBottomMm",
      "paddingLeftMm",
      "headerText",
      "footerText",
      "showPageNumbers",
      "watermarkText",
      "watermarkOpacity",
      "watermarkAngleDeg",
    ];
    for (const key of requiredKeys) {
      expect(result[key]).not.toBeUndefined();
    }
  });

  it("워터마크 각도 음수 허용", () => {
    const result = resolvePageSettings({
      pageDefaults: { watermarkAngleDeg: -45 },
    });
    expect(result.watermarkAngleDeg).toBe(-45);
  });
});
