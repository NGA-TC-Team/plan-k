// Token grammar:
//   [[<prefix>:<rest>]]   → embed
//   @<prefix>:<rest>      → mention
//
// `prefix` is one of the entity-id prefixes used across the project so
// random `@words` and emails don't get parsed as references. `rest`
// allows a-z 0-9, dash and underscore — matches defaultIdFactory output.

export type RefKind = "mention" | "embed" | "depends-on" | "trace";

export type ExtractedRef = {
  kind: RefKind;
  dstId: string;
};

const ID_PREFIX = "(?:block|section|screen|persona|decision|agent)";
const ID_REST = "[A-Za-z0-9_-]+";
const EMBED_RE = new RegExp(`\\[\\[(${ID_PREFIX}:${ID_REST})\\]\\]`, "g");
const MENTION_RE = new RegExp(
  `(?<![A-Za-z0-9_])@(${ID_PREFIX}:${ID_REST})`,
  "g",
);

// Walks an arbitrary block.data shape and concatenates every string leaf.
// Numbers/booleans/null are ignored. Cycles are unreachable in practice
// (data comes from JSON.parse), but the WeakSet guard would only matter
// for cyclic objects so we skip it.
export function collectStrings(value: unknown): string[] {
  const out: string[] = [];
  walk(value, out);
  return out;
}

function walk(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walk(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) walk(v, out);
  }
}

// Returns a deduplicated set of refs ordered by first appearance. Same
// (kind, dstId) pair never appears twice — set-diff against DB stays
// O(n) without hashing tricks.
export function extractRefs(value: unknown): ExtractedRef[] {
  const seen = new Set<string>();
  const out: ExtractedRef[] = [];
  for (const text of collectStrings(value)) {
    pushMatches(text, EMBED_RE, "embed", seen, out);
    pushMatches(text, MENTION_RE, "mention", seen, out);
  }
  return out;
}

function pushMatches(
  text: string,
  re: RegExp,
  kind: RefKind,
  seen: Set<string>,
  out: ExtractedRef[],
): void {
  re.lastIndex = 0;
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    const dstId = m[1];
    const key = `${kind}::${dstId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, dstId });
  }
}

export function refRowId(srcId: string, kind: RefKind, dstId: string): string {
  return `${srcId}::${kind}::${dstId}`;
}
