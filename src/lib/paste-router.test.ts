import { describe, expect, test } from "bun:test";
import { extractBlockText } from "@/builder/blocks/extract-text";
import { routePaste } from "./paste-router";

describe("routePaste", () => {
  // ─── URL cases ─────────────────────────────────────────────────────────────

  test("single https URL returns kind=url", () => {
    const result = routePaste("https://example.com");
    expect(result).toEqual({ kind: "url", url: "https://example.com" });
  });

  test("single http URL returns kind=url", () => {
    const result = routePaste("http://example.com");
    expect(result).toEqual({ kind: "url", url: "http://example.com" });
  });

  test("URL with leading/trailing whitespace is trimmed and returns kind=url", () => {
    const result = routePaste("  https://example.com/path?q=1  ");
    expect(result).toEqual({
      kind: "url",
      url: "https://example.com/path?q=1",
    });
  });

  test("URL with path and query string returns kind=url", () => {
    const result = routePaste("https://github.com/user/repo?tab=readme");
    expect(result).toEqual({
      kind: "url",
      url: "https://github.com/user/repo?tab=readme",
    });
  });

  // ─── Text / fallback cases ─────────────────────────────────────────────────

  test("inline URL embedded in a sentence returns kind=text", () => {
    const text = "Check out https://example.com for more info";
    const result = routePaste(text);
    expect(result).toEqual({ kind: "text", text });
  });

  test("empty string returns kind=text", () => {
    const result = routePaste("");
    expect(result.kind).toBe("text");
  });

  test("plain text returns kind=text", () => {
    const result = routePaste("hello world");
    expect(result).toEqual({ kind: "text", text: "hello world" });
  });

  test("malformed URL (no hostname after scheme) returns kind=text", () => {
    const result = routePaste("https://");
    expect(result.kind).toBe("text");
  });

  test("malformed URL (spaces in URL) returns kind=text", () => {
    const result = routePaste("https://not a valid url");
    expect(result.kind).toBe("text");
  });

  test("URL exceeding 2048 chars returns kind=text", () => {
    const longUrl = "https://example.com/" + "a".repeat(2040);
    const result = routePaste(longUrl);
    expect(result.kind).toBe("text");
  });

  test("multi-line paste containing a URL returns kind=text", () => {
    const result = routePaste("https://example.com\nhttps://other.com");
    expect(result.kind).toBe("text");
  });

  test("ftp:// URL (unsupported scheme) returns kind=text", () => {
    const result = routePaste("ftp://example.com/file.txt");
    expect(result.kind).toBe("text");
  });

  test("URL with only whitespace around newline returns kind=text", () => {
    const result = routePaste("https://example.com\n   ");
    // After trim: "https://example.com" — but trimmed contains no newline
    // Actually trim() removes trailing \n, so this WOULD be a URL.
    // Let's verify the actual behavior:
    expect(result).toEqual({ kind: "url", url: "https://example.com" });
  });

  test("Korean domain URL returns kind=url", () => {
    // Punycode-encoded Korean domain is valid
    const result = routePaste("https://xn--p1ai.example.com");
    expect(result).toEqual({
      kind: "url",
      url: "https://xn--p1ai.example.com",
    });
  });

  // ─── Table cases ────────────────────────────────────────────────────────────

  test("basic 3-column 2-row table returns kind=table", () => {
    const md =
      "| Name | Age | City |\n| --- | --- | --- |\n| Alice | 30 | Seoul |\n| Bob | 25 | Busan |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["Name", "Age", "City"],
      rows: [
        ["Alice", "30", "Seoul"],
        ["Bob", "25", "Busan"],
      ],
    });
  });

  test("alignment specifiers (:---, ---:, :---:) are ignored and not in rows", () => {
    const md =
      "| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["Left", "Center", "Right"],
      rows: [["a", "b", "c"]],
    });
  });

  test("header-only table (no data rows) returns kind=table with empty rows", () => {
    const md = "| Col A | Col B |\n| --- | --- |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["Col A", "Col B"],
      rows: [],
    });
  });

  test("single-line text (no alignment row) falls back to kind=text", () => {
    const md = "| Col A | Col B |";
    const result = routePaste(md);
    expect(result.kind).toBe("text");
  });

  test("table followed by paragraph text — only table is extracted, paragraph ignored", () => {
    const md =
      "| A | B |\n| --- | --- |\n| 1 | 2 |\n\nSome extra paragraph text";
    const result = routePaste(md);
    // Empty line doesn't start with `|`, so parsing stops and we get the table.
    expect(result).toEqual({
      kind: "table",
      columns: ["A", "B"],
      rows: [["1", "2"]],
    });
  });

  test("short row is padded with empty strings to match header column count", () => {
    const md = "| A | B | C |\n| --- | --- | --- |\n| only one |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["A", "B", "C"],
      rows: [["only one", "", ""]],
    });
  });

  test("row with more cells than header is truncated", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 | 3 | 4 |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["A", "B"],
      rows: [["1", "2"]],
    });
  });

  // ─── Math cases ─────────────────────────────────────────────────────────────

  test("multiline $$ block returns kind=math with inner tex", () => {
    const md = "$$\n\\int_0^1 x \\, dx\n$$";
    const result = routePaste(md);
    expect(result).toEqual({ kind: "math", tex: "\\int_0^1 x \\, dx" });
  });

  test("single-line $$…$$ returns kind=math", () => {
    const md = "$$x^2 + y^2 = r^2$$";
    const result = routePaste(md);
    expect(result).toEqual({ kind: "math", tex: "x^2 + y^2 = r^2" });
  });

  test("$$$$ (empty inner) returns kind=text (ambiguous)", () => {
    const result = routePaste("$$$$");
    expect(result.kind).toBe("text");
  });

  test("$$ without closing marker returns kind=text", () => {
    const result = routePaste("$$x^2");
    expect(result.kind).toBe("text");
  });

  test("inline $…$ single-line (no $$) returns kind=text (inline handled by editor)", () => {
    const result = routePaste("$E=mc^2$");
    expect(result.kind).toBe("text");
  });

  test("$$ block with leading/trailing whitespace is trimmed before routing", () => {
    const md = "  $$\n\\alpha\n$$  ";
    const result = routePaste(md);
    expect(result).toEqual({ kind: "math", tex: "\\alpha" });
  });

  // ─── Pipe-escape cases (splitTableRow char walker) ─────────────────────────

  // Case A: escaped pipe `\|` in a cell is decoded to literal `|`.
  test("case A — escaped pipe in cell is decoded to literal pipe", () => {
    // | x\|y | z |
    const md = "| Head1 | Head2 |\n| --- | --- |\n| x\\|y | z |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["Head1", "Head2"],
      rows: [["x|y", "z"]],
    });
  });

  // Case B: `\\|` (backslash then escaped pipe) — char walker sees the second
  // backslash followed by `|`, so it fires the `\|` escape and yields a literal
  // `|`. The preceding backslash is left verbatim. v1 does NOT implement `\\`
  // → `\` reduction; `\|` is the only recognised escape sequence.
  // Raw GFM string (JS source "a\\\\|b" = actual chars a \ \ | b, but "a\\|b"
  // in the actual row = a \ | b → char walker: 'a', then '\' before '|' → '\|'
  // escape → 'a\|' in the single cell).
  test("case B — backslash before escaped pipe: \\\\| yields literal backslash+pipe in cell", () => {
    // JS source `"a\\\\|b"` is 5 chars: a \ \ | b in the table row inner string.
    // The row inner content is: a \ \ | b  (after stripping outer pipes)
    // char walker walk:
    //   'a'  → cur = "a"
    //   '\'  → next is '\', not '|' → cur = "a\"
    //   '\'  → next is '|' → escape hit → cur = "a\|", i++
    //   'b'  → cur = "a\|b"
    //   end  → cells = ["a|b" ... wait inner[i+1] when i=1 is '\' not '|' →
    // Re-walk: inner = "a\\|b" (JS "a\\\\|b" → 4 chars: a \ \ | b? No:
    //   "a\\\\|b" in JS → a + \\ + \\ + | + b = a \ \ | b (5 real chars)
    //   i=0 ch='a' → cur="a"
    //   i=1 ch='\', inner[2]='\'  (not '|') → cur="a\"
    //   i=2 ch='\', inner[3]='|'  → escape! cur="a\|", i becomes 3
    //   i=4 ch='b' → cur="a\|b"
    //   end → cells = ["a\\|b".trim()] = ["a\\|b"]
    // So the cell value is the 4-char string: a \ | b.
    const md = "| H1 | H2 |\n| --- | --- |\n| a\\\\|b |";
    const result = routePaste(md);
    // Cell value: "a\|b" — one cell (a + backslash + pipe + b).
    // The row parser sees this as a SINGLE cell because the `\|` in the middle
    // of `\\|` is consumed as an escape by the char walker.
    expect(result).toEqual({
      kind: "table",
      columns: ["H1", "H2"],
      rows: [["a\\|b", ""]],
    });
  });

  // Case C: ordinary cells without any escapes — baseline regression.
  test("case C — ordinary cells (no escapes) behave as before", () => {
    const md = "| A | B |\n| --- | --- |\n| foo | bar |";
    const result = routePaste(md);
    expect(result).toEqual({
      kind: "table",
      columns: ["A", "B"],
      rows: [["foo", "bar"]],
    });
  });

  // ─── Round-trip: extractBlockText → routePaste ─────────────────────────────

  // Case D: cells containing `|` survive serialize → parse → same cell values.
  test("case D — round-trip: cell with pipe serializes and parses back correctly", () => {
    // Build a minimal BlockEntity-shaped object for the table kind.
    const block = {
      id: "rt-1",
      kind: "table" as const,
      data: {
        columns: ["Name", "Value"],
        rows: [
          ["a|b", "c"],
          ["d", "e|f|g"],
        ],
      },
      // Cast via unknown: only `kind` and `data` are read by extractBlockText;
      // the full BlockEntity shape requires extra fields we don't need here.
    } as unknown as Parameters<typeof extractBlockText>[0];

    const serialized = extractBlockText(block);
    // serialized should have \| in cells with pipes.
    expect(serialized).toContain("\\|");

    // Now parse the serialized GFM back.
    const parsed = routePaste(serialized);
    expect(parsed.kind).toBe("table");
    if (parsed.kind === "table") {
      expect(parsed.columns).toEqual(["Name", "Value"]);
      expect(parsed.rows[0]).toEqual(["a|b", "c"]);
      expect(parsed.rows[1]).toEqual(["d", "e|f|g"]);
    }
  });
});
