/**
 * KaTeX facade — single import point for the katex package.
 *
 * All callers import `renderTexToHtml` from here; no file outside this
 * module should import "katex" directly.
 */
import katex from "katex";

/**
 * Render a TeX string to a trusted KaTeX HTML string.
 *
 * - `throwOnError: false` — invalid TeX produces a red error span instead
 *   of throwing. Callers never need to catch.
 * - `output: "html"` — produces the minimal HTML tree (no MathML) for
 *   lighter DOM in this context.
 */
export function renderTexToHtml(
  tex: string,
  opts: { displayMode?: boolean } = {},
): string {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode: opts.displayMode ?? false,
    output: "html",
  });
}
