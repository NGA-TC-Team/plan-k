import puppeteer, { type Browser, type PaperFormat } from "puppeteer";

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
    const headerText = opts.headerTitle ?? opts.planId;
    const buffer = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "20mm", bottom: "16mm", left: "16mm", right: "16mm" },
      headerTemplate: `<div style="${PDF_HEADER_FOOTER_STYLE}"><span>${escapeHtml(headerText)}</span><span></span></div>`,
      footerTemplate: `<div style="${PDF_HEADER_FOOTER_STYLE}"><span></span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

export async function exportToImage(opts: ExportOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: opts.viewportWidth ?? 1024,
      height: 800,
      deviceScaleFactor: 2,
    });
    await page.goto(printUrl(opts), { waitUntil: "networkidle0" });
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
