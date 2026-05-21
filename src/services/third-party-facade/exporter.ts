import puppeteer, { type Browser, type PaperFormat } from "puppeteer";
import { resolvePageSettings } from "@/builder/decider/page-settings";
import type { PlanShell, SectionEntity } from "@/builder/types/entity";

type ExportOptions = {
  /** Absolute origin to render from, e.g. "http://localhost:3000". */
  origin: string;
  planId: string;
  /** PDF paper format (defaults to A4). */
  format?: PaperFormat;
  /** Image-only: viewport width in CSS pixels. */
  viewportWidth?: number;
  /** Restrict export to a single section's BlockTree. */
  sectionId?: string;
  /** Plain title shown in the page header (PDF only). */
  headerTitle?: string;
  /** Whether to render a cover page (PDF/print only). Defaults to true. */
  cover?: boolean;
  /** Whether to render a table of contents page (PDF/print only). Defaults to true. */
  toc?: boolean;
  /**
   * Export-time page numbers override.
   * 우선순위: 이 옵션 > 섹션 override > 플랜 기본값 > 시스템 기본값.
   */
  pageNumbers?: boolean;
  /**
   * Export-time footer text override.
   * 우선순위: 이 옵션 > 섹션 override > 플랜 기본값 > 시스템 기본값.
   */
  footerText?: string;
  /**
   * When set, the print page renders the version snapshot instead of the
   * current plan state. The print page resolves the snapshot server-side.
   */
  versionId?: string;
  /**
   * 플랜 엔티티. pageDefaults를 읽기 위해 사용.
   * 미전달 시 시스템 기본값으로 fall through.
   */
  plan?: Pick<PlanShell, "pageDefaults">;
  /**
   * 섹션 엔티티. pageSettings override를 읽기 위해 사용.
   * 미전달 시 플랜 기본값 → 시스템 기본값으로 fall through.
   */
  section?: Pick<SectionEntity, "pageSettings"> | null;
  /**
   * 워터마크 렌더 모드.
   * "fixed" (기본) — 단일 fixed 오버레이 (PDF 출력용).
   * "tiled"        — 문서 전체 높이에 반복 배치 (PNG fullPage 스크린샷 전용).
   */
  watermarkMode?: "fixed" | "tiled";
};

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    // If launch fails, allow retry on the next call.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

function printUrl(opts: ExportOptions): string {
  const url = new URL(
    `/plan/${encodeURIComponent(opts.planId)}/print`,
    opts.origin,
  );
  if (opts.sectionId) url.searchParams.set("sectionId", opts.sectionId);
  if (opts.cover !== undefined)
    url.searchParams.set("cover", String(opts.cover));
  if (opts.toc !== undefined) url.searchParams.set("toc", String(opts.toc));
  if (opts.pageNumbers !== undefined)
    url.searchParams.set("pageNumbers", String(opts.pageNumbers));
  if (opts.footerText) url.searchParams.set("footerText", opts.footerText);
  if (opts.versionId) url.searchParams.set("versionId", opts.versionId);
  // watermarkMode: 명시된 경우에만 추가 ("fixed"는 기본값이므로 생략해도 동일).
  if (opts.watermarkMode) {
    url.searchParams.set("watermarkMode", opts.watermarkMode);
  }
  return url.toString();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PDF_HEADER_FOOTER_STYLE =
  "font-family: -apple-system, system-ui, sans-serif; font-size: 9px; color: #71717a; padding: 0 16mm; width: 100%; display: flex; justify-content: space-between;";

export async function exportToPdf(opts: ExportOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(printUrl(opts), { waitUntil: "networkidle0" });

    // 페이지 설정 머지: export-time 옵션 > 섹션 override > 플랜 기본값 > 시스템 기본값.
    const resolved = resolvePageSettings(opts.plan ?? {}, opts.section);

    // export-time opts가 명시된 경우 resolved 값을 덮어쓴다.
    const showPageNumbers =
      opts.pageNumbers !== undefined
        ? opts.pageNumbers
        : resolved.showPageNumbers;

    // footerText: export-time opts 우선, 없으면 resolved 값 사용.
    const resolvedFooterText =
      opts.footerText !== undefined ? opts.footerText : resolved.footerText;
    const footerLabel = resolvedFooterText
      ? escapeHtml(resolvedFooterText)
      : "";

    // headerText: export-time headerTitle 우선, 없으면 resolved.headerText, 없으면 planId.
    const headerTextResolved =
      opts.headerTitle ?? resolved.headerText ?? opts.planId;

    const footerTemplate = showPageNumbers
      ? `<div style="${PDF_HEADER_FOOTER_STYLE}"><span>${footerLabel}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
      : resolvedFooterText
        ? `<div style="${PDF_HEADER_FOOTER_STYLE}"><span>${footerLabel}</span><span></span></div>`
        : `<div style="${PDF_HEADER_FOOTER_STYLE}"></div>`;

    const buffer = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: `${resolved.paddingTopMm}mm`,
        bottom: `${resolved.paddingBottomMm}mm`,
        left: `${resolved.paddingLeftMm}mm`,
        right: `${resolved.paddingRightMm}mm`,
      },
      headerTemplate: `<div style="${PDF_HEADER_FOOTER_STYLE}"><span>${escapeHtml(headerTextResolved)}</span><span></span></div>`,
      footerTemplate,
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

// 96dpi 기준: 1mm = 96 / 25.4 px
const MM_TO_PX = 96 / 25.4;

export async function exportToImage(opts: ExportOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: opts.viewportWidth ?? 1024,
      height: 800,
      deviceScaleFactor: 2,
    });

    // PNG는 항상 tiled 워터마크 모드로 캡처한다.
    // fullPage 스크린샷은 단일 비트맵이므로 fixed 오버레이가 첫 viewport만 찍힘.
    const pngOpts: ExportOptions = { ...opts, watermarkMode: "tiled" };
    await page.goto(printUrl(pngOpts), { waitUntil: "networkidle0" });

    // paddingMm → px 변환 후 print-page 루트 컨테이너에 inline padding 주입.
    // Tailwind p-8 / max-w-3xl을 inline style로 덮어쓴다.
    const resolved = resolvePageSettings(opts.plan ?? {}, opts.section);
    await page.evaluate(
      ({ t, r, b, l }) => {
        const root = document.querySelector(
          ".print-page",
        ) as HTMLElement | null;
        if (root) {
          root.style.paddingTop = `${t}px`;
          root.style.paddingRight = `${r}px`;
          root.style.paddingBottom = `${b}px`;
          root.style.paddingLeft = `${l}px`;
          // max-w-3xl이 가로 패딩 효과를 상쇄하지 않도록 제거한다.
          root.style.maxWidth = "none";
        }
      },
      {
        t: resolved.paddingTopMm * MM_TO_PX,
        r: resolved.paddingRightMm * MM_TO_PX,
        b: resolved.paddingBottomMm * MM_TO_PX,
        l: resolved.paddingLeftMm * MM_TO_PX,
      },
    );

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
      omitBackground: false,
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

export async function shutdownExporter(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  if (browser) await browser.close();
}
