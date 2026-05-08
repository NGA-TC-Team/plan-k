import type { BundledLanguage, Highlighter } from "shiki";

/**
 * Project-shaped facade over Shiki — the rest of the app should never import
 * `shiki` directly. We lazy-create one shared highlighter, preload the small
 * set of languages we ship in docs blocks, and expose a single
 * `highlightToHtml()` entry point.
 *
 * The facade keeps the concrete library swappable (e.g. swapping to Starry
 * Night or a server-rendered Shiki later only touches this file).
 */

const PRELOADED_LANGS: BundledLanguage[] = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "http",
  "shellscript",
  "markdown",
  "sql",
  "python",
  "go",
  "rust",
  "yaml",
  "html",
  "css",
];

const LANG_ALIASES: Record<string, BundledLanguage> = {
  typescript: "ts",
  javascript: "js",
  shell: "shellscript",
  bash: "shellscript",
  sh: "shellscript",
  md: "markdown",
  py: "python",
  rs: "rust",
  yml: "yaml",
};

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        themes: ["github-light"],
        langs: PRELOADED_LANGS,
      }),
    );
  }
  return highlighterPromise;
}

function resolveLang(lang: string): BundledLanguage | "text" {
  const lower = (lang || "").toLowerCase();
  if (!lower) return "text";
  const alias = LANG_ALIASES[lower];
  if (alias) return alias;
  if ((PRELOADED_LANGS as string[]).includes(lower)) {
    return lower as BundledLanguage;
  }
  return "text";
}

/**
 * Render `code` to highlighted HTML. Returns plain `<pre>` HTML if the
 * highlighter or language isn't available — callers can use the result with
 * `dangerouslySetInnerHTML` either way.
 */
export async function highlightToHtml(
  code: string,
  lang: string,
): Promise<string> {
  const resolved = resolveLang(lang);
  if (resolved === "text") return escapePre(code);
  try {
    const hl = await getHighlighter();
    return hl.codeToHtml(code, { lang: resolved, theme: "github-light" });
  } catch {
    return escapePre(code);
  }
}

function escapePre(code: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre class="shiki"><code>${escaped}</code></pre>`;
}
