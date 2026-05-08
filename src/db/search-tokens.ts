// Pure helpers for the FTS5 index. Kept free of DB imports so unit
// tests can run under bun (which doesn't load better-sqlite3 natively
// — the DB layer only exists in the Next.js node runtime).

const HANGUL = /[가-힯]/;

// Bigram a Korean run: 넥스트 → 넥스 스트. Latin/digit/punct stays
// untouched so English search keeps unicode61's word boundaries. The
// output is original-content + a space + bigram tokens, so a query for
// either form hits the same row.
export function bigramKorean(text: string): string {
  if (!text) return "";
  if (!HANGUL.test(text)) return text;
  const bigrams: string[] = [];
  let run = "";
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i] ?? "";
    if (ch && HANGUL.test(ch)) {
      run += ch;
    } else {
      if (run.length >= 2) {
        for (let j = 0; j < run.length - 1; j++) {
          bigrams.push(run.slice(j, j + 2));
        }
      } else if (run.length === 1) {
        bigrams.push(run);
      }
      run = "";
    }
  }
  return bigrams.length > 0 ? `${text} ${bigrams.join(" ")}` : text;
}

// Build a MATCH expression from raw user input. Each whitespace-split
// piece runs through the bigram pass; resulting tokens are double-quoted
// so user-supplied operators (^*-) can't escape into FTS5 syntax.
export function buildMatchExpr(rawQuery: string): string {
  const tokens: string[] = [];
  for (const piece of rawQuery.split(/\s+/)) {
    if (!piece) continue;
    const expanded = bigramKorean(piece).trim();
    if (!expanded) continue;
    for (const token of expanded.split(/\s+/)) {
      if (!token) continue;
      tokens.push(quoteFtsToken(token));
    }
  }
  return tokens.join(" ");
}

function quoteFtsToken(token: string): string {
  return `"${token.replace(/"/g, '""')}"`;
}
